const pool = require('../config/db');

// Crear un nuevo archivo
const create = async (fileData) => {
    const { nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id } = fileData;
    // El status 'pending' y nota 'null' se aplican por defecto gracias a la DB
    const query = `
        INSERT INTO archivos (nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [nombre_original, path_archivo, tipo_mime, carpeta_id, usuario_id]);
    return rows[0];
};

// Encontrar archivos por ID de carpeta
const findByFolderId = async (carpeta_id) => {
    const query = 'SELECT * FROM archivos WHERE carpeta_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [carpeta_id]);
    return rows;
};

// [NUEVO] Encontrar TODOS los archivos por ID de usuario
const findAllByUserId = async (usuario_id) => {
    const query = 'SELECT * FROM archivos WHERE usuario_id = $1 ORDER BY created_at DESC';
    const { rows } = await pool.query(query, [usuario_id]);
    return rows;
};

// Encontrar un archivo por su ID
const findById = async (id) => {
    const query = 'SELECT * FROM archivos WHERE id = $1';
    const { rows } = await pool.query(query, [id]);
    return rows[0];
};

// Actualizar el nombre de un archivo
const update = async (id, nombre_original) => {
    const query = 'UPDATE archivos SET nombre_original = $1 WHERE id = $2 RETURNING *';
    const { rows } = await pool.query(query, [nombre_original, id]);
    return rows[0];
};

// [NUEVO] Actualizar los detalles (status y nota) de un archivo
const updateDetails = async (id, usuario_id, details) => {
    const { status, nota } = details;

    let query;
    let queryParams;

    if (status !== undefined && nota !== undefined) {
        query = 'UPDATE archivos SET status = $1, nota = $2 WHERE id = $3 AND usuario_id = $4 RETURNING *';
        queryParams = [status, nota, id, usuario_id];
    } else if (status !== undefined) {
        query = 'UPDATE archivos SET status = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *';
        queryParams = [status, id, usuario_id];
    } else if (nota !== undefined) {
        query = 'UPDATE archivos SET nota = $1 WHERE id = $2 AND usuario_id = $3 RETURNING *';
        queryParams = [nota, id, usuario_id];
    } else {
        return null; // No hay nada que actualizar
    }

    const { rows } = await pool.query(query, queryParams);
    return rows[0];
};


// Eliminar un archivo
const remove = async (id) => {
    const query = 'DELETE FROM archivos WHERE id = $1';
    await pool.query(query, [id]);
};

module.exports = {
    create,
    findByFolderId,
    findAllByUserId, // <--- NUEVO
    findById,
    update,
    updateDetails, // <--- NUEVO
    remove
};
