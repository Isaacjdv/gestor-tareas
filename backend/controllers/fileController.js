const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');

// Subir un archivo a una carpeta
exports.uploadFile = async (req, res) => {
    try {
        const { folderId } = req.params;
        const { originalname, path: filePath, mimetype } = req.file;

        const fileData = {
            nombre_original: originalname,
            path_archivo: filePath,
            tipo_mime: mimetype,
            carpeta_id: folderId,
            usuario_id: req.user.userId
        };

        const newFile = await fileModel.create(fileData);
        res.status(201).json(newFile);
    } catch (error) {
        console.error("Error en uploadFile:", error);
        res.status(500).json({ message: 'Error en el servidor al subir el archivo.' });
    }
};

// Obtener archivos de una carpeta
exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const files = await fileModel.findByFolderId(folderId);
        res.status(200).json(files);
    } catch (error) {
        console.error("Error en getFilesByFolder:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los archivos.' });
    }
};

// --- FUNCIÓN NUEVA: Obtener TODOS los archivos del usuario (para la vista "Mi Área de Trabajo")
exports.getAllFiles = async (req, res) => {
    try {
        const files = await fileModel.findAllByUserId(req.user.userId);
        res.status(200).json(files);
    } catch (error) {
        console.error("Error en getAllFiles:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener todos los archivos.' });
    }
};

// Actualizar nombre de archivo
exports.updateFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_original } = req.body;
        // La validación de usuario_id ocurre dentro de la función updateDetails
        const updated = await fileModel.update(id, nombre_original); 
        if (updated) {
            res.status(200).json({ message: 'Nombre de archivo actualizado.' });
        } else {
             res.status(404).json({ message: 'Archivo no encontrado.' });
        }
    } catch (error) {
        console.error("Error en updateFile:", error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el archivo.' });
    }
};

// --- FUNCIÓN NUEVA: Actualizar status y nota de un archivo
exports.updateFileDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, nota } = req.body;
        const usuario_id = req.user.userId;

        const detailsToUpdate = {};
        if (status) detailsToUpdate.status = status;
        // Permite que la nota sea un string vacío si se envía
        if (nota !== undefined) detailsToUpdate.nota = nota;

        // Lógica de negocio opcional: si el estado vuelve a 'pending', borramos la nota.
        if (status === 'pending') {
            detailsToUpdate.nota = '';
        }
        
        const updatedFile = await fileModel.updateDetails(id, usuario_id, detailsToUpdate);

        if (!updatedFile) {
            return res.status(404).json({ message: 'Archivo no encontrado o no autorizado.' });
        }
        
        res.status(200).json(updatedFile);

    } catch (error) {
        console.error("Error en updateFileDetails:", error);
        res.status(500).json({ message: 'Error en el servidor al actualizar detalles del archivo.' });
    }
};


// Eliminar un archivo
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        
        // 1. Obtener los datos del archivo para saber su path
        const file = await fileModel.findById(id);
        if (!file) {
            return res.status(404).json({ message: 'Archivo no encontrado.' });
        }

        // 2. (Validación de seguridad) Asegurarse de que el usuario sea el propietario
        if (file.usuario_id !== req.user.userId) {
             return res.status(403).json({ message: 'No autorizado para eliminar este archivo.' });
        }

        // 3. Borrar el archivo físico del servidor
        const filePath = path.join(__dirname, '..', file.path_archivo);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // 4. Borrar el registro de la base de datos
        await fileModel.remove(id);
        
        res.status(200).json({ message: 'Archivo eliminado con éxito.' });
    } catch (error) {
        console.error("Error en deleteFile:", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el archivo.' });
    }
};