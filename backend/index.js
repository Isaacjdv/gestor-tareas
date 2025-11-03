// index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');
const pool = require('./config/db');

// Servicios y rutas
const schedulerService = require('./services/schedulerService');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const fileRoutes = require('./routes/fileRoutes');
const folderRoutes = require('./routes/folderRoutes');
const publicChatRoutes = require('./routes/publicChatRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const userRoutes = require('./routes/userRoutes');


// --- Inicialización de la BD (PostgreSQL) ---
async function initializeDatabase() {
  console.log('Verificando la estructura de la base de datos (PostgreSQL)...');
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

      /* Nueva tabla para persistir notificaciones */
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        recipient_id INT NOT NULL,   -- quien recibe la notificación
        sender_id INT NOT NULL,      -- quien la genera
        message_id INT NOT NULL,     -- mensaje que originó la notificación
        type VARCHAR(50) DEFAULT 'new_message',
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        FOREIGN KEY (recipient_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (sender_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        FOREIGN KEY (message_id) REFERENCES mensajes(id) ON DELETE CASCADE
      );
    `;

    await pool.query(createTablesQuery);

    // Columna foto_perfil_url (idempotente)
    try {
      await pool.query(
        "ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil_url VARCHAR(255) DEFAULT 'https://placehold.co/100x100/E0E0E0/121212?text=User'"
      );
      console.log("✅ Columna 'foto_perfil_url' verificada/añadida en 'usuarios'.");
    } catch (alterError) {
      if (alterError.code !== '42701') {
        console.warn("Advertencia al alterar 'usuarios':", alterError.message);
      }
    }

    console.log('✅ Estructura de la base de datos verificada/creada con éxito.');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos (PostgreSQL):', error);
    process.exit(1);
  }
}


// 1) Express
const app = express();

// 2) HTTP server + Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  },
});

// 3) Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Hacer disponible io en las rutas
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// 4) Rutas
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/public-chat', publicChatRoutes);
app.use('/api/users', userRoutes);

// Salud
app.get('/', (_req, res) => res.send('Servidor Gestor IA operativo.'));

// 404
app.use((_req, res) => res.status(404).json({ message: 'Ruta no encontrada' }));


// --- Socket.io (chat + notificaciones) ---
io.on('connection', (socket) => {
  console.log('Usuario conectado:', socket.id);

  socket.on('join_room', (userId) => {
    if (!userId) return;
    socket.join(userId.toString());
    console.log(`Usuario ${userId} unido a room ${userId}`);
  });

  socket.on('send_private_message', async (data) => {
    // data esperado: { sender_id, receiver_id, contenido }
    try {
      // 1) Guardar mensaje y devolver id/fecha
      const insertMsg = `
        INSERT INTO mensajes (sender_id, receiver_id, contenido)
        VALUES ($1, $2, $3)
        RETURNING id, created_at
      `;
      const msgResult = await pool.query(insertMsg, [
        data.sender_id,
        data.receiver_id,
        data.contenido,
      ]);
      const newMessage = msgResult.rows[0];

      // Empaquetar el mensaje completo para enviar al chat en tiempo real
      const messagePayload = {
        id: newMessage.id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        contenido: data.contenido,
        created_at: newMessage.created_at,
      };

      // 2) Emitir el mensaje al receptor (ventana de chat)
      io.to(data.receiver_id.toString()).emit('receive_private_message', messagePayload);

      // 3) Obtener info del remitente para la notificación
      if (!data.sender_id) return;
      const senderQuery = await pool.query(
        'SELECT id, nombre, foto_perfil_url FROM usuarios WHERE id = $1',
        [data.sender_id]
      );

      if (senderQuery.rows.length === 0) return;
      const senderInfo = senderQuery.rows[0];

      // 4) Guardar notificación persistente
      await pool.query(
        'INSERT INTO notifications (recipient_id, sender_id, message_id) VALUES ($1, $2, $3)',
        [data.receiver_id, data.sender_id, newMessage.id]
      );

      // 5) Emitir notificación
      const notificationData = {
        sender: senderInfo,          // Objeto: { id, nombre, foto_perfil_url }
        message: messagePayload,     // Mensaje con id y created_at
        // Campos planos para compatibilidad (si el front antiguo los usa)
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
      };

      io.to(data.receiver_id.toString()).emit('new_notification', notificationData);
    } catch (dbError) {
      console.error('Error al guardar/notificar mensaje en la BD:', dbError);
    }
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado:', socket.id);
  });
});


// 5) Arrancar servidor
const PORT = process.env.PORT || 10000;

(async () => {
  try {
    await initializeDatabase();

    server.listen(PORT, () => {
      console.log(`🚀 Servidor Express + Socket.io escuchando en el puerto ${PORT}`);
      schedulerService.startScheduler();
    });
  } catch (err) {
    console.error('❌ Fallo crítico al iniciar el servidor:', err);
    process.exit(1);
  }
})();

module.exports = app;
