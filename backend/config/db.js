const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    // Conexión para producción (Render)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('✅ Conectado a la base de datos de producción (PostgreSQL).');
} else {
    // Conexión para desarrollo local (XAMPP - MySQL)
    // ¡Necesitas instalar mysql2 para que esto funcione en local! npm install mysql2
    const mysql = require('mysql2/promise');
    pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_tareas_db',
    });
    console.log('✅ Conectado a la base de datos local (MySQL).');
}

module.exports = pool;