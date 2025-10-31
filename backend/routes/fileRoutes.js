const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// --- RUTA NUEVA: Obtener TODOS los archivos del usuario (para la vista "Home")
// IMPORTANTE: Esta debe ir PRIMERO para que no se confunda con el ID de una carpeta
router.get('/', authMiddleware, fileController.getAllFiles);

// Ruta para obtener archivos de una carpeta específica
router.get('/:folderId', authMiddleware, fileController.getFilesByFolder);

// Ruta para subir un archivo a una carpeta específica
router.post(
    '/:folderId/upload', 
    authMiddleware, 
    upload.single('file'), 
    fileController.uploadFile
);

// Ruta para actualizar el nombre de un archivo
router.put('/:id', authMiddleware, fileController.updateFile);

// Ruta para eliminar un archivo
router.delete('/:id', authMiddleware, fileController.deleteFile);

// --- RUTA NUEVA: Actualizar status y nota de un archivo (PATCH) ---
router.patch('/:id/details', authMiddleware, fileController.updateFileDetails);

module.exports = router;