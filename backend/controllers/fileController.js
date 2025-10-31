const fileModel = require('../models/fileModel');
const fs = require('fs');
const path = require('path');
// No necesitamos 'pool' aquí si el modelo lo maneja, pero lo dejo por si acaso lo usas en otra función no mostrada
// const pool = require('../config/db'); 

// Lógica para subir un archivo
exports.uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Por favor, selecciona un archivo.' });
        }

        const { originalname, path: filePath, mimetype } = req.file;
        const { folderId } = req.params;
        const { id: usuario_id } = req.user; // Usamos req.user.id del JWT

        const fileData = {
            nombre_original: originalname,
            path_archivo: filePath,
            tipo_mime: mimetype,
            carpeta_id: folderId,
            usuario_id: usuario_id // Usamos el ID del JWT
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

// [AÑADIDO] Lógica para obtener TODOS los archivos de un usuario (para Mi Área)
exports.getAllUserFiles = async (req, res) => {
    try {
        const { id: usuario_id } = req.user;
        const files = await fileModel.findAllByUserId(usuario_id);
        res.status(200).json(files);
    } catch (error) {
        console.error("Error en getAllUserFiles:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener todos los archivos.' });
    }
};


// Actualizar un archivo (solo nombre)
exports.updateFile = async (req, res) => {
    try {
        const { nombre_original } = req.body;
        const { id } = req.params;
        // Asumimos que la verificación de propiedad se hace en el modelo para el update,
        // o que se hará en un controlador más robusto, por ahora solo llamamos al update del modelo
        const updatedFile = await fileModel.update(id, nombre_original);
        if (!updatedFile) {
            return res.status(404).json({ message: 'Archivo no encontrado.' });
        }
        res.status(200).json({ message: 'Nombre del archivo actualizado con éxito.', file: updatedFile });
    } catch (error) {
        console.error("Error en updateFile:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// Eliminar un archivo
exports.deleteFile = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: usuario_id } = req.user;

        // 1. Encontrar la ruta del archivo en la BD y verificar propiedad
        const file = await fileModel.findById(id);
        if (!file || file.usuario_id !== usuario_id) {
             // Es importante verificar la propiedad antes de borrar
             return res.status(403).json({ message: 'No autorizado para eliminar este archivo.' });
        }

        // 2. Borrar el archivo físico
        if (file.path_archivo) {
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

// [AÑADIDO] Lógica para actualizar estado y nota
exports.updateFileDetails = async (req, res) => {
    const { id } = req.params;
    const { status, nota } = req.body;
    const { id: usuario_id } = req.user;

    const allowedStatus = ['pending', 'in_process', 'done'];
    if (status && !allowedStatus.includes(status)) {
        return res.status(400).json({ message: 'Status no válido' });
    }

    if (status === undefined && nota === undefined) {
         return res.status(400).json({ message: 'No se proporcionaron datos para actualizar' });
    }

    try {
        // Llama al modelo (que ya maneja la verificación de usuario)
        const updatedFile = await fileModel.updateDetails(id, usuario_id, { status, nota });

        if (!updatedFile) {
            return res.status(404).json({ message: 'Archivo no encontrado o no autorizado' });
        }

        res.json(updatedFile);

    } catch (error) {
        console.error('Error al actualizar detalles del archivo:', error);
        res.status(500).json({ message: 'Error del servidor' });
    }
};
