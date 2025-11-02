const axios = require('axios');
const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ===========================
 * FUNCIÓN 1: El Intérprete
 * =========================== */
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

    let rawResponse = response.data?.choices?.[0]?.message?.content?.trim() || '';

    // Quitar cercas de código si vienen
    if (rawResponse.startsWith('```')) {
      rawResponse = rawResponse.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }

    // Intentar extraer el primer objeto JSON
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

/* ==============================================
 * FUNCIÓN 2: El Conversador (string o array)
 * ============================================== */
exports.generateConversationalResponse = async (historyOrMessage, userName, userData) => {
  const foldersList = Array.isArray(userData?.folders)
    ? userData.folders.map((f) => f?.nombre).filter(Boolean).join(', ')
    : 'ninguna';

  const filesList = Array.isArray(userData?.files)
    ? userData.files
        .slice(0, 5)
        .map((f) => `${f?.nombre_original} (Estado: ${f?.status || 'pending'})`)
        .join('; ')
    : 'ninguno';

  const systemInstruction = `
Eres "Gestor IA", un asistente de IA conversacional y amable. El nombre del usuario es ${userName}.
Tu trabajo es responder a la conversación y ayudar al usuario a gestionar sus tareas y archivos.

Si el usuario pregunta sobre archivos o carpetas, usa la siguiente lista de datos para responder. Si la lista está vacía, menciónalo.

DATOS DEL USUARIO:
Carpetas: ${foldersList || 'ninguna'}.
Archivos Recientes: ${filesList || 'ninguno'}.

MANTÉN LA CONVERSACIÓN: Usa el historial anterior para contextualizar tu respuesta y ofrecer ayuda.
`;

  let messagesForApi;

  if (Array.isArray(historyOrMessage)) {
    messagesForApi = historyOrMessage.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text,
    }));
  } else {
    messagesForApi = [{ role: 'user', content: String(historyOrMessage || '') }];
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
      error?.response?.data?.detail || error?.message
    );
    return 'Tuve un problema para conectarme con mi cerebro de IA. Inténtalo de nuevo.';
  }
};

/* ==============================
 * FUNCIÓN: Buscar imagen (Unsplash)
 * ============================== */
async function fetchRelevantImage(topic) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.log('No se ha configurado la API Key de Unsplash.');
    return null;
  }
  try {
    const response = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: topic,
        per_page: 1,
        orientation: 'landscape',
        order_by: 'relevant',
      },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    return response.data?.results?.[0]?.urls?.regular || null;
  } catch (error) {
    console.error('Error al buscar imagen en Unsplash:', error.message);
    return null;
  }
}

/* ======================================================
 * FUNCIÓN 3: Generador de Contenido para PDF (mejorada)
 * ====================================================== */
exports.generatePdfContent = async (topic, userName) => {
  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // PROMPT 1: Generar estructura + imageQuery
  const structurePrompt = `
Tu tarea es generar la estructura de un informe sobre "${topic}". Responde SIEMPRE y ÚNICAMENTE con un objeto JSON.
El JSON debe tener:
1. "titulo": El título oficial del informe.
2. "introduccion": Un párrafo corto de introducción.
3. "secciones": Un array de objetos, donde cada objeto solo tiene "subtitulo". (Mínimo 3 secciones)
4. "conclusion": Un párrafo corto de conclusión.
5. "imageQuery": Una frase corta y específica, en INGLÉS, para buscar la imagen de portada en Unsplash.

REGLAS DE imageQuery:
- La consulta debe ser ESPECÍFICA al tema.
- Si el tema es un **dibujo animado** (como 'Ben 10', 'Dragon Ball'), la consulta debe pedir por el personaje o el logo. (Ej: "Ben 10 cartoon character", "Dragon Ball Z Goku")
- Si el tema es un **hecho histórico** (como 'Segunda Guerra Mundial'), la consulta debe pedir una foto histórica. (Ej: "World War 2 historical photo")
- Si el tema es **general** (como 'El Océano'), la consulta debe ser descriptiva. (Ej: "deep ocean")
- NO uses términos abstractos como 'concept' o 'art'.

Ejemplo de JSON para "Ben 10":
{
  "titulo": "Ben 10: Héroe Intergaláctico",
  "introduccion": "Ben 10 es una popular serie animada...",
  "secciones": [
    { "subtitulo": "El Descubrimiento del Omnitrix" },
    { "subtitulo": "Aliens Principales" },
    { "subtitulo": "Villanos y Amenazas" }
  ],
  "conclusion": "El legado de Ben 10 continúa...",
  "imageQuery": "Ben 10 cartoon character aliens"
}
`;

  let structure = null;

  try {
    const structureResponse = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: structurePrompt }],
        max_tokens: 1500,
        temperature: 0.5,
      },
      { headers: { Authorization: `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    let jsonString = structureResponse.data?.choices?.[0]?.message?.content?.trim() || '{}';
    if (jsonString.startsWith('```')) {
      jsonString = jsonString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    const jsonMatch = jsonString.match(/{[\s\S]*}/);
    structure = JSON.parse(jsonMatch ? jsonMatch[0] : jsonString);
  } catch (e) {
    console.error('Error al generar la ESTRUCTURA del PDF:', e?.message || e);
    return null;
  }

  // Asegurar estructura mínima
  structure = {
    titulo: structure?.titulo || String(topic || 'Informe'),
    introduccion: structure?.introduccion || 'Introducción.',
    secciones:
      Array.isArray(structure?.secciones) && structure.secciones.length > 0
        ? structure.secciones
        : [{ subtitulo: 'Contexto' }, { subtitulo: 'Desarrollo' }, { subtitulo: 'Aplicaciones' }],
    conclusion: structure?.conclusion || 'Conclusión.',
    imageQuery: structure?.imageQuery || 'generic cover',
  };

  // PROMPT 2: Generar contenido extenso
  const contentPrompt = `
Escribe un informe detallado (mínimo 800 palabras) sobre "${topic}". Usa un tono educativo y fácil de entender.
Debes seguir esta estructura exacta (desarrolla cada punto):
- Título: ${structure.titulo}
- Introducción: ${structure.introduccion}
- Secciones (desarrolla cada uno de estos subtítulos):
${structure.secciones.map((s) => `  - ${s.subtitulo}`).join('\n')}
- Conclusión: ${structure.conclusion}
- Bibliografía: (Añade una sección de 3 a 5 fuentes realistas o ficticias sobre el tema)
`;

  try {
    const textResponse = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: contentPrompt }],
        max_tokens: 3500,
        temperature: 0.6,
      },
      { headers: { Authorization: `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' } }
    );

    const textContent = textResponse.data?.choices?.[0]?.message?.content?.trim() || '';

    // Buscar imagen con la consulta generada
    console.log(`Buscando imagen con la consulta de IA: "${structure.imageQuery}"`);
    const imageUrl = await fetchRelevantImage(structure.imageQuery);

    return {
      textContent, // Texto largo del informe
      structure, // Objeto con {titulo, introduccion, secciones, conclusion, imageQuery}
      imageUrl, // URL de imagen sugerida
      userName,
      today,
      topic,
    };
  } catch (error) {
    console.error('Error al generar contenido para PDF:', error?.message || error);
    return null;
  }
};

/* ============================================
 * FUNCIÓN 4: Chat público (landing/app home)
 * ============================================ */
exports.generatePublicResponse = async (message) => {
  const systemMsg = 'Eres "Gestor IA", un asistente de IA en la página de inicio de una aplicación.';
  const prompt = `
Eres "Gestor IA", un asistente de IA en la página de inicio de una aplicación.
La aplicación es un gestor de archivos y tareas que se integra con WhatsApp.

Permite a los usuarios:
- Subir y organizar archivos (PDFs, imágenes, etc.) en carpetas y subcarpetas.
- Interactuar con un bot de WhatsApp para crear carpetas, subir archivos y pedir resúmenes.
- Generar PDFs sobre cualquier tema usando IA.
- Transcribir audios de WhatsApp a texto.

Sé amable, conciso y responde solo a preguntas sobre la aplicación. Si te preguntan algo no relacionado, di amablemente que solo puedes hablar sobre el Gestor de Tareas.

Usuario: "${message}"
Respuesta:
`.trim();

  try {
    const response = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.5,
      },
      {
        headers: { Authorization: `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' },
      }
    );
    return response.data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, no entendí la pregunta.';
  } catch (error) {
    console.error('Error en el chat público de IA:', error?.message || error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};
