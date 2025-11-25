// backend/services/aiService.js
const axios = require('axios');

const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ----------------------------- Helpers ----------------------------- */

/** Extrae el primer objeto JSON de un string (quita cercas de código si vienen) */
function extractFirstJson(str = '') {
  let s = String(str || '').trim();
  if (s.startsWith('```')) {
    // Quita cercas de código y lenguaje opcional
    s = s.replace(/^```[a-zA-Z-]*\n?/, '').replace(/```$/, '').trim();
  }
  const match = s.match(/{[\s\S]*}/);
  return match ? match[0] : s;
}

/** Construye headers estándar para AI21 */
function ai21Headers() {
  return {
    Authorization: `Bearer ${AI21_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/** Quita todos los asteriscos de la respuesta (para evitar Markdown en el chat) */
function stripAsterisks(str = '') {
  return String(str || '').replace(/\*/g, '');
}

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
2. Intención "upload_file":
   - Actívala si el usuario quiere GUARDAR, SUBIR o ARCHIVAR algo (ej: "guarda esto", "sube esto", "archiva esto").
   - Si menciona una carpeta (ej: "en la carpeta X", "en X", "a X"), extrae "X" como "entity".
   - Si el usuario solo adjunta un archivo sin texto (mensaje vacío o marcador), devuelve {"intent":"upload_file"} sin "entity".
3. Para "generate_pdf", extrae el tema en "entity".
4. Para "confirm_save_yes", si se menciona una carpeta, extráela en "entity".
5. Para "set_reminder":
   - "entity": descripción de la actividad.
   - "time": hora o período (ej: "en 2 horas", "mañana a las 9 am").
6. Para "schedule_file_send":
   - "entity": nombre del archivo.
   - "contact": nombre o número del contacto.
   - "time": hora o período.
   - "message": mensaje adicional (opcional).
7. Si una acción necesita un nombre y no está claro, usa "clarification_needed".

### Ejemplos ###
- Usuario: "hola" -> {"intent": "greeting"}
- Usuario: "muéstrame mis carpetas" -> {"intent": "list_folders"}
- Usuario: "qué hay dentro de la carpeta Base de datos II" -> {"intent": "view_folder", "entity": "Base de datos II"}
- Usuario: "crea la carpeta 'Impuestos 2025' dentro de 'Facturas'" -> {"intent": "create_folder", "entity": "Impuestos 2025", "parent_entity": "Facturas"}
- Usuario: "renombra 'mate' a 'matemáticas'" -> {"intent": "edit_folder", "entity": "mate", "new_entity": "matemáticas"}
- Usuario: "pásame el primer archivo" -> {"intent": "send_latest_file"}
- Usuario: "pásame el archivo" -> {"intent": "clarification_needed"}
- Usuario: "haz un resumen de la segunda guerra mundial en pdf" -> {"intent": "generate_pdf", "entity": "la segunda guerra mundial"}
- Usuario: "recuérdame hacer la compra en 30 minutos" -> {"intent": "set_reminder", "entity": "hacer la compra", "time": "en 30 minutos"}

--- Nuevos ejemplos de subida ---
- Usuario: "sube esto en la carpeta deberes" -> {"intent": "upload_file", "entity": "deberes"}
- Usuario: "Guarda esto en carpetaxd" -> {"intent": "upload_file", "entity": "carpetaxd"}
- Usuario: "Archiva esto en 'importante'" -> {"intent": "upload_file", "entity": "importante"}
- Usuario: "[ADJUNTO]" (solo archivo) -> {"intent": "upload_file"}
- Usuario: "Guárdalo en la carpeta archivos" -> {"intent": "confirm_save_yes", "entity": "archivos"}

Analiza: "${message || ''}"
`.trim();

  try {
    const { data } = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 250,
        temperature: 0.0,
      },
      { headers: ai21Headers() }
    );

    const raw = data?.choices?.[0]?.message?.content ?? '';
    const jsonString = extractFirstJson(raw);
    try {
      return JSON.parse(jsonString);
    } catch {
      return { intent: 'unknown' };
    }
  } catch {
    return { intent: 'error' };
  }
};

/* ==============================================
 * FUNCIÓN 2: Conversador (string o array)
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

  // 💡 INICIO DE LÓGICA DE OCR
  let customInstruction = '';
  let isOcrCommand = false;

  let lastMessageText = Array.isArray(historyOrMessage) 
      ? historyOrMessage[historyOrMessage.length - 1]?.text || historyOrMessage[historyOrMessage.length - 1]?.content || ''
      : String(historyOrMessage);

  const commandMatch = lastMessageText.match(/^AI_CMD_PROCESS_TEXT: (.*)/s);

  if (commandMatch) {
      isOcrCommand = true;
      const ocrContent = commandMatch[1];
      
      // Instrucción específica para la IA
      customInstruction = `
      **PRIORIDAD:** Acabas de recibir un texto extraído de una imagen/documento (OCR/Archivo). Tu ÚNICA tarea es:
      1. Analizar el contenido: "${ocrContent}".
      2. Responder al usuario con un RESUMEN corto (2-4 frases) o la conclusión principal de qué trata el archivo.
      3. Preguntar al usuario cómo debe gestionarlo (ej: "¿Quieres que lo archive en 'Deberes' o haga un resumen?").
      4. NO MENCIONES el comando "AI_CMD_PROCESS_TEXT" ni el texto OCR crudo en tu respuesta.
      `.trim();

      // Reemplazamos el mensaje "oculto" por un mensaje de usuario simple en el historial para la IA
      if (Array.isArray(historyOrMessage)) {
          // Asume que el historial enviado por el frontend tiene 'text'
          historyOrMessage[historyOrMessage.length - 1] = { sender: 'user', text: `Acabo de subir una imagen/archivo para que lo analices.` };
      } else {
          // Si historyOrMessage es un string (no debería pasar con el frontend actual, pero por seguridad)
          historyOrMessage = `Acabo de subir una imagen/archivo para que lo analices.`;
      }
  }
  // 💡 FIN DE LÓGICA DE OCR
  
  const systemInstruction = `
Eres "Gestor IA", un asistente de IA conversacional y amable. El nombre del usuario es ${userName}.

TU ROL PRINCIPAL:
1. Mantener una conversación natural, cercana y útil.
2. Ayudar al usuario a gestionar sus tareas y archivos cuando lo necesite.

${customInstruction || ''} 

${!isOcrCommand ? `
IMPORTANTE:
- No uses formato Markdown. No uses asteriscos (*), ni negritas, ni cursivas.
- Responde en texto plano.
- Evita presentarte desde cero en cada mensaje. No repitas "Hola, soy Gestor IA" en cada respuesta.

SI EL USUARIO:
- Habla de carpetas, archivos, PDFs, resúmenes, WhatsApp, recordatorios o la aplicación:
   - Usa la información disponible para darle contexto.
   - Propón acciones útiles (por ejemplo: "podemos crear una carpeta para eso", "puedes subir el archivo y luego te hago un resumen").
- Habla de otros temas (estudio, trabajo, dudas generales, curiosidades, temas random, problemas personales, etc.):
   - Responde normalmente sobre ese tema.
   - NO digas que solo puedes hablar de archivos o de la aplicación.
   - Puedes hacer preguntas de seguimiento cortas para mantener la conversación.

DATOS DEL USUARIO:
Carpetas: ${foldersList || 'ninguna'}.
Archivos Recientes: ${filesList || 'ninguno'}.

MANTÉN LA CONVERSACIÓN:
- Usa el historial anterior para contextualizar tu respuesta.
- Sé empático y directo. Respuestas de 2 a 6 frases son suficientes.
- No inventes archivos o carpetas que no estén en la lista.
` : ''}
`.trim();

  let messagesForApi;
  if (Array.isArray(historyOrMessage)) {
    messagesForApi = historyOrMessage.map((msg) => {
      const content = String(msg.text ?? msg.content ?? '');
      // intentamos deducir el rol de manera flexible según lo que mande el frontend
      const sender = (msg.sender || msg.role || '').toLowerCase();
      const role =
        sender === 'user' || sender === 'me'
          ? 'user'
          : sender === 'assistant' || sender === 'bot' || sender === 'ai'
          ? 'assistant'
          : 'user'; // por defecto, lo tratamos como usuario

      return { role, content };
    });
  } else {
    messagesForApi = [{ role: 'user', content: String(historyOrMessage ?? '') }];
  }

  // Insertamos el mensaje de sistema al principio
  messagesForApi.unshift({ role: 'system', content: systemInstruction });

  try {
    const { data } = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: messagesForApi,
        max_tokens: 300,
        temperature: 0.7,
      },
      { headers: ai21Headers() }
    );

    const raw =
      data?.choices?.[0]?.message?.content?.trim() ||
      'Lo siento, tuve un problema para generar una respuesta coherente.';

    // Quitamos todos los asteriscos para evitar formato raro en el chat
    return stripAsterisks(raw);
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
    const { data } = await axios.get('https://api.unsplash.com/search/photos', {
      params: {
        query: topic,
        per_page: 1,
        orientation: 'landscape',
        order_by: 'relevant',
      },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    return data?.results?.[0]?.urls?.regular || null;
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
- Si el tema es un dibujo animado (como 'Ben 10', 'Dragon Ball'), pide por el personaje o el logo. (Ej: "Ben 10 cartoon character", "Dragon Ball Z Goku")
- Si el tema es un hecho histórico (como 'Segunda Guerra Mundial'), pide una foto histórica. (Ej: "World War 2 historical photo")
- Si el tema es general (como 'El Océano'), usa una consulta descriptiva. (Ej: "deep ocean")
- NO uses términos abstractos como 'concept' o 'art'.
`.trim();

  let structure = null;

  try {
    const { data } = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: structurePrompt }],
        max_tokens: 1500,
        temperature: 0.5,
      },
      { headers: ai21Headers() }
    );

    let content = data?.choices?.[0]?.message?.content?.trim() || '{}';
    content = extractFirstJson(content);

    try {
      structure = JSON.parse(content);
    } catch {
      structure = null;
    }
  } catch (e) {
    console.error('Error al generar la ESTRUCTURA del PDF:', e?.message || e);
    structure = null;
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
    imageQuery: structure?.imageQuery || 'report cover',
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
`.trim();

  try {
    const { data } = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: contentPrompt }],
        max_tokens: 3500,
        temperature: 0.6,
      },
      { headers: ai21Headers() }
    );

    const textContent = data?.choices?.[0]?.message?.content?.trim() || '';

    // Buscar imagen con la consulta generada
    const imageUrl = await fetchRelevantImage(structure.imageQuery);

    return {
      textContent,
      structure,
      imageUrl,
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
  const systemMsg = `
Eres "Gestor IA", un asistente de IA en la página de inicio de una aplicación.

La aplicación es un gestor de archivos y tareas que se integra con WhatsApp y permite:
- Subir y organizar archivos (PDFs, imágenes, etc.) en carpetas y subcarpetas.
- Interactuar con un bot de WhatsApp para crear carpetas, subir archivos y pedir resúmenes.
- Generar PDFs sobre cualquier tema usando IA.
- Transcribir audios de WhatsApp a texto.

IMPORTANTE:
- No uses formato Markdown. No uses asteriscos (*), ni negritas, ni cursivas.
- Responde en texto plano.
`.trim();

  const prompt = `
Usuario: "${String(message || '')}"

Responde de forma amable y natural. 
Si pregunta por la app o funciones, explícalas.
Si pregunta por otros temas, responde normalmente sobre ese tema.
`.trim();

  try {
    const { data } = await axios.post(
      'https://api.ai21.com/studio/v1/chat/completions',
      {
        model: 'jamba-large',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
        max_tokens: 250,
        temperature: 0.7,
      },
      { headers: ai21Headers() }
    );

    const raw =
      data?.choices?.[0]?.message?.content?.trim() ||
      'Lo siento, no entendí la pregunta, ¿puedes reformularla?';

    return stripAsterisks(raw);
  } catch (error) {
    console.error('Error en el chat público de IA:', error?.message || error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};
