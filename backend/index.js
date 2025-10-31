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
                
                -- --- NUEVOS CAMPOS PARA SEMAFORIZACIÓN --- --
                status VARCHAR(20) DEFAULT 'pending',
                nota TEXT,
                -- --- FIN DE NUEVOS CAMPOS --- --
                
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
        
        // Ejecuta la creación de tablas (CREATE TABLE IF NOT EXISTS)
        await pool.query(createTablesQuery);
        
        // --- Lógica para añadir columnas si 'archivos' ya existe sin ellas ---
        // Esto evita errores si la tabla ya fue creada sin las nuevas columnas
        try {
            await pool.query("ALTER TABLE archivos ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'");
            console.log("Columna 'status' verificada/añadida a 'archivos'.");
        } catch (e) {
            // Ignorar el error si la columna ya existe (código '42701' en PostgreSQL)
            if (e.code !== '42701') { 
                console.error("Error al añadir columna 'status':", e.message);
            }
        }
        
        try {
            await pool.query("ALTER TABLE archivos ADD COLUMN IF NOT EXISTS nota TEXT");
            console.log("Columna 'nota' verificada/añadida a 'archivos'.");
        } catch (e) {
            if (e.code !== '42701') {
                console.error("Error al añadir columna 'nota':", e.message);
            }
        }
        
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

