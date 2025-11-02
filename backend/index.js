const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
require('dotenv').config();

// [CORRECCIÓN] Añadidos los 'requires' para el servidor de Sockets
const http = require('http');
const { Server } = require('socket.io');

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
const userRoutes = require('./routes/userRoutes'); // Ruta de usuarios

// --- FUNCIÓN PARA INICIALIZAR LA BASE DE DATOS (PostgreSQL) ---
async function initializeDatabase() {
  console.log('Verificando la estructura de la base de datos (PostgreSQL)...');
  try {
    // Consulta 100% limpiada de caracteres invisibles
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

      CREATE TABLE IF NOT EXISTS mensajes (
        id SERIAL PRIMARY KEY,
        sender_id INT NOT NULL,
        receiver_id INT NOT NULL,
        contenido TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (sender_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES usuarios(id) ON DELETE CASCADE
      );
    `;

    await pool.query(createTablesQuery);

    /* --- Alterar 'usuarios' para añadir foto de perfil (se ejecuta por separado) --- */
    try {
      await pool.query(
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil_url VARCHAR(255) DEFAULT 'https://placehold.co/100x100/E0E0E0/121212?text=User'"
      );
      console.log("✅ Columna 'foto_perfil_url' verificada/añadida a 'usuarios'.");
    } catch (alterError) {
      // Si la columna ya existe (código '42701' en PG), no es un error real.
      if (alterError.code !== '42701') {
        console.warn("Advertencia al alterar tabla 'usuarios':", alterError.message);
      }
    }

    console.log('✅ Estructura de la base de datos verificada/creada con éxito.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos (PostgreSQL):', error);
    // Si la conexión falla aquí, la aplicación no podrá continuar
    process.exit(1);
  }
}

// 1. Crear la aplicación Express
const app = express();

// --- 2. [CORRECCIÓN] Envolver 'app' en el servidor HTTP y configurar Socket.io ---
const server = http.createServer(app); // Creamos un servidor HTTP nativo
const io = new Server(server, {
  cors: {
    origin: '*', // Permite todas las conexiones
    methods: ['GET', 'POST'],
  },
});

// --- 3. Usar los middlewares ---
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// --- Servir archivos estáticos (uploads) ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- [NUEVO MIDDLEWARE] Hacemos que 'io' sea accesible en todas las rutas (req.io) ---
app.use((req, res, next) => {
  req.io = io;
  next();
});
// -------------------------------------------------------------------------

// 4. Importar y usar las rutas
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public-chat', publicChatRoutes);
app.use('/api/users', userRoutes);

// --- Ruta de prueba (opcional) ---
app.get('/', (req, res) => {
  res.send('Servidor Gestor IA operativo.');
});

// --- Manejo de errores 404 ---
app.use((req, res, next) => {
  res.status(404).json({ message: 'Ruta no encontrada' });
});

// --- Lógica de Socket.io (Chat de Amigos) ---
io.on('connection', (socket) => {
  console.log('Un usuario se conectó:', socket.id);

  // Unir a un "room" privado basado en su ID de usuario
  socket.on('join_room', (userId) => {
    socket.join(userId.toString());
    console.log(`Usuario con ID: ${userId} se unió al room: ${userId}`);
  });

  // Escuchar un mensaje privado
  socket.on('send_private_message', async (data) => {
    // data = { sender_id, receiver_id, contenido }

    // 1. Guardar en la BD (en la tabla 'mensajes')
    try {
      const insertQuery =
        'INSERT INTO mensajes (sender_id, receiver_id, contenido) VALUES ($1, $2, $3)';
      await pool.query(insertQuery, [
        data.sender_id,
        data.receiver_id,
        data.contenido,
      ]);

      // 2. Enviar al destinatario (si está conectado)
      io.to(data.receiver_id.toString()).emit('receive_private_message', data);
    } catch (dbError) {
      console.error('Error al guardar mensaje en la BD:', dbError);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});

// 5. Iniciar el servidor
const PORT = process.env.PORT || 10000;

// Envuelve el arranque para asegurar la inicialización de la BD
(async () => {
  try {
    // Ejecuta la inicialización antes de empezar a escuchar peticiones
    await initializeDatabase();

    // [CORRECCIÓN] Usar server.listen (que incluye app + socket.io)
    server.listen(PORT, () => {
      console.log(`🚀 Servidor Express y Socket.io corriendo en el puerto ${PORT}`);
      // Iniciar el programador de tareas
      schedulerService.startScheduler();
    });
  } catch (err) {
    console.error('❌ Fallo crítico al iniciar el servidor Express:', err);
    process.exit(1);
  }
})();

module.exports = app;
