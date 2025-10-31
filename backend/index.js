const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const pool = require('./config/db'); // Importado el pool de conexión

// Cargar variables de entorno
dotenv.config();

// Importar servicios y rutas
const schedulerService = require('./services/schedulerService');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const publicChatRoutes = require('./routes/publicChatRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

// --- FUNCIÓN PARA INICIALIZAR LA BASE DE DATOS (Recuperado y Corregido) ---
async function initializeDatabase() {
    // Utilizamos la propiedad client.isPostgres para saber si estamos en PostgreSQL o MySQL
    if (pool.options && pool.options.ssl) { 
        // Lógica específica para PostgreSQL (Producción/Render)
        console.log("Verificando la estructura de la base de datos (PostgreSQL)...");
        try {
            const createTablesQuery = `
                -- Tabla Usuarios
                CREATE TABLE IF NOT EXISTS usuarios (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    email VARCHAR(100) NOT NULL UNIQUE,
                    password VARCHAR(255) NOT NULL,
                    whatsapp_number VARCHAR(25) UNIQUE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );

                -- Tabla Carpetas
                CREATE TABLE IF NOT EXISTS carpetas (
                    id SERIAL PRIMARY KEY,
                    nombre VARCHAR(100) NOT NULL,
                    usuario_id INT,
                    parent_id INT NULL DEFAULT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
                    FOREIGN KEY (parent_id) REFERENCES carpetas(id) ON DELETE CASCADE
                );

                -- Tabla Archivos
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

                -- Tabla Recordatorios
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
            console.log("✅ Estructura de la base de datos (PostgreSQL) verificada/creada con éxito.");
        } catch (error) {
            console.error("❌ Error al inicializar la base de datos (PostgreSQL):", error);
        }
    } else {
        // Lógica para MySQL (Desarrollo local)
        console.log("La inicialización automática de tablas para MySQL se omite. Por favor, asegúrate de que las tablas existan manualmente.");
    }
}


const app = express();

// --- Middleware ---
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// --- Servir archivos estáticos (uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Montar Rutas de la API ---
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/public-chat', publicChatRoutes); // <-- Ruta de Chat Público Habilitada
app.use('/whatsapp', whatsappRoutes);

// --- Ruta de prueba ---
app.get('/', (req, res) => {
    res.send('Servidor Gestor IA operativo.');
});

// --- Manejo de errores 404 ---
app.use((req, res, next) => {
    res.status(404).json({ message: 'Ruta no encontrada' });
});

// --- Inicio del Servidor ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
    console.log(`🚀 Servidor Express corriendo en el puerto ${PORT}`);
    // Verificar e inicializar la base de datos
    await initializeDatabase();
    // Iniciar el programador de tareas
    schedulerService.startScheduler();
});

module.exports = app;
