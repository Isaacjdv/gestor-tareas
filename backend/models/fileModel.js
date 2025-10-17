const db = require('../config/db');

// Crear una nueva entrada de archivo (PostgreSQL)
exports.create = async (fileData) => {
    const { nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id } = fileData;
    const { rows } = await db.query(
        'INSERT INTO archivos (nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id]
    );
    return { id: rows[0].id, ...fileData };
};

// Encontrar todos los archivos de una carpeta (PostgreSQL)
exports.findByFolderId = async (carpeta_id) => {
    const { rows } = await db.query('SELECT * FROM archivos WHERE carpeta_id = $1 ORDER BY created_at DESC', [carpeta_id]);
    return rows;
};

// Encontrar un archivo por su ID (PostgreSQL)
exports.findById = async (id) => {
    const { rows } = await db.query('SELECT * FROM archivos WHERE id = $1', [id]);
    return rows[0];
};

// Actualizar el nombre de un archivo (PostgreSQL)
exports.update = async (id, nombre_original) => {
    const { rowCount } = await db.query('UPDATE archivos SET nombre_original = $1 WHERE id = $2', [nombre_original, id]);
    return rowCount > 0;
};

// Eliminar un archivo (PostgreSQL)
exports.remove = async (id) => {
    const { rowCount } = await db.query('DELETE FROM archivos WHERE id = $1', [id]);
    return rowCount > 0;
};

// Encontrar todos los archivos de un usuario (PostgreSQL)
exports.findAllByUserId = async (usuario_id) => {
    const { rows } = await db.query('SELECT * FROM archivos WHERE usuario_id = $1', [usuario_id]);
    return rows;
};

// Encontrar un archivo por su nombre y el ID del usuario (insensible a mayúsculas)
exports.findByNameAndUserId = async (nombre_original, usuario_id) => {
    const cleanName = nombre_original.split('.')[0].trim();
    const { rows } = await db.query(
        'SELECT * FROM archivos WHERE nombre_original ILIKE $1 AND usuario_id = $2 ORDER BY created_at DESC',
        [`${cleanName}%`, usuario_id]
    );
    return rows[0];
};

// Encontrar el archivo más reciente de un usuario (PostgreSQL)
exports.findLatestByUserId = async (usuario_id) => {
    const { rows } = await db.query(
        'SELECT * FROM archivos WHERE usuario_id = $1 ORDER BY created_at DESC LIMIT 1',
        [usuario_id]
    );
    return rows[0];
};

// Contar archivos de un tipo específico en una carpeta (PostgreSQL)
exports.countByTypeInFolder = async (carpeta_id, mimeTypePrefix) => {
    const { rows } = await db.query(
        'SELECT COUNT(*) as count FROM archivos WHERE carpeta_id = $1 AND tipo_mime LIKE $2',
        [carpeta_id, `${mimeTypePrefix}%`]
    );
    return parseInt(rows[0].count, 10);
};