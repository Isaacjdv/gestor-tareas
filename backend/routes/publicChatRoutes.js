const express = require('express');
const router = express.Router();
const publicChatController = require('../controllers/publicChatController');

// Ruta: POST /api/public-chat
router.post('/', publicChatController.handlePublicMessage);

module.exports = router;
