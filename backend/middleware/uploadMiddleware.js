const multer = require('multer');

// Configuración de dónde y cómo guardar los archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Se usa la fecha para asegurar que cada nombre de archivo sea único
        cb(null, Date.now() + '-' + file.originalname);
    }
});

// Inicializamos multer con la configuración de almacenamiento
// y sin el filtro para permitir cualquier tipo de archivo
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 25 // Límite de 25 MB
    }
});

module.exports = upload;