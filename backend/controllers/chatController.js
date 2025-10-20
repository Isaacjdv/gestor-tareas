const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const aiService = require('../services/aiService');

exports.handleChatMessage = async (req, res) => {
    const { message } = req.body;
    const user = req.user; // Obtenido del token de autenticación

    try {
        // 1. Recolectamos los datos del usuario (carpetas y archivos)
        const userFolders = await folderModel.findByUserId(user.userId);
        const userFiles = await fileModel.findAllByUserId(user.userId);
        const userData = { folders: userFolders, files: userFiles };

        // 2. Le pasamos el mensaje y los datos a la IA conversacional
        const botReply = await aiService.generateConversationalResponse(message, user.nombre, userData);

        // 3. Devolvemos la respuesta de la IA
        res.status(200).json({ reply: botReply });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el mensaje.' });
    }
};