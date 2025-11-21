// backend/services/aiService.js
const axios = require('axios');

const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ----------------------------- Helpers ----------------------------- */

/** * 🔥 NUEVO: Limpia el texto para que el lector de voz no diga "asterisco asterisco".
 * Elimina Markdown, negritas, listas y símbolos de código.
 */
function cleanTextForTTS(text = '') {
  if (!text) return '';
  let clean = text;

  // 1. Eliminar bloques de código ``` ... ```
  clean = clean.replace(/```[\s\S]*?```/g, '');
  
  // 2. Eliminar negritas (**texto**) y cursivas (*texto*) y subrayados (__texto__)
  clean = clean.replace(/\*\*(.*?)\*\*/g, '$1'); 
  clean = clean.replace(/\*(.*?)\*/g, '$1');     
  clean = clean.replace(/__(.*?)__/g, '$1');
  
  // 3. Eliminar encabezados Markdown (# Titulo)
  clean = clean.replace(/^#+\s+/gm, '');
  
  // 4. Eliminar viñetas de listas (- o *) al inicio de línea y cambiarlas por comas
  clean = clean.replace(/^\s*[-*]\s+/gm, ', '); 
  
  // 5. Eliminar caracteres sueltos molestos
  clean = clean.replace(/`/g, ''); 
  clean = clean.replace(/\[|\]/g, ''); 
  
  // 6. Limpiar espacios extra
  return clean.replace(/\s+/g, ' ').trim();
}

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
 * FUNCIÓN 2: Conversador (MEJORADA: GENERAL + LIMPIEZA)
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

  // 🔥 AQUÍ ESTÁ LA CLAVE: Permitimos charla general y prohibimos Markdown 🔥
  const systemInstruction = `
Eres "Gestor IA", un asistente virtual inteligente, amable y útil. El nombre del usuario es ${userName}.

TUS RESPONSABILIDADES:
1. Ayudar a gestionar archivos y carpetas.
2. **CHARLA GENERAL:** Puedes hablar de CUALQUIER tema (cultura, historia, ciencia, chistes, vida diaria). Si el usuario te pregunta algo que no tiene que ver con archivos, RESPÓNDELE con naturalidad.

DATOS DEL USUARIO (Úsalos solo si pregunta por ellos):
- Carpetas: ${foldersList || 'ninguna'}.
- Archivos Recientes: ${filesList || 'ninguno'}.

⚠️ REGLA OBLIGATORIA DE FORMATO:
- NO USES MARKDOWN. Prohibido usar asteriscos (**negrita**), guiones de lista o almohadillas (#).
- Escribe en texto plano.
- Usa comas y puntos para separar ideas.

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

    const rawReply = data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, tuve un problema para generar una respuesta coherente.';
    
    // 🔥 Aplicamos la limpieza antes de devolver la respuesta
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

  // PROMPT 1: Generar estructura + imageQuery
  const structurePrompt = `
Tu tarea es generar la estructura de un informe sobre "${topic}". Responde SIEMPRE y ÚNICAMENTE con un objeto JSON.
El JSON debe tener:
1. "titulo": El título oficial del informe.
2. "introduccion": Un párrafo corto de introducción.
3. "secciones": Un array de objetos, donde cada objeto solo tiene "subtitulo". (Mínimo 3 secciones)
4. "conclusion": Un párrafo corto de conclusión.
5. "imageQuery": Una frase corta y específica, en INGLÉS, para buscar la imagen de portada en Unsplash.

REGLAS:
- NO uses Markdown en el JSON.
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

  // PROMPT 2: Generar contenido extenso
  const contentPrompt = `
Escribe un informe detallado (mínimo 800 palabras) sobre "${topic}". Usa un tono educativo y fácil de entender.
Debes seguir esta estructura exacta:
- Título: ${structure.titulo}
- Introducción: ${structure.introduccion}
- Secciones:
${structure.secciones.map((s) => `  - ${s.subtitulo}`).join('\n')}
- Conclusión: ${structure.conclusion}

REGLAS DE FORMATO:
- NO USES MARKDOWN (**negrita**).
- Usa texto plano.
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

    const rawTextContent = data?.choices?.[0]?.message?.content?.trim() || '';
    
    // 🔥 Limpiamos el contenido del PDF también
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
  const systemMsg = 'Eres "Gestor IA", un asistente de IA. Responde en TEXTO PLANO sin Markdown.';
  const prompt = `
Eres "Gestor IA", un asistente de IA en la página de inicio.
Sé amable, conciso y responde sobre la aplicación. NO USES MARKDOWN.

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

    const reply = data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, no entendí la pregunta.';
    
    // 🔥 Limpieza final
    return cleanTextForTTS(reply);

  } catch (error) {
    console.error('Error en el chat público de IA:', error?.message || error);
    return 'Tuve un problema para conectarme con mi cerebro de IA.';
  }
};