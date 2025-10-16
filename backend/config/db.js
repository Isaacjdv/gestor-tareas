const { Pool } = require('pg');
require('dotenv').config();

let pool;

if (process.env.DATABASE_URL) {
    // This runs in production (on Render)
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false
        }
    });
    console.log('✅ Connected to production database (PostgreSQL).');
} else {
    // This runs on your local computer (XAMPP)
    // Make sure you have mysql2 installed: npm install mysql2
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