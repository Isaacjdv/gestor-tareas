const folderModel = require('../models/folderModel');

/**
 * @desc    Obtener carpetas (principales o subcarpetas) del usuario
 * @route   GET /api/folders?parentId=...
 * @access  Private
 */
exports.getFolders = async (req, res) => {
    try {
        // Si la URL tiene un ?parentId=ID, lo usamos. Si no, es null (carpetas raíz).
        // PERO, tu ruta GET '/' no maneja query params todavía.
        // Vamos a asumir que por ahora solo pide las carpetas raíz (parentId = null)
        const parentId = req.query.parentId || null;
        const { id: usuario_id } = req.user; // Tomamos el ID del middleware auth

        const folders = await folderModel.findByParentId(usuario_id, parentId);
        res.status(200).json(folders);
    } catch (error) {
        console.error('Error al obtener carpetas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las carpetas.' });
    }
};

/**
 * @desc    Crear una nueva carpeta (principal o subcarpeta)
 * @route   POST /api/folders
 * @access  Private
 */
exports.createFolder = async (req, res) => {
    try {
        const { nombre, parentId } = req.body; // parentId puede ser null
        const { id: usuario_id } = req.user;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la carpeta es requerido.' });
        }
        
        const newFolder = await folderModel.create(nombre.trim(), usuario_id, parentId);
        res.status(201).json(newFolder);
    } catch (error) {
        console.error('Error al crear carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor al crear la carpeta.' });
    }
};

/**
 * @desc    Actualizar el nombre de una carpeta
 * @route   PUT /api/folders/:id
 * @access  Private
 */
exports.updateFolder = async (req, res) => {
    try {
        const { nombre } = req.body;
        const { id } = req.params;
        const { id: usuario_id } = req.user;

        // Lógica de validación (asegurarse de que el usuario es dueño)
        const folder = await folderModel.findById(id); // Necesitarás crear esta función en tu modelo
        if (!folder) {
            return res.status(404).json({ message: 'Carpeta no encontrada.' });
        }
        if (folder.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'No autorizado.' });
        }

        const updatedFolder = await folderModel.update(id, nombre);
        res.status(200).json({ message: 'Carpeta actualizada con éxito.', folder: updatedFolder });
    } catch (error) {
        console.error('Error al actualizar carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

/**
 * @desc    Eliminar una carpeta y todo su contenido en cascada
 * @route   DELETE /api/folders/:id
 * @access  Private
 */
exports.deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: usuario_id } = req.user;

        // Lógica de validación
        const folder = await folderModel.findById(id); // Necesitarás crear esta función en tu modelo
        if (!folder) {
            return res.status(404).json({ message: 'Carpeta no encontrada.' });
        }
        if (folder.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'No autorizado.' });
        }

        // ON DELETE CASCADE se encargará de borrar subcarpetas y archivos en la BD
        await folderModel.remove(id);
        
        res.status(200).json({ message: 'Carpeta eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};
