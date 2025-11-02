const axios = require('axios');
const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// FUNCIÓN 1: El Intérprete (extrae comandos en formato JSON)
exports.interpretMessage = async (message) => {
  const prompt = `
        Tu trabajo es analizar un mensaje y clasificarlo en una intención. Responde SIEMPRE con un objeto JSON.

        Las intenciones posibles son:
        "greeting", "list_folders", "view_folder", "create_folder", "edit_folder", "delete_folder",
        "upload_file", "send_file", "send_latest_file", "get_summary", "generate_pdf",
        "confirm_save_yes", "confirm_save_no", "set_reminder", "schedule_file_send",
        "clarification_needed", "unknown".

        REGLAS CRÍTICAS:
        1. Al extraer nombres en "entity", "parent_entity" o "new_entity", sé EXTREMADAMENTE LITERAL. No simplifiques "Base de datos II" a "Base de datos".
        2. Para "upload_file", la "entity" es SIEMPRE el nombre de la carpeta destino.
        3. Para "generate_pdf", extrae el tema de la consulta en "entity".
        4. Para "confirm_save_yes", si se menciona una carpeta, extráela en "entity".
        5. Para "set_reminder":
           - "entity": La descripción de la actividad.
           - "time": La hora o período de tiempo (ej: "en 2 horas", "mañana a las 9 am").
        6. Para "schedule_file_send":
           - "entity": El nombre del archivo a enviar.
           - "contact": El nombre o número del contacto.
           - "time": La hora o período de tiempo.
           - "message": Un mensaje adicional (opcional).
        7. Si una acción necesita un nombre y no está claro, usa "clarification_needed".

        ### Ejemplos ###
        - Usuario: "hola" -> {"intent": "greeting"}
        - Usuario: "muéstrame mis carpetas" -> {"intent": "list_folders"}
        - Usuario: "qué hay dentro de la carpeta Base de datos II" -> {"intent": "view_folder", "entity": "Base de datos II"}
        - Usuario: "crea la carpeta 'Impuestos 2025' dentro de 'Facturas'" -> {"intent": "create_folder", "entity": "Impuestos 2025", "parent_entity": "Facturas"}
        - Usuario: "renombra 'mate' a 'matemáticas'" -> {"intent": "edit_folder", "entity": "mate", "new_entity": "matemáticas"}
        - Usuario: "sube esto en la carpeta deberes" -> {"intent": "upload_file", "entity": "deberes"}
        - Usuario: "pásame el primer archivo" -> {"intent": "send_latest_file"}
        - Usuario: "pásame el archivo" -> {"intent": "clarification_needed"}
        - Usuario: "haz un resumen de la segunda guerra mundial en pdf" -> {"intent": "generate_pdf", "entity": "la segunda guerra mundial"}
        - Usuario: "recuérdame hacer la compra en 30 minutos" -> {"intent": "set_reminder", "entity": "hacer la compra", "time": "en 30 minutos"}
        - Usuario: "envíale el reporte a Juan en 5 minutos con el mensaje 'Ahí te va'" -> {"intent": "schedule_file_send", "entity": "reporte", "contact": "Juan", "time": "en 5 minutos", "message": "Ahí te va"}

        Analiza: "${message}"
    `;

  try {
    const response = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.0,
      },
      {
        headers: {
          Authorization: `Bearer ${AI21_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const rawResponse = response.data?.choices?.[0]?.message?.content?.trim();
    const jsonMatch = rawResponse.match(/{[\s\S]*}/);
    const cleanedJsonString = jsonMatch ? jsonMatch[0] : rawResponse;

    try {
      return JSON.parse(cleanedJsonString);
    } catch {
      return { intent: 'unknown' };
    }
  } catch {
    return { intent: 'error' };
  }
};

// FUNCIÓN 2: El Conversador (Corregido para aceptar string O array)
exports.generateConversationalResponse = async (historyOrMessage, userName, userData) => {
  const systemInstruction = `
        Eres "Gestor IA", un asistente de IA conversacional y amable. El nombre del usuario es ${userName}.
        Tu trabajo es responder a la conversación y ayudar al usuario a gestionar sus tareas y archivos.
        
        Si el usuario pregunta sobre archivos o carpetas, usa la siguiente lista de datos para responder. Si la lista está vacía, menciónalo.
        
        DATOS DEL USUARIO:
        Carpetas: ${userData.folders.map(f => f.nombre).join(', ') || 'ninguna'}.
        Archivos Recientes: ${userData.files.slice(0, 5).map(f => `${f.nombre_original} (Estado: ${f.status || 'pending'})`).join('; ') || 'ninguno'}.
        
        MANTÉN LA CONVERSACIÓN: Usa el historial anterior para contextualizar tu respuesta y ofrecer ayuda.
    `;

  let messagesForApi;

  if (Array.isArray(historyOrMessage)) {
    // Es un array (viene del Dashboard chat)
    messagesForApi = historyOrMessage.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
  } else {
    // Es un string (viene de WhatsApp)
    messagesForApi = [{ role: 'user', content: historyOrMessage }];
  }

  messagesForApi.unshift({ role: 'system', content: systemInstruction });

  try {
    const response = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: messagesForApi,
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${AI21_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return (
      response.data?.choices?.[0]?.message?.content?.trim() ||
      'Lo siento, tuve un problema para generar una respuesta coherente.'
    );
  } catch (error) {
    console.error(
      'Error en generateConversationalResponse:',
      error.response?.data?.detail || error.message
    );
    return 'Tuve un problema para conectarme con mi cerebro de IA. Inténtalo de nuevo.';
  }
};

// --- FUNCIÓN PARA BUSCAR IMÁGENES ---
async function fetchRelevantImage(topic) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('No se ha configurado la API Key de Unsplash.');
    return null;
  }
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query: topic, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    return response.data.results[0]?.urls?.regular || null;
  } catch (error) {
    console.error('Error al buscar imagen en Unsplash:', error.message);
    return null;
  }
}

// FUNCIÓN 3: Generador de Contenido para PDF (Versión Simple Restaurada)
exports.generatePdfContent = async (topic, userName) => {
  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // 1. Buscar la imagen de portada
  const imageUrl = await fetchRelevantImage(topic);

  // 2. Generar el texto del contenido
  const contentPrompt = `
        Escribe un informe conciso (aproximadamente 400-500 palabras) sobre "${topic}". 
        Usa un tono educativo y fácil de entender. 
        Incluye una breve introducción, 2 o 3 secciones principales y una conclusión.
        Responde únicamente con el texto del informe, sin incluir el título.
    `;

  try {
    const textResponse = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: contentPrompt }],
        max_tokens: 1000,
        temperature: 0.6,
      },
      {
        headers: {
          Authorization: `Bearer ${AI21_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const textContent = textResponse.data?.choices?.[0]?.message?.content?.trim();

    // 3. Devolver el objeto compatible
    return {
      textContent,
      imageUrl, // La imagen de portada
      userName,
      today,
      topic, // Devolvemos el 'topic' para que los controladores lo usen como título
      structure: { titulo: topic }, // Mantenemos 'structure' por compatibilidad
    };
  } catch (error) {
    console.error('Error al generar contenido para PDF:', error);
    return null;
  }
};

// --- FUNCIÓN NUEVA PARA EL CHAT PÚBLICO ---
exports.generatePublicResponse = async (message) => {
  const prompt = `
        Eres "Gestor IA", un asistente de IA en la página de inicio de una aplicación.
        Tu trabajo es responder preguntas sobre qué hace la aplicación.
        La aplicación es un gestor de archivos y tareas que se integra con WhatsApp.

        Funcionalidades:
        - Subir y organizar archivos (PDFs, imágenes, etc.) en carpetas y subcarpetas.
        - Interactuar con un bot de WhatsApp para crear carpetas, subir archivos y pedir resúmenes.
        - Generar PDFs sobre cualquier tema usando IA.
        - Transcribir audios de WhatsApp a texto.

        Sé amable, conciso y responde solo a preguntas sobre la aplicación. 
        Si te preguntan algo no relacionado, di amablemente que solo puedes hablar sobre el Gestor de Tareas.

        Usuario: "${message}"
        Respuesta:
    `;

  try {
    const response = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [
          { role: 'system', content: 'Eres un asistente de IA en una página de inicio.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.5,
      },
      {
        headers: {
          Authorization: `Bearer ${AI21_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return (
      response.data?.choices?.[0]?.message?.content?.trim() ||
      'Lo siento, no entendí la pregunta.'
    );
  } catch (error) {
    console.error('Error en el chat público de IA:', error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};
