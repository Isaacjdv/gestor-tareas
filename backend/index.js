const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config();

// Cargar pool de la BD
const pool = require('./config/db');

// Importar servicios y rutas
const schedulerService = require('./services/schedulerService');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const publicChatRoutes = require('./routes/publicChatRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');


// --- FUNCIÓN PARA INICIALIZAR LA BASE DE DATOS (PostgreSQL) ---
async function initializeDatabase() {
    console.log("Verificando la estructura de la base de datos (PostgreSQL)...");
    try {
        // Utilizamos una sola consulta para crear todas las tablas si no existen
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
                status VARCHAR(20) DEFAULT 'pending',
                nota TEXT,
                FOREIGN KEY (carpeta_id) REFERENCES carpetas(id) ON DELETE CASCADE,
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS reminders (
                id SERIAL PRIMARY KEY,
                usuario_id INT NOT NULL,
                recipient_whatsapp_number VARCHAR(25) NOT NULL,
                message TEXT NOT NULL,
                trigger_at TIMESTAMPTZ NOT NULL,
                status VARCHAR(20) DEFAULT 'pending',
                task_type VARCHAR(50) DEFAULT 'simple',
                user_name VARCHAR(100),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
            );
        `;
        
        await pool.query(createTablesQuery);
        console.log("✅ Estructura de la base de datos verificada/creada con éxito.");
    } catch (error) {
        console.error("❌ Error al inicializar la base de datos (PostgreSQL):", error);
        // Si la conexión falla aquí, la aplicación no podrá continuar
        process.exit(1);
    }
}


// 1. Crear la aplicación Express
const app = express();

// --- 2. Usar los middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Servir archivos estáticos (uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// 3. Importar y usar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public-chat', publicChatRoutes);


// --- Ruta de prueba (opcional) ---
app.get('/', (req, res) => {
    res.send('Servidor Gestor IA operativo.');
});

// --- Manejo de errores 404 ---
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});


// 4. Iniciar el servidor
const PORT = process.env.PORT || 10000;

// Envuelve el arranque para asegurar la inicialización de la BD
(async () => {
    try {
        // Ejecuta la inicialización antes de empezar a escuchar peticiones
        await initializeDatabase();

        app.listen(PORT, () => {
            console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
            // Iniciar el programador de tareas
            schedulerService.startScheduler();
        });
    } catch (err) {
        console.error("❌ Fallo crítico al iniciar el servidor Express:", err);
        process.exit(1);
    }
})();

module.exports = app;
