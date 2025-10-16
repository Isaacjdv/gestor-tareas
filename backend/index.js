const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 1. Importar todas las rutas primero
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const fileRoutes = require('./routes/fileRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');

// 2. Crear la aplicación Express
const app = express();

// 3. Usar los middlewares
app.use(cors());
app.use(express.json()); // Para leer JSON
app.use(express.urlencoded({ extended: false })); // <-- LÍNEA CLAVE PARA ENTENDER LOS DATOS DE TWILIO
app.use('/uploads', express.static('uploads'));

// 4. Definir las rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/whatsapp', whatsappRoutes);

// 5. Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});