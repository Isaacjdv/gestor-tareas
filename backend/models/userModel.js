const db = require('../config/db');

// Crear un nuevo usuario (sintaxis para PostgreSQL)
exports.create = async (nombre, email, password, whatsapp_number) => {
    const query = `
        INSERT INTO usuarios (nombre, email, password, whatsapp_number) 
        VALUES ($1, $2, $3, $4)
        RETURNING id;
    `;
    const values = [nombre, email, password, whatsapp_number];
    const { rows } = await db.query(query, values);
    return { id: rows[0].id };
};

// Encontrar un usuario por su email
exports.findByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0];
};

// Encontrar un usuario por su número de WhatsApp
exports.findByWhatsapp = async (whatsapp_number) => {
    // [¡CORRECCIÓN!] Aquí decía [email] por error. Debe ser [whatsapp_number].
    const { rows } = await db.query('SELECT * FROM usuarios WHERE whatsapp_number = $1', [whatsapp_number]);
    return rows[0];
};

// Encontrar un usuario por su nombre (insensible a mayúsculas)
exports.findByName = async (name) => {
    const { rows } = await db.query(
        'SELECT * FROM usuarios WHERE nombre ILIKE $1',
        [name]
    );
    return rows[0];
};

/**
 * [FUNCIÓN AÑADIDA PARA BUSCAR AMIGOS]
 * Buscar usuarios por nombre o email (excluyendo al usuario actual)
 * Usamos ILIKE para búsquedas 'case-insensitive' en PostgreSQL.
 * Seleccionamos solo los datos públicos.
 */
exports.search = async (searchTerm, currentUserId) => {
    // Consulta SQL limpiada de caracteres invisibles
    const query = `
        SELECT id, nombre, email, foto_perfil_url 
        FROM usuarios
        WHERE (nombre ILIKE $1 OR email ILIKE $1) 
          AND id != $2
        LIMIT 10;
    `;
    // Añadimos '%' para que busque coincidencias parciales (ej: 'pep' encuentra 'pepito')
    const values = [`%${searchTerm}%`, currentUserId];
    const { rows } = await db.query(query, values);
    return rows;
};