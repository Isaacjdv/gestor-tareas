const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');

// Lógica para subir un archivo
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Por favor, selecciona un archivo.' });
        }

        const { originalname, path, mimetype } = req.file;
        const { folderId } = req.params;
        const { userId } = req.user;

        const fileData = {
            nombre_original: originalname,
            path_archivo: path,
            tipo_mime: mimetype,
            carpeta_id: folderId,
            usuario_id: userId
        };

        const newFile = await fileModel.create(fileData);
        res.status(201).json({ message: 'Archivo subido con éxito.', file: newFile });

    } catch (error) {
        console.error("Error en uploadFile:", error);
        res.status(500).json({ message: 'Error en el servidor al subir el archivo.' });
    }
};

// Lógica para obtener los archivos de una carpeta
exports.getFilesByFolder = async (req, res) => {
    try {
        const { folderId } = req.params;
        const files = await fileModel.findByFolderId(folderId);
        res.status(200).json(files);
    } catch (error) {
        console.error("Error en getFilesByFolder:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener archivos.' });
    }
};




// Actualizar un archivo
exports.updateFile = async (req, res) => {
    try {
        const { nombre_original } = req.body;
        const { id } = req.params;
        await fileModel.update(id, nombre_original);
        res.status(200).json({ message: 'Nombre del archivo actualizado con éxito.' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// Eliminar un archivo
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Encontrar la ruta del archivo en la BD
        const file = await fileModel.findById(id);
        if (file) {
            // 2. Borrar el archivo físico
            const filePath = path.join(__dirname, '..', file.path_archivo);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 3. Borrar el registro de la base de datos
        await fileModel.remove(id);

        res.status(200).json({ message: 'Archivo eliminado con éxito.' });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};