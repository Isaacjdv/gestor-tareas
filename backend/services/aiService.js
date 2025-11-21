// backend/services/aiService.js
const axios = require('axios');

const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ----------------------------- Helpers ----------------------------- */

/** * 🔥 NUEVO HELPER: Limpia el texto para que la voz no lea basura.
 * (Esto no estaba en tu original, es lo único nuevo aquí arriba)
 */
function cleanTextForTTS(text = '') {
  if (!text) return '';
  let clean = text;
  clean = clean.replace(/```[\s\S]*?```/g, ''); // Quita código
  clean = clean.replace(/\*\*(.*?)\*\*/g, '$1'); // Quita negritas **
  clean = clean.replace(/\*(.*?)\*/g, '$1');     // Quita cursivas *
  clean = clean.replace(/^#+\s+/gm, '');         // Quita titulos #
  clean = clean.replace(/^\s*[-*]\s+/gm, ', '); // Quita listas
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
    // HE VUELTO A PONER LA URL MANUALMENTE AQUÍ PARA EVITAR ERRORES
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
 * FUNCIÓN 2: Conversador (MODIFICADA SOLO LA LÓGICA INTERNA)
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

  // 🔥 CAMBIO 1: Prompt actualizado para hablar de todo y no usar markdown
  const systemInstruction = `
Eres "Gestor IA", un asistente virtual inteligente, amable y útil.
Estás hablando con ${userName}.

TUS CAPACIDADES:
1. Gestionar archivos (sabes qué carpetas tiene el usuario).
2. **CHARLA GENERAL:** Habla de CUALQUIER tema (cultura, chistes, vida, ciencia). Si no es sobre archivos, responde con naturalidad.

DATOS DEL USUARIO:
- Carpetas: ${foldersList || 'ninguna'}.
- Archivos: ${filesList || 'ninguno'}.

⚠️ REGLA OBLIGATORIA:
- NO USES MARKDOWN. Prohibido usar asteriscos (**negrita**), guiones de lista o almohadillas (#).
- Escribe en texto plano.
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
    // URL MANUAL PARA EVITAR ERRORES
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
    
    // 🔥 CAMBIO 2: Limpiamos la respuesta antes de devolverla
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
 * FUNCIÓN: Buscar imagen (Unsplash) - INTACTA
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
 * FUNCIÓN 3: Generador PDF (MODIFICADA PARA LIMPIAR TEXTO)
 * ====================================================== */
exports.generatePdfContent = async (topic, userName) => {
  const today = new Date().toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // PROMPT 1: Generar estructura (Prompt mejorado para evitar markdown en json)
  const structurePrompt = `
Tu tarea es generar la estructura de un informe sobre "${topic}". Responde SIEMPRE y ÚNICAMENTE con un objeto JSON.
El JSON debe tener:
1. "titulo"
2. "introduccion"
3. "secciones" (array de objetos con "subtitulo")
4. "conclusion"
5. "imageQuery" (en inglés)

REGLAS: NO uses Markdown en los valores del JSON.
`.trim();

  let structure = null;

  try {
    // URL MANUAL
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

  // PROMPT 2: Generar contenido extenso (SIN MARKDOWN)
  const contentPrompt = `
Escribe un informe detallado (mínimo 800 palabras) sobre "${topic}".
Estructura:
- Título: ${structure.titulo}
- Introducción: ${structure.introduccion}
- Secciones: ${structure.secciones.map((s) => s.subtitulo).join(', ')}
- Conclusión: ${structure.conclusion}

REGLAS DE FORMATO:
- NO USES MARKDOWN (**negrita**, ## titulos).
- Usa texto plano.
`.trim();

  try {
    // URL MANUAL
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

    let textContent = data?.choices?.[0]?.message?.content?.trim() || '';
    
    // 🔥 CAMBIO 3: Limpiamos el texto del PDF
    textContent = cleanTextForTTS(textContent);

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
 * FUNCIÓN 4: Chat público
 * ============================================ */
exports.generatePublicResponse = async (message) => {
  const systemMsg = 'Eres "Gestor IA". Responde en TEXTO PLANO sin Markdown.';
  const prompt = `
Eres "Gestor IA".
Sé amable y conciso. NO USES MARKDOWN.

Usuario: "${String(message || '')}"
Respuesta:
`.trim();

  try {
    // URL MANUAL
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

    const reply = data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, no entendí la pregunta.';
    
    // 🔥 CAMBIO 4: Limpieza final
    return cleanTextForTTS(reply);

  } catch (error) {
    console.error('Error en el chat público de IA:', error?.message || error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};