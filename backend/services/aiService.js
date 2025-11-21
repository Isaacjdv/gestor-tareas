// backend/services/aiService.js
const axios = require('axios');

const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ----------------------------- Helpers ----------------------------- */

/** * Limpia el texto para que la voz no lea "asterisco asterisco".
 */
function cleanTextForTTS(text = '') {
  if (!text) return '';
  let clean = text;

  // Eliminar bloques de código, negritas, cursivas, etc.
  clean = clean.replace(/```[\s\S]*?```/g, '');
  clean = clean.replace(/\*\*(.*?)\*\*/g, '$1'); 
  clean = clean.replace(/\*(.*?)\*/g, '$1');     
  clean = clean.replace(/__(.*?)__/g, '$1');
  clean = clean.replace(/^#+\s+/gm, '');
  clean = clean.replace(/^\s*[-*]\s+/gm, ', '); 
  clean = clean.replace(/`/g, ''); 
  clean = clean.replace(/\[|\]/g, ''); 

  return clean.replace(/\s+/g, ' ').trim();
}


/** Extrae el primer objeto JSON de un string (quita cercas de código si vienen) */
function extractFirstJson(str = '') {
  let s = String(str || '').trim();
  if (s.startsWith('```')) {
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
2. Intención "upload_file": Actívala si el usuario quiere GUARDAR, SUBIR o ARCHIVAR algo.
3. Para "generate_pdf", extrae el tema en "entity".

Analiza: "${message || ''}"
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
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
 * FUNCIÓN 2: Conversador (MEJORADO: CHARLA LIBRE + SIN MARKDOWN)
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
Eres "Gestor IA", un asistente virtual inteligente, amable y útil. El nombre del usuario es ${userName}.

TUS RESPONSABILIDADES:
1. Ayudar a gestionar archivos y carpetas.
2. **CHARLA GENERAL:** Responde preguntas sobre CUALQUIER tema con naturalidad.

DATOS DEL USUARIO:
- Carpetas: ${foldersList || 'ninguna'}.
- Archivos Recientes: ${filesList || 'ninguno'}.

⚠️ REGLA OBLIGATORIA DE FORMATO:
- NO USES MARKDOWN. Prohibido usar asteriscos (**negrita**), guiones de lista o almohadillas (#).
- Escribe en texto plano.

MANTÉN LA CONVERSACIÓN: Usa el historial anterior para contextualizar tu respuesta.
`.trim();

  let messagesForApi;
  if (Array.isArray(historyOrMessage)) {
    messagesForApi = historyOrMessage.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: String(msg.text ?? ''),
    }));
  } else {
    messagesForApi = [{ role: 'user', content: String(historyOrMessage ?? '') }];
  }

  messagesForApi.unshift({ role: 'system', content: systemInstruction });

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: messagesForApi,
        max_tokens: 300,
        temperature: 0.7,
      },
      { headers: ai21Headers() }
    );

    const rawReply = data?.choices?.[0]?.message?.content?.trim() ||
      'Lo siento, tuve un problema para generar una respuesta coherente.';
    
    return cleanTextForTTS(rawReply);

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
    const { data } = await axios.get('[https://api.unsplash.com/search/photos](https://api.unsplash.com/search/photos)', {
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

  // PROMPT 1: Generar estructura (Se pide evitar Markdown)
  const structurePrompt = `
Tu tarea es generar la estructura de un informe sobre "${topic}". Responde SIEMPRE y ÚNICAMENTE con un objeto JSON.
El JSON debe tener: "titulo", "introduccion", "secciones" (array de objetos con "subtitulo"), "conclusion", "imageQuery" (en inglés).
REGLAS: NO USES MARKDOWN.
`.trim();

  let structure = null;

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
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

  // PROMPT 2: Generar contenido extenso (Se pide evitar Markdown)
  const contentPrompt = `
Escribe un informe detallado (mínimo 800 palabras) sobre "${topic}".
Debes seguir esta estructura exacta:
- Título: ${structure.titulo}
- Introducción: ${structure.introduccion}
- Secciones: ${structure.secciones.map((s) => s.subtitulo).join('\n')}
- Conclusión: ${structure.conclusion}
- Bibliografía: (Añade una sección de 3 a 5 fuentes realistas o ficticias sobre el tema)

REGLAS DE FORMATO: NO USES MARKDOWN (**negrita**, ## titulos). Usa texto plano.
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: contentPrompt }],
        max_tokens: 3500,
        temperature: 0.6,
      },
      { headers: ai21Headers() }
    );

    let rawTextContent = data?.choices?.[0]?.message?.content?.trim() || '';

    // Aplicamos limpieza de voz al contenido
    const textContent = cleanTextForTTS(rawTextContent);

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
  const systemMsg = 'Eres "Gestor IA". Responde sobre la aplicación. NO USES MARKDOWN.';
  const prompt = `
Eres "Gestor IA", un asistente de IA en la página de inicio.
Sé amable, conciso. NO USES MARKDOWN.

Usuario: "${String(message || '')}"
Respuesta:
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: prompt },
        ],
        max_tokens: 150,
        temperature: 0.5,
      },
      { headers: ai21Headers() }
    );

    const rawReply = data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, no entendí la pregunta.';
    return cleanTextForTTS(rawReply);
  } catch (error) {
    console.error('Error en el chat público de IA:', error?.message || error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};