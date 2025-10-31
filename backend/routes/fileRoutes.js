const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// [NUEVO] GET /api/files/user/all -> Obtiene TODOS los archivos del usuario
// (Debe ir ANTES de /:folderId para que no confunda "user" con un ID)
router.get('/user/all', authMiddleware, fileController.getAllUserFiles);

// GET /api/files/:folderId -> Obtiene los archivos de UNA carpeta
router.get('/:folderId', authMiddleware, fileController.getFilesByFolder);

// POST /api/files/:folderId/upload -> Sube un archivo a una carpeta
router.post(
    '/:folderId/upload', 
    authMiddleware, 
    upload.single('file'), 
    fileController.uploadFile
);

// PUT /api/files/:id -> Actualizar el nombre de un archivo
router.put('/:id', authMiddleware, fileController.updateFile);

// DELETE /api/files/:id -> Eliminar un archivo
router.delete('/:id', authMiddleware, fileController.deleteFile);

// [NUEVO] PUT /api/files/:id/details -> Actualizar el estado (status) y/o la nota
router.put('/:id/details', authMiddleware, fileController.updateFileDetails);


// ¡IMPORTANTE! module.exports SIEMPRE debe ir al final del archivo
module.exports = router;
