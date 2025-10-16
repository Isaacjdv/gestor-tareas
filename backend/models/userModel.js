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

// Encontrar un usuario por su email (sintaxis para PostgreSQL)
exports.findByEmail = async (email) => {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE email = $1', [email]);
    return rows[0];
};

// Encontrar un usuario por su número de WhatsApp (sintaxis para PostgreSQL)
exports.findByWhatsapp = async (whatsapp_number) => {
    const { rows } = await db.query('SELECT * FROM usuarios WHERE whatsapp_number = $1', [whatsapp_number]);
    return rows[0];
};