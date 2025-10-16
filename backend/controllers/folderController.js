const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');

/**
 * @desc    Obtener carpetas (principales o subcarpetas) del usuario
 * @route   GET /api/folders?parentId=...
 * @access  Private
 */
exports.getFolders = async (req, res) => {
    try {
        // Si la URL tiene un ?parentId=ID, lo usamos. Si no, es null (carpetas raíz).
        const parentId = req.query.parentId || null;
        const folders = await folderModel.findByParentId(req.user.userId, parentId);
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
        // El frontend ahora puede enviar 'nombre' y opcionalmente 'parentId'
        const { nombre, parentId } = req.body;

        if (!nombre || nombre.trim() === '') {
            return res.status(400).json({ message: 'El nombre de la carpeta es requerido.' });
        }
        
        const newFolder = await folderModel.create(nombre.trim(), req.user.userId, parentId);
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
        await folderModel.update(id, nombre);
        res.status(200).json({ message: 'Carpeta actualizada con éxito.' });
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

        // NOTA: La base de datos se encarga de borrar en cascada gracias al 'ON DELETE CASCADE'.
        // Sin embargo, aún debemos borrar los archivos físicos si es necesario.
        // Esta lógica puede volverse más compleja con subcarpetas y requerir recursividad.
        // Por simplicidad, por ahora solo borramos la carpeta de la base de datos.
        
        await folderModel.remove(id);
        
        res.status(200).json({ message: 'Carpeta eliminada con éxito.' });
    } catch (error) {
        console.error('Error al eliminar carpeta:', error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};