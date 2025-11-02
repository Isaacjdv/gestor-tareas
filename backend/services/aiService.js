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
            content: msg.text // Asegurarse de que usa .text
        }));
    } else {
        // Es un string (viene de WhatsApp)
        messagesForApi = [
            { role: 'user', content: historyOrMessage }
        ];
    }

    messagesForApi.unshift({ role: 'system', content: systemInstruction });
    
    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: messagesForApi, // <-- Usamos el historial completo con instrucción
            max_tokens: 300,
            temperature: 0.7,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });
        return response.data?.choices?.[0]?.message?.content?.trim() || "Lo siento, tuve un problema para generar una respuesta coherente.";
    } catch (error) {
        console.error("Error en generateConversationalResponse:", error.response?.data?.detail || error.message);
        return "Tuve un problema para conectarme con mi cerebro de IA. Inténtalo de nuevo.";
    }
};

// --- FUNCIÓN PARA BUSCAR IMÁGENES ---
async function fetchRelevantImage(topic) {
    if (!UNSPLASH_ACCESS_KEY) {
        console.log("No se ha configurado la API Key de Unsplash.");
        return null;
    }
    try {
        // [MODIFICACIÓN] Búsqueda en español y priorizando 'relevant'
        const response = await axios.get('https://api.unsplash.com/search/photos', {
            params: { 
                query: topic, 
                per_page: 1, 
                orientation: 'landscape', 
                lang: 'es', // Buscar en español
                order_by: 'relevant' // Priorizar relevancia sobre popularidad
            },
            headers: { 'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}` }
        });
        return response.data.results[0]?.urls?.regular;
    } catch (error) {
        console.error("Error al buscar imagen en Unsplash:", error.message);
        return null;
    }
}

// --- [INICIO DE CORRECCIÓN] ---
// FUNCIÓN 3: Generador de Contenido para PDF (Versión Mejorada)
// Ahora le pedimos a la IA que genere una consulta de imagen específica.
exports.generatePdfContent = async (topic, userName) => {
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });

    // [NUEVO PROMPT]
    // Pide a la IA que genere el texto Y una consulta de imagen optimizada
    const combinedPrompt = `
        Tu tarea es generar el contenido para un PDF sobre el tema: "${topic}".
        Responde SIEMPRE con un único objeto JSON que contenga dos claves:
        1. "textContent": Un informe conciso (aprox. 400-500 palabras) sobre el tema. Debe tener introducción, 2-3 secciones y conclusión.
        2. "imageQuery": Una frase corta, específica y fotorrealista, en INGLÉS, para buscar una imagen de portada relevante en Unsplash. 
        3. Evita generar simbolos asi "*", "#"
        
        REGLAS DE imageQuery:
        - Debe ser fotorrealista (ej: "historical world war 2 photo", "D-Day soldiers").
        - NO debe ser abstracta (ej: "peace" o "war concept").
        - NO debe incluir texto (ej: evitar "FUCK WAR").

        Ejemplo de JSON de respuesta para "La segunda guerra mundial":
        {
          "textContent": "La Segunda Guerra Mundial fue un conflicto global que tuvo lugar entre 1939 y 1945...",
          "imageQuery": "world war 2 soldiers normandy"
        }
    `;
    
    try {
        // 1. Llamar a la IA para obtener texto y consulta de imagen
        const aiResponse = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [{ role: 'user', content: combinedPrompt }],
            max_tokens: 1500,
            temperature: 0.6,
        }, { headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' } });
        
        const rawResponse = aiResponse.data?.choices?.[0]?.message?.content?.trim();
        const jsonMatch = rawResponse.match(/{[\s\S]*}/); // Extraer el JSON
        
        if (!jsonMatch) {
            console.error("La IA no devolvió un JSON válido:", rawResponse);
            throw new Error("La IA no devolvió un JSON válido.");
        }

        const parsedData = JSON.parse(jsonMatch[0]);
        const { textContent, imageQuery } = parsedData;

        if (!textContent || !imageQuery) {
             throw new Error("El JSON de la IA no tiene las claves 'textContent' o 'imageQuery'.");
        }

        // 2. Buscar la imagen de portada con la consulta MEJORADA
        console.log(`Buscando imagen con la consulta de IA: "${imageQuery}"`);
        const imageUrl = await fetchRelevantImage(imageQuery); // Usamos imageQuery en lugar de topic

        // 3. Devolver el objeto compatible
        return { 
            textContent, 
            imageUrl, // La imagen de portada (ahora más relevante)
            userName, 
            today, 
            topic, 
            structure: { titulo: topic } // Mantenemos 'structure' por compatibilidad
        };

    } catch (error) {
        console.error("Error al generar contenido para PDF:", error);
        return null;
    }
};
// --- [FIN DE CORRECCIÓN] ---


// --- FUNCIÓN NUEVA PARA EL CHAT PÚBLICO ---
exports.generatePublicResponse = async (message) => {
    const prompt = `
        Eres "Gestor IA", un asistente de IA en la página de inicio de una aplicación.
        Tu trabajo es responder preguntas sobre qué hace la aplicación.
        La aplicación es un gestor de archivos y tareas que se integra con WhatsApp.
        Permite a los usuarios:
        - Subir y organizar archivos (PDFs, imágenes, etc.) en carpetas y subcarpetas.
        - Interactuar con un bot de WhatsApp para crear carpetas, subir archivos y pedir resúmenes.
        - Generar PDFs sobre cualquier tema usando IA.
        - Transcribir audios de WhatsApp a texto.

       Sé amable, conciso y responde solo a preguntas sobre la aplicación. Si te preguntan algo no relacionado, di amablemente que solo puedes hablar sobre el Gestor de Tareas.

        Usuario: "${message}"
        Respuesta:
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [
                { role: 'system', content: "Eres un asistente de IA en una página de inicio." },
                { role: 'user', content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.5,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
     });
        return response.data?.choices?.[0]?.message?.content?.trim() || "Lo siento, no entendí la pregunta.";
    } catch (error) {
        console.error("Error en el chat público de IA:", error);
        return "Tuve un problema para conectarme con mi cerebro de IA.";
    }
};