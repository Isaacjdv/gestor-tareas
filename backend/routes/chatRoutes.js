const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const authMiddleware = require('../middleware/authMiddleware');

// Ruta para el chat de la IA (Dashboard)
// POST /api/chat
router.post('/', authMiddleware, chatController.handleChatMessage);

// [NUEVA RUTA AÑADIDA]
// Ruta para obtener el historial de chat con otro usuario
// GET /api/chat/history/123 (donde 123 es el ID del OTRO usuario)
router.get('/history/:otherUserId', authMiddleware, chatController.getChatHistory);


module.exports = router;