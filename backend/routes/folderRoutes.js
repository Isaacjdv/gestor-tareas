const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');

// GET /api/folders - Obtener todas las carpetas del usuario
// (Esta ruta asume que getFolders también maneja la lógica de parent_id)
router.get('/', authMiddleware, folderController.getFolders);

// POST /api/folders - Crear una nueva carpeta
router.post('/', authMiddleware, folderController.createFolder);

// PUT /api/folders/:id -> Actualizar una carpeta
router.put('/:id', authMiddleware, folderController.updateFolder);

// DELETE /api/folders/:id -> Eliminar una carpeta
router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;

