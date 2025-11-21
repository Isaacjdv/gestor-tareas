// backend/services/aiService.js
const axios = require('axios');

const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

/* ========================================================================
   🛠️ HELPERS Y UTILIDADES
   ======================================================================== */

/** * Limpia el texto para que el lector de voz (TTS) no lea símbolos raros.
 * Elimina: Markdown, asteriscos, guiones de lista, código, etc.
 */
function cleanTextForTTS(text = '') {
  if (!text) return '';
  let clean = text;

  // 1. Eliminar bloques de código ``` ... ```
  clean = clean.replace(/```[\s\S]*?```/g, '');
  
  // 2. Eliminar negritas (**texto** o __texto__) y cursivas (*texto*)
  clean = clean.replace(/\*\*(.*?)\*\*/g, '$1'); // Quita ** pero deja el texto
  clean = clean.replace(/\*(.*?)\*/g, '$1');     // Quita * pero deja el texto
  clean = clean.replace(/__(.*?)__/g, '$1');
  
  // 3. Eliminar encabezados Markdown (# Titulo)
  clean = clean.replace(/^#+\s+/gm, '');
  
  // 4. Eliminar viñetas de listas (- o *) al inicio de línea
  clean = clean.replace(/^\s*[-*]\s+/gm, ', '); // Las cambia por comas para que la voz haga pausa
  
  // 5. Eliminar caracteres sueltos que molestan al TTS
  clean = clean.replace(/`/g, ''); // Comillas de código inline
  clean = clean.replace(/\[|\]/g, ''); // Corchetes
  
  // 6. Limpiar espacios extra
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

/** Extrae JSON seguro de la respuesta de la IA */
function extractFirstJson(str = '') {
  let s = String(str || '').trim();
  // Si viene con bloque de código ```json ... ```
  if (s.includes('```')) {
    s = s.replace(/```[a-z]*\n?([\s\S]*?)```/g, '$1');
  }
  const match = s.match(/{[\s\S]*}/);
  return match ? match[0] : '{}';
}

function ai21Headers() {
  return {
    Authorization: `Bearer ${AI21_API_KEY}`,
    'Content-Type': 'application/json',
  };
}

/* ========================================================================
   1. INTERPRETADOR DE INTENCIONES (EL CEREBRO)
   ======================================================================== */
exports.interpretMessage = async (message) => {
  const prompt = `
Analiza el siguiente mensaje del usuario y devuelve un JSON con su intención.

INTENCIONES POSIBLES:
"greeting" (saludos), "list_folders", "view_folder", "create_folder", "edit_folder", "delete_folder",
"upload_file", "send_latest_file", "generate_pdf", "set_reminder", "clarification_needed", "unknown".

REGLAS DE EXTRACCIÓN:
1. "entity": Es el nombre principal (nombre de carpeta, tema del PDF, archivo).
2. "parent_entity": Si menciona una carpeta padre (ej: "crea X dentro de Y").
3. "create_folder": Actívalo si dice "crear", "nueva carpeta".
4. "upload_file": Actívalo si dice "sube esto", "guarda esto", "archiva en X".
5. "generate_pdf": Extrae el tema EXACTO en "entity".

EJEMPLOS:
- "Hola, ¿qué tal?" -> {"intent": "greeting"}
- "Crear carpeta 'Proyectos'" -> {"intent": "create_folder", "entity": "Proyectos"}
- "Elimina la carpeta 'Basura'" -> {"intent": "delete_folder", "entity": "Basura"}
- "Sube esto a 'Finanzas'" -> {"intent": "upload_file", "entity": "Finanzas"}
- "Hazme un PDF sobre la Revolución Francesa" -> {"intent": "generate_pdf", "entity": "la Revolución Francesa"}
- "Quién es el presidente de Ecuador" -> {"intent": "unknown"} (Esto es una pregunta general, no un comando)

Mensaje: "${message || ''}"
JSON:
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.0, // Cero creatividad para comandos precisos
      },
      { headers: ai21Headers() }
    );

    const jsonStr = extractFirstJson(data?.choices?.[0]?.message?.content);
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("Error interpretando:", e.message);
    return { intent: 'unknown' }; // Ante la duda, conversamos
  }
};

/* ========================================================================
   2. GENERADOR DE CONVERSACIÓN (LA PERSONALIDAD SIN ASTERISCOS)
   ======================================================================== */
exports.generateConversationalResponse = async (historyOrMessage, userName, userData) => {
  // 1. Preparar contexto de datos
  const foldersStr = Array.isArray(userData?.folders) && userData.folders.length > 0
    ? userData.folders.map(f => f.nombre).join(', ')
    : 'ninguna';

  const filesStr = Array.isArray(userData?.files) && userData.files.length > 0
    ? userData.files.slice(0, 5).map(f => f.nombre_original).join(', ')
    : 'ninguno';

  // 2. SYSTEM PROMPT INGENIERO PARA VOZ
  const systemInstruction = `
Eres Gesia, una asistente virtual profesional, amable y humana. Estás hablando con ${userName}.

TU CONTEXTO ACTUAL:
- El usuario tiene estas carpetas: ${foldersStr}.
- Archivos recientes: ${filesStr}.

REGLAS OBLIGATORIAS (SISTEMA DE VOZ):
1. 🚫 PROHIBIDO EL MARKDOWN: No uses asteriscos (*), ni negritas (**), ni guiones (-), ni numerales (#).
2. ESCRIBE COMO HABLAS: Usa oraciones completas. Usa comas y puntos para marcar las pausas de la voz.
3. Si vas a listar cosas, sepáralas por comas o puntos, no uses listas verticales.
4. MEMORIA: Usa el historial de la conversación para saber de qué estábamos hablando. Si el usuario dice "y quién es él", mira el mensaje anterior.
5. RESPUESTAS GENERALES: Si te preguntan cosas de cultura general (historia, ciencia, etc.), responde con tu conocimiento libremente.
6. Sé concisa. Respuestas de máximo 3 o 4 oraciones salvo que pidan explicaciones largas.

Ejemplo INCORRECTO: "Aquí tienes: \n- Carpeta A \n- Carpeta B"
Ejemplo CORRECTO: "Aquí tienes tus carpetas. Veo que tienes la Carpeta A y también la Carpeta B."
`.trim();

  // 3. Construir historial de mensajes
  let messagesForApi = [];
  if (Array.isArray(historyOrMessage)) {
    messagesForApi = historyOrMessage.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: String(msg.text || '')
    }));
  } else {
    messagesForApi = [{ role: 'user', content: String(historyOrMessage || '') }];
  }

  // Insertar System Prompt al inicio
  messagesForApi.unshift({ role: 'system', content: systemInstruction });

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: messagesForApi,
        max_tokens: 400,
        temperature: 0.7, // Creatividad media para sonar natural
      },
      { headers: ai21Headers() }
    );

    let reply = data?.choices?.[0]?.message?.content?.trim() || 'Lo siento, no te escuché bien.';
    
    // 🔥 LIMPIEZA FINAL DE SEGURIDAD 🔥
    return cleanTextForTTS(reply);

  } catch (error) {
    console.error('Error AI Conversación:', error.message);
    return 'Hubo un error de conexión con mi sistema. ¿Puedes repetirlo?';
  }
};

/* ========================================================================
   3. GENERADOR DE PDF (CONTENIDO ACADÉMICO)
   ======================================================================== */
exports.generatePdfContent = async (topic, userName) => {
  const today = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  // Paso A: Estructura JSON
  const structurePrompt = `
Genera la estructura para un informe sobre "${topic}". Responde SOLO JSON.
Campos: "titulo", "introduccion", "secciones" (array objetos {subtitulo}), "conclusion", "imageQuery" (inglés).
Sin markdown.
`.trim();

  let structure = { 
    titulo: topic, introduccion: 'Introducción...', secciones: [], conclusion: 'Fin.', imageQuery: 'abstract' 
  };

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: structurePrompt }],
        max_tokens: 1000,
        temperature: 0.5,
      },
      { headers: ai21Headers() }
    );
    const jsonRaw = extractFirstJson(data?.choices?.[0]?.message?.content);
    const parsed = JSON.parse(jsonRaw);
    if (parsed.titulo) structure = parsed;
  } catch (e) {
    console.warn("Usando estructura por defecto PDF.");
  }

  // Paso B: Contenido Redactado
  // Aquí también pedimos NO usar markdown para que el PDF salga limpio
  const contentPrompt = `
Escribe el contenido completo del informe "${structure.titulo}".
Estructura:
1. Introducción: ${structure.introduccion}
2. Secciones: ${structure.secciones.map(s => s.subtitulo).join(', ')}.
3. Conclusión: ${structure.conclusion}

REGLAS DE FORMATO:
- Escribe en texto plano.
- NO USES MARKDOWN (**negritas**, ## titulos).
- Separa los párrafos con doble salto de línea.
- Tono: Académico y formal.
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [{ role: 'user', content: contentPrompt }],
        max_tokens: 3000,
        temperature: 0.6,
      },
      { headers: ai21Headers() }
    );

    let fullText = data?.choices?.[0]?.message?.content || '';
    
    // Limpiamos el texto del PDF también para evitar asteriscos en el documento
    fullText = cleanTextForTTS(fullText);

    const imageUrl = await fetchRelevantImage(structure.imageQuery);

    return {
      textContent: fullText,
      structure,
      imageUrl,
      userName,
      today,
      topic
    };
  } catch (error) {
    console.error('Error generando PDF:', error.message);
    return null;
  }
};

/* ========================================================================
   4. CHAT PÚBLICO (LANDING)
   ======================================================================== */
exports.generatePublicResponse = async (message) => {
  const systemMsg = `
Eres Gestor IA, el asistente de la portada de la app.
Responde en TEXTO PLANO (sin markdown, sin negritas).
Explica que sirves para gestionar archivos, carpetas y crear PDFs.
`.trim();

  try {
    const { data } = await axios.post(
      '[https://api.ai21.com/studio/v1/chat/completions](https://api.ai21.com/studio/v1/chat/completions)',
      {
        model: 'jamba-large',
        messages: [
          { role: 'system', content: systemMsg },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.5,
      },
      { headers: ai21Headers() }
    );
    
    const reply = data?.choices?.[0]?.message?.content || '';
    return cleanTextForTTS(reply);
    
  } catch (e) {
    return "Error de conexión.";
  }
};

/* ========================================================================
   5. UTILIDAD IMAGEN (UNSPLASH)
   ======================================================================== */
async function fetchRelevantImage(topic) {
  if (!UNSPLASH_ACCESS_KEY) return null;
  try {
    const { data } = await axios.get('[https://api.unsplash.com/search/photos](https://api.unsplash.com/search/photos)', {
      params: { query: topic, per_page: 1, orientation: 'landscape', order_by: 'relevant' },
      headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}` },
    });
    return data?.results?.[0]?.urls?.regular || null;
  } catch {
    return null;
  }
}