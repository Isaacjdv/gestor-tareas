const aiService = require('../services/aiService');

// Esta es la nueva función de IA que debemos crear
exports.handlePublicMessage = async (req, res) => {
    const { message } = req.body;
    try {
        // Llamamos a una nueva función de IA que NO necesita datos de usuario
        const botReply = await aiService.generatePublicResponse(message);
        res.status(200).json({ reply: botReply });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el mensaje.' });
    }
};
