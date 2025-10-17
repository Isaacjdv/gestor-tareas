const axios = require('axios');
const AI21_API_KEY = process.env.AI21_API_KEY;

// FUNCIÓN 1: El Intérprete (extrae comandos en formato JSON)
exports.interpretMessage = async (message) => {
    const prompt = `
        Tu trabajo es analizar el mensaje de un usuario para un bot de gestión de tareas y convertirlo en un comando JSON.
        Responde SIEMPRE y ÚNICAMENTE con un objeto JSON.

        Las intenciones posibles son:
        "greeting", "list_folders", "view_folder", "create_folder", "edit_folder", "delete_folder",
        "upload_file", "send_file", "send_latest_file", "get_summary", "generate_pdf", 
        "confirm_save_yes", "confirm_save_no", "clarification_needed", "unknown".

        REGLAS CRÍTICAS:
        1. Al extraer nombres en "entity", "parent_entity" o "new_entity", sé EXTREMADAMENTE LITERAL. No simplifiques "Base de datos II" a "Base de datos". Mantén mayúsculas, minúsculas y símbolos tal como los escribe el usuario.
        2. Para "upload_file", la "entity" es SIEMPRE el nombre de la carpeta de destino. NUNCA uses palabras genéricas como "esto", "archivo" o "documento" como la "entity".
        3. Para "generate_pdf", extrae la consulta completa en "entity".
        4. Para "confirm_save_yes", si se menciona una carpeta, extráela en "entity".
        5. Si el usuario pide una acción (ver, editar, eliminar, enviar) pero el nombre del archivo o carpeta es ambiguo o no está claro (ej: "pásame el archivo", "entra en la carpeta"), usa la intención "clarification_needed".

        ### Ejemplos ###
        - Usuario: "hola que tal" -> {"intent": "greeting"}
        - Usuario: "muéstrame mis carpetas" -> {"intent": "list_folders"}
        - Usuario: "Quiero ver que hay en mi carpeta Base de datos II" -> {"intent": "view_folder", "entity": "Base de datos II"}
        - Usuario: "entra en imágenes" -> {"intent": "view_folder", "entity": "imágenes"}
        - Usuario: "crea la carpeta 'Impuestos 2025' dentro de 'Facturas'" -> {"intent": "create_folder", "entity": "Impuestos 2025", "parent_entity": "Facturas"}
        - Usuario: "renombra 'mate' a 'matemáticas'" -> {"intent": "edit_folder", "entity": "mate", "new_entity": "matemáticas"}
        - Usuario: "sube esto en la carpeta deberes" -> {"intent": "upload_file", "entity": "deberes"}
        - Usuario: "pásame el primer archivo" -> {"intent": "send_latest_file"}
        - Usuario: "pásame el archivo" -> {"intent": "clarification_needed"}
        - Usuario: "haz un resumen de la segunda guerra mundial en pdf" -> {"intent": "generate_pdf", "entity": "resumen de la segunda guerra mundial"}
        - Usuario: "si, guárdalo en la carpeta 'resúmenes de IA'" -> {"intent": "confirm_save_yes", "entity": "resúmenes de IA"}
        - Usuario: "no, no hace falta" -> {"intent": "confirm_save_no"}
        - Usuario: "gracias" -> {"intent": "greeting"}

        Analiza: "${message}"
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150,
            temperature: 0.0, // Temperatura a 0 para máxima precisión
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });

        const rawResponse = response.data?.choices?.[0]?.message?.content?.trim();
        const jsonMatch = rawResponse.match(/{[\s\S]*}/);
        const cleanedJsonString = jsonMatch ? jsonMatch[0] : rawResponse;
        try {
            return JSON.parse(cleanedJsonString);
        } catch (parseError) {
            console.error("No se pudo parsear el JSON de la IA:", cleanedJsonString);
            return { intent: "unknown" };
        }
    } catch (error) {
        console.error("Error al contactar la API de IA (interpretMessage):", error.response?.data || error.message);
        return { intent: "error" };
    }
};

// FUNCIÓN 2: El Conversador (genera respuestas de texto natural)
exports.generateConversationalResponse = async (message, userName, userData) => {
    const context = `
        Contexto de Datos del Usuario:
        Carpetas: ${userData.folders.map(f => f.nombre).join(', ') || 'ninguna'}.
        Archivos: ${userData.files.map(f => f.nombre_original).join(', ') || 'ninguno'}.
    `;

    const prompt = `
        Eres un asistente de IA conversacional y multifacético llamado "Gestor IA". Tu personalidad es amable, servicial y un poco ingeniosa. El nombre del usuario es ${userName}.

        Tu especialidad principal es ayudar al usuario a gestionar sus tareas, carpetas y archivos. Si la pregunta del usuario está relacionada con eso, usa el contexto de datos para darle una respuesta útil y organizada.
        
        Sin embargo, también puedes responder a preguntas de conocimiento general, tener conversaciones casuales, contar un chiste corto o lo que el usuario te pida. Tu objetivo es ser un asistente completo.

        ${context}

        Analiza el mensaje del usuario y responde de forma natural y directa.

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

        const reply = response.data?.choices?.[0]?.message?.content?.trim();
        return reply || "Lo siento, no estoy seguro de cómo responder a eso.";
    } catch (error) {
        console.error("Error al generar respuesta conversacional de la IA:", error.response?.data || error.message);
        return "Tuve un problema para conectarme con mi cerebro de IA. Inténtalo de nuevo, por favor.";
    }
};