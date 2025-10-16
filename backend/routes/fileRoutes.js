const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// GET /api/files/:folderId -> Obtiene los archivos de una carpeta
router.get('/:folderId', authMiddleware, fileController.getFilesByFolder);

// POST /api/files/:folderId/upload -> Sube un archivo a una carpeta
router.post(
    '/:folderId/upload', 
    authMiddleware, 
    upload.single('file'), 
    fileController.uploadFile
);

// ... (rutas GET y POST existentes)
router.get('/:folderId', authMiddleware, fileController.getFilesByFolder);
router.post('/:folderId/upload', authMiddleware, upload.single('file'), fileController.uploadFile);

// --- NUEVAS RUTAS ---
// PUT /api/files/:id -> Actualizar un archivo
router.put('/:id', authMiddleware, fileController.updateFile);

// DELETE /api/files/:id -> Eliminar un archivo
router.delete('/:id', authMiddleware, fileController.deleteFile);

module.exports = router;