const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    // --- CONEXIÓN PARA PRODUCCIÓN (RENDER / POSTGRESQL) ---
    // Render proporciona DATABASE_URL automáticamente.
    // Usamos el módulo 'pg' para PostgreSQL.
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('✅ Connected to production database (PostgreSQL).');
} else {
    // --- CONEXIÓN PARA DESARROLLO LOCAL (XAMPP / MYSQL) ---
    // Usamos el módulo 'mysql2' para MySQL.
    const mysql = require('mysql2/promise');
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_tareas_db',
    });
    console.log('✅ Connected to local database (MySQL).');
}

module.exports = pool;