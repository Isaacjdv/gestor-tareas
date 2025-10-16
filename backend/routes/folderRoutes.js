const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const authMiddleware = require('../middleware/authMiddleware');

// La forma correcta de aplicar el middleware es pasarlo como un argumento
// ANTES del controlador que ejecutará la lógica final.

// GET /api/folders - Obtener todas las carpetas del usuario
router.get('/', authMiddleware, folderController.getFolders);

// ... (rutas GET y POST existentes)
router.get('/', authMiddleware, folderController.getFolders);
router.post('/', authMiddleware, folderController.createFolder);

// POST /api/folders - Crear una nueva carpeta
router.post('/', authMiddleware, folderController.createFolder);

// --- NUEVAS RUTAS ---
// PUT /api/folders/:id -> Actualizar una carpeta
router.put('/:id', authMiddleware, folderController.updateFolder);

// DELETE /api/folders/:id -> Eliminar una carpeta
router.delete('/:id', authMiddleware, folderController.deleteFolder);

module.exports = router;