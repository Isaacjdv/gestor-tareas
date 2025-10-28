const axios = require('axios');
const AI21_API_KEY = process.env.AI21_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

// FUNCIÓN 1: El Intérprete (extrae comandos en formato JSON)
exports.interpretMessage = async (message) => {
    const prompt = `
        Tu trabajo es analizar un mensaje y clasificarlo en una intención. Responde SIEMPRE con un objeto JSON.
        Las intenciones son: "greeting", "list_folders", "view_folder", "create_folder", "edit_folder", "delete_folder", "upload_file", "send_file", "send_latest_file", "get_summary", "generate_pdf", "confirm_save_yes", "confirm_save_no", "set_reminder", "clarification_needed", "unknown".
        
        REGLAS CRÍTICAS:
        1. Sé EXTREMADAMENTE LITERAL al extraer nombres en "entity", "parent_entity" o "new_entity". No simplifiques "Base de datos II" a "Base de datos".
        2. Para "upload_file", la "entity" es SIEMPRE el nombre de la carpeta destino.
        3. Para "generate_pdf", extrae el tema de la consulta en "entity".
        4. Para "confirm_save_yes", si se menciona una carpeta, extráela en "entity".
        5. Para "set_reminder", extrae la descripción en "entity" y el tiempo en "time".
        6. Si una acción necesita un nombre y no está claro, usa "clarification_needed".

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

        Analiza: "${message}"
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 250,
            temperature: 0.0,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const rawResponse = response.data?.choices?.[0]?.message?.content?.trim();
        const jsonMatch = rawResponse.match(/{[\s\S]*}/);
        const cleanedJsonString = jsonMatch ? jsonMatch[0] : rawResponse;
        try { return JSON.parse(cleanedJsonString); } 
        catch (parseError) { return { intent: "unknown" }; }
    } catch (error) { return { intent: "error" }; }
};

// FUNCIÓN 2: El Conversador (genera respuestas de texto natural)
exports.generateConversationalResponse = async (message, userName, userData) => {
    const context = `
        Contexto del Usuario:
        Carpetas: ${userData.folders.map(f => f.nombre).join(', ') || 'ninguna'}.
        Archivos: ${userData.files.map(f => f.nombre_original).join(', ') || 'ninguno'}.
    `;
    const prompt = `
        Eres "Gestor IA", un asistente de IA conversacional, amable y multifacético para WhatsApp. El nombre del usuario es ${userName}.
        Tu especialidad es ayudar a gestionar tareas, carpetas y archivos. Si la pregunta del usuario está relacionada con eso, usa el contexto de datos para darle una respuesta útil y organizada.
        También puedes responder a preguntas de conocimiento general, conversar o contar chistes.
        ${context}
        Mensaje del usuario: "${message}"
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [
                { role: 'system', content: "Eres Gestor IA, un asistente de IA conversacional y multifacético para WhatsApp." },
                { role: 'user', content: prompt }
            ],
            max_tokens: 300,
            temperature: 0.7,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });
        return response.data?.choices?.[0]?.message?.content?.trim() || "Lo siento, no estoy seguro de cómo responder a eso.";
    } catch (error) {
        return "Tuve un problema para conectarme con mi cerebro de IA. Inténtalo de nuevo.";
    }
};

// --- FUNCIÓN PARA BUSCAR IMÁGENES ---
async function fetchRelevantImage(topic) {
    if (!UNSPLASH_ACCESS_KEY) return null;
    try {
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: { query: topic, per_page: 1, orientation: 'landscape', lang: 'es' },
            headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
        });
        return response.data.results[0]?.urls?.regular;
    } catch (error) {
        console.error("Error al buscar imagen en Unsplash:", error.message);
        return null;
    }
}

// FUNCIÓN 3: Generador de Contenido para PDF Extenso con Imagen
exports.generatePdfContent = async (topic, userName) => {
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const prompt = `
        Genera un informe detallado y bien estructurado sobre "${topic}". El informe debe tener al menos 800 palabras y estar listo para un PDF.

        Estructura obligatoria:
        1.  CONTENIDO (mínimo 800 palabras):
            - Introducción: Presenta el tema y su importancia.
            - Secciones: Al menos 3-4 secciones con subtítulos en negrita. Desarrolla cada aspecto con ejemplos claros.
            - Tono: Educativo, claro y sin tecnicismos excesivos.
            - Conclusión: Resume los puntos clave.
        2.  BIBLIOGRAFÍA:
            - Al final, una sección "Fuentes Consultadas" con 3-5 referencias realistas.
    `;

    try {
        const textResponse = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 3500,
            temperature: 0.6,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });
        const textContent = textResponse.data?.choices?.[0]?.message?.content?.trim();
        
        const imageUrl = await fetchRelevantImage(topic);

        return { textContent, imageUrl, userName, today, topic };
    } catch (error) {
        console.error("Error al generar contenido para PDF:", error);
        return null;
    }
};