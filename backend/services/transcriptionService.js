const axios = require('axios');
const fs = require('fs');

const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY;
const assemblyai = axios.create({
    baseURL: "https://api.assemblyai.com/v2",
    headers: {
        "authorization": ASSEMBLYAI_API_KEY,
        "content-type": "application/json",
    },
});

// Función auxiliar para esperar un tiempo
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Transcribe un archivo de audio usando la API de AssemblyAI.
 * @param {string} audioPath - La ruta al archivo de audio guardado localmente.
 * @returns {Promise<string>} - El texto transcrito.
 */
exports.transcribeAudio = async (audioPath) => {
    try {
        // 1. Subir el archivo de audio a AssemblyAI
        const audioData = fs.readFileSync(audioPath);
        const uploadResponse = await assemblyai.post("/upload", audioData);
        const upload_url = uploadResponse.data.upload_url;

        // 2. Enviar la URL para que se procese la transcripción
        const transcriptResponse = await assemblyai.post("/transcript", {
            audio_url: upload_url,
            language_code: "es", // <-- LÍNEA AÑADIDA PARA ESPECIFICAR ESPAÑOL
        });
        const transcriptId = transcriptResponse.data.id;

        // 3. Esperar a que la transcripción se complete
        while (true) {
            const pollingResponse = await assemblyai.get(`/transcript/${transcriptId}`);
            const transcriptStatus = pollingResponse.data.status;

            if (transcriptStatus === "completed") {
                return pollingResponse.data.text;
            } else if (transcriptStatus === "error") {
                console.error(`La transcripción falló: ${pollingResponse.data.error}`);
                return "";
            } else {
                await sleep(3000);
            }
        }
    } catch (error) {
        console.error("Error al transcribir el audio con AssemblyAI:", error.response?.data || error.message);
        return "";
    }
};