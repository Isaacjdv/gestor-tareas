const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./config/db');
const schedulerService = require('./services/schedulerService');

// --- FUNCIÓN PARA INICIALIZAR LA BASE DE DATOS ---
async function initializeDatabase() {
    console.log("Verificando la estructura de la base de datos...");
    try {
        const createTablesQuery = `
            CREATE TABLE IF NOT EXISTS usuarios (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                email VARCHAR(100) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                whatsapp_number VARCHAR(25) UNIQUE,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS carpetas (
                id SERIAL PRIMARY KEY,
                nombre VARCHAR(100) NOT NULL,
                usuario_id INT,
                parent_id INT NULL DEFAULT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                FOREIGN KEY (parent_id) REFERENCES carpetas(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS archivos (
                id SERIAL PRIMARY KEY,
                nombre_original VARCHAR(255) NOT NULL,
                path_archivo VARCHAR(255) NOT NULL,
                tipo_mime VARCHAR(100),
                carpeta_id INT,
                usuario_id INT,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (carpeta_id) REFERENCES carpetas(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );

            -- TABLA DE RECORDATORIOS FINAL (Unificada) --
            CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                usuario_id INT NOT NULL,
                recipient_whatsapp_number VARCHAR(25) NOT NULL,
                message TEXT NOT NULL,
                trigger_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- pending, sent, error
                task_type VARCHAR(50) DEFAULT 'simple', -- 'simple' o 'investigation'
                user_name VARCHAR(100), -- Para el encabezado del PDF
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `;
        await pool.query(createTablesQuery);
        console.log("✅ Tablas base verificadas/creadas con éxito.");

        // --- [NUEVO] MIGRACIÓN AUTOMÁTICA DE LA TABLA 'archivos' ---
        // Esto añade las columnas SÓLO SI NO EXISTEN, por lo que es seguro ejecutarlo siempre.
        console.log("Verificando columnas 'status' y 'nota' en la tabla 'archivos'...");
        
        const alterArchivosQuery = `
            ALTER TABLE archivos
            ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS nota TEXT;
        `;
        
        await pool.query(alterArchivosQuery);
        console.log("✅ Tabla 'archivos' actualizada con 'status' y 'nota'.");
        console.log("✅ Estructura de la base de datos verificada/creada con éxito.");

    } catch (error) {
        console.error("❌ Error al inicializar la base de datos:", error);
    }
}

// 1. Crear la aplicación Express
const app = express();

// 2. Usar los middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/uploads', express.static('uploads'));

// 3. Importar y usar las rutas
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const fileRoutes = require('./routes/fileRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const chatRoutes = require('./routes/chatRoutes');
const publicChatRoutes = require('./routes/publicChatRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public-chat', publicChatRoutes);

// 4. Iniciar el servidor
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
    initializeDatabase();
    schedulerService.startScheduler();
});