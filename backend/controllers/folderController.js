const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Obtener carpetas (principales o subcarpetas) del usuario
 * @route   GET /api/folders?parentId=...
 * @access  Private
 */
exports.getFolders = async (req, res) => {
    try {
        // [CORRECCIÓN CLAVE] Usamos req.user.userId, según tu authController.js
        const usuario_id = req.user.userId; 
        
        const parentId = req.query.parentId || null; 
        
        const folders = await folderModel.findByParentId(usuario_id, parentId);
        res.status(200).json(folders);
    } catch (error) {
        console.error('Error al obtener carpetas:', error);
        res.status(500).json({ message: 'Error en el servidor al obtener las carpetas.' });
    }
};

/**
 * @desc    Crear una nueva carpeta (principal o subcarpeta)
 * @route   POST /api/folders
 * @access  Private
 */
exports.createFolder = async (req, res) => {
    try {
        const { nombre, parentId } = req.body;
        // [CORRECCIÓN CLAVE] Usamos req.user.userId
        const usuario_id = req.user.userId; 

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
 * @desc    Actualizar el nombre de una carpeta
 * @route   PUT /api/folders/:id
 * @access  Private
 */
exports.updateFolder = async (req, res) => {
    try {
        const { nombre } = req.body;
        const { id } = req.params;
        // [CORRECCIÓN CLAVE] Usamos req.user.userId
        const usuario_id = req.user.userId;

        // [SEGURIDAD AÑADIDA] Verificar propiedad antes de actualizar
        const folder = await folderModel.findById(id); 
        if (!folder || folder.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'No autorizado o carpeta no encontrada.' });
        }
        // Fin de verificación

        const updatedFolder = await folderModel.update(id, nombre);
        res.status(200).json({ message: 'Carpeta actualizada con éxito.', folder: updatedFolder });
    } catch (error) {
        console.error('Error al actualizar carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

/**
 * @desc    Eliminar una carpeta y todo su contenido en cascada
 * @route   DELETE /api/folders/:id
 * @access  Private
 */
exports.deleteFolder = async (req, res) => {
    try {
        const { id } = req.params;
        // [CORRECCIÓN CLAVE] Usamos req.user.userId
        const usuario_id = req.user.userId;

        // [SEGURIDAD AÑADIDA] Verificar propiedad antes de eliminar
        const folder = await folderModel.findById(id);
        if (!folder || folder.usuario_id !== usuario_id) {
            return res.status(403).json({ message: 'No autorizado o carpeta no encontrada.' });
        }
        // Fin de verificación

        await folderModel.remove(id);
        
        res.status(200).json({ message: 'Carpeta eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};