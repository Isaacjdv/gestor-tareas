const db = require('../config/db');

// Crear una nueva entrada de archivo
exports.create = async (fileData) => {
    const { nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id } = fileData;
    const [result] = await db.query(
        'INSERT INTO archivos (nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id) VALUES (?, ?, ?, ?, ?)',
        [nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id]
    );
    return { id: result.insertId, ...fileData };
};

// Encontrar todos los archivos de una carpeta
exports.findByFolderId = async (carpeta_id) => {
    const [rows] = await db.query('SELECT * FROM archivos WHERE carpeta_id = ? ORDER BY created_at DESC', [carpeta_id]);
    return rows;
};

// Encontrar un archivo por su ID
exports.findById = async (id) => {
    const [rows] = await db.query('SELECT * FROM archivos WHERE id = ?', [id]);
    return rows[0];
};

// Actualizar el nombre de un archivo
exports.update = async (id, nombre_original) => {
    const [result] = await db.query('UPDATE archivos SET nombre_original = ? WHERE id = ?', [nombre_original, id]);
    return result.affectedRows > 0;
};

// Eliminar un archivo
exports.remove = async (id) => {
    const [result] = await db.query('DELETE FROM archivos WHERE id = ?', [id]);
    return result.affectedRows > 0;
};

// Encontrar todos los archivos de un usuario
exports.findAllByUserId = async (usuario_id) => {
    const [rows] = await db.query('SELECT * FROM archivos WHERE usuario_id = ?', [usuario_id]);
    return rows;
};

// Encontrar un archivo por su nombre y el ID del usuario (versión mejorada)
exports.findByNameAndUserId = async (nombre_original, usuario_id) => {
    // Limpiamos el nombre que nos da la IA
    const cleanName = nombre_original.replace('.pdf', '').trim();
    
    // 1. Intentamos una búsqueda exacta primero
    let [rows] = await db.query(
        'SELECT * FROM archivos WHERE nombre_original = ? AND usuario_id = ?',
        [`${cleanName}.pdf`, usuario_id]
    );

    // 2. Si no hay resultado exacto, intentamos una búsqueda más flexible (que empiece con...)
    if (rows.length === 0) {
        [rows] = await db.query(
            'SELECT * FROM archivos WHERE nombre_original LIKE ? AND usuario_id = ? ORDER BY created_at DESC',
            [`${cleanName}%`, usuario_id]
        );
    }
    
    // Devolvemos el primer resultado encontrado
    return rows[0];
};

// Encontrar el archivo más reciente de un usuario
exports.findLatestByUserId = async (usuario_id) => {
    const [rows] = await db.query(
        'SELECT * FROM archivos WHERE usuario_id = ? ORDER BY created_at DESC LIMIT 1',
        [usuario_id]
    );
    return rows[0];
};

// Contar archivos de un tipo específico en una carpeta
exports.countByTypeInFolder = async (carpeta_id, mimeTypePrefix) => {
    const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM archivos WHERE carpeta_id = ? AND tipo_mime LIKE ?',
        [carpeta_id, `${mimeTypePrefix}%`]
    );
    return rows[0].count;
};