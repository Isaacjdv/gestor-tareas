const express = require('express');
const router = express.Router();
const whatsappController = require('../controllers/whatsappController');

router.post('/receive', whatsappController.receiveMessage);

module.exports = router;