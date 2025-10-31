const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');
const pool = require('../config/db'); // Necesario para la versión de updateFileDetails

// Lógica para subir un archivo
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Por favor, selecciona un archivo.' });
        }

        const { originalname, path, mimetype } = req.file;
        const { folderId } = req.params;
        const { id: userId } = req.user; // Tomamos 'id' de req.user y lo renombramos a userId

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

// [NUEVO] Lógica para obtener TODOS los archivos de un usuario
exports.getAllUserFiles = async (req, res) => {
    try {
        const { id: usuario_id } = req.user; // Obtenemos el ID del usuario logueado
        const files = await fileModel.findAllByUserId(usuario_id);
        res.status(200).json(files);
    } catch (error) {
        console.error("Error en getAllUserFiles:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener todos los archivos.' });
    }
};

// Actualizar el nombre de un archivo
exports.updateFile = async (req, res) => {
    try {
        const { nombre_original } = req.body;
        const { id } = req.params;
        await fileModel.update(id, nombre_original);
        res.status(200).json({ message: 'Nombre del archivo actualizado con éxito.' });
    } catch (error) {
        console.error("Error en updateFile:", error);
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
            // __dirname es 'controllers', subimos un nivel '..' y luego a 'uploads'
            const filePath = path.join(__dirname, '..', file.path_archivo);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // 3. Borrar el registro de la base de datos
        await fileModel.remove(id);

        res.status(200).json({ message: 'Archivo eliminado con éxito.' });
    } catch (error) {
        console.error("Error en deleteFile:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};


// [NUEVO] Lógica para actualizar estado y nota
exports.updateFileDetails = async (req, res) => {
    const { id } = req.params;
    const { status, nota } = req.body;
    const { id: usuario_id } = req.user; // Asumiendo que authMiddleware te da esto

    // 1. Validar inputs
    const allowedStatus = ['pending', 'in_process', 'done'];
    if (status && !allowedStatus.includes(status)) {
        return res.status(400).json({ message: 'Status no válido' });
    }

    if (status === undefined && nota === undefined) {
         return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
    }

    try {
        // 2. Llamar al modelo
        const updatedFile = await fileModel.updateDetails(id, usuario_id, { status, nota });

        if (!updatedFile) {
            return res.status(404).json({ message: 'Archivo no encontrado o no autorizado' });
        }

        // 3. Enviar respuesta
        res.json(updatedFile);

    } catch (error) {
        console.error('Error al actualizar detalles del archivo:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
