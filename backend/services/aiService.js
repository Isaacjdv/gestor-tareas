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
        "confirm_save_yes", "confirm_save_no", "set_reminder", "schedule_file_send",
        "clarification_needed", "unknown".

        REGLAS CRÍTICAS para la extracción de entidades:
        1. Al extraer nombres en "entity", "parent_entity" o "new_entity", sé EXTREMADAMENTE LITERAL. No simplifiques "Base de datos II" a "Base de datos". Mantén mayúsculas, minúsculas y símbolos tal como los escribe el usuario.
        2. Para "upload_file", la "entity" es SIEMPRE el nombre de la carpeta de destino. NUNCA uses palabras genéricas como "esto", "archivo" o "documento" como la "entity".
        3. Para "generate_pdf", extrae la consulta completa en "entity".
        4. Para "confirm_save_yes", si se menciona una carpeta, extráela en "entity".
        5. Para "set_reminder":
           - "entity": La descripción de la actividad o el recordatorio.
           - "time": La hora o período de tiempo (ej: "en 2 horas", "mañana a las 9 am", "el 25 de diciembre a las 3 de la tarde").
        6. Para "schedule_file_send":
           - "entity": El nombre del archivo a enviar.
           - "contact": El nombre o número de teléfono del contacto (si se menciona).
           - "time": La hora o período de tiempo (ej: "dentro de un minuto", "ma1ñana a las 10 am").
           - "message": Un mensaje adicional (opcional).
        7. Si el usuario pide una acción (ver, editar, eliminar, enviar, recordar, programar envío) pero el nombre del archivo, carpeta, contacto o el momento es ambiguo o no está claro, usa la intención "clarification_needed".

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
        - Usuario: "recuérdame hacer la compra en 30 minutos" -> {"intent": "set_reminder", "entity": "hacer la compra", "time": "en 30 minutos"}
        - Usuario: "enviame el archivo 'reporte mensual' a Rodrigo mañana a las 9am con el mensaje 'Adjunto el reporte'" -> {"intent": "schedule_file_send", "entity": "reporte mensual", "contact": "Rodrigo", "time": "mañana a las 9am", "message": "Adjunto el reporte"}
        - Usuario: "enviame el pdf de la IA a mi mismo en 5 minutos" -> {"intent": "schedule_file_send", "entity": "pdf de la IA", "contact": "mi mismo", "time": "en 5 minutos"}
        - Usuario: "gracias" -> {"intent": "greeting"}

        Analiza: "${message}"
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 250, // Aumentado para acomodar más entidades
            temperature: 0.0,
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
        
        También puedes responder a preguntas de conocimiento general, tener conversaciones casuales, contar un chiste corto o lo que el usuario te pida. Tu objetivo es ser un asistente completo.

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

// FUNCIÓN 3 (NUEVA): Generador de Contenido para PDF Extenso y Formateado
exports.generatePdfContent = async (topic, userName) => {
    const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
    const prompt = `
        Genera un contenido extenso y fácil de entender (al menos 3 páginas si se imprime) sobre el tema "${topic}".
        El contenido debe ser adecuado para un PDF, con la siguiente estructura y características:

        - Encabezado:
            - "Documento solicitado por: ${userName}"
            - "Fecha de generación: ${today}"
            - Un título claro relacionado con el tema.
        - Tono: Educativo, pero sin mucho tecnicismo, apto para una comprensión general.
        - Estructura:
            - Una introducción clara.
            - Al menos 3-4 secciones principales con subtítulos.
            - Cada sección debe incluir al menos un ejemplo práctico o analógico para clarificar.
            - Una conclusión.
            - Una sección de "Bibliografía Sugerida" con 3-5 fuentes reales de donde obtener la infromación que em diste (ej: "Enciclopedia del Saber", "Artículo científico XYZ", "Libro ABC").

        Asegúrate de que la información sea rica en detalles, explicaciones y ejemplos para alcanzar la extensión deseada.
        Formato de la respuesta: Texto plano, listo para ser copiado en un PDF, sin incluir directamente el JSON. Usa saltos de línea y doble salto de línea para párrafos.
    `;

    try {
        const response = await axios.post('https://api.ai21.com/studio/v1/chat/completions', {
            model: 'jamba-large', // Puedes probar con otros modelos si están disponibles y son más potentes para esto
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 2000, // Aumentado para generar contenido largo
            temperature: 0.7, // Un poco más creativo para generar texto
            top_p: 0.9,
        }, {
            headers: { 'Authorization': `Bearer ${AI21_API_KEY}`, 'Content-Type': 'application/json' }
        });

        return response.data?.choices?.[0]?.message?.content?.trim() || "No pude generar el contenido solicitado para el PDF.";
    } catch (error) {
        console.error("Error al generar contenido extenso para PDF:", error.response?.data || error.message);
        return "Lo siento, tuve un problema al generar el contenido extenso para tu PDF.";
    }
};