import axios from 'axios';

// La URL base para la API de archivos
const API_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/files/';

// Función centralizada para obtener el header de autenticación
const getAuthHeader = () => {
    // Usamos 'user_token' como (asumimos) lo tienes en tu localStorage
    const token = localStorage.getItem('user_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
};

// --- Definición de todas las funciones del servicio ---

// Obtener archivos de una carpeta
const getFilesByFolder = (folderId) => {
    return axios.get(API_URL + folderId, { headers: getAuthHeader() });
};

// [NUEVO] Obtener TODOS los archivos del usuario
const getAllFiles = () => {
    return axios.get(API_URL + 'user/all', { headers: getAuthHeader() });
};

// Subir un archivo
const uploadFile = (folderId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(API_URL + folderId + '/upload', formData, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Actualizar el nombre de un archivo
const updateFile = (id, nombre_original) => {
    return axios.put(API_URL + id, { nombre_original }, { headers: getAuthHeader() });
};

// Eliminar un archivo
const deleteFile = (id) => {
    return axios.delete(API_URL + id, { headers: getAuthHeader() });
};

// [NUEVO] Actualizar estado y nota de un archivo
const updateFileDetails = (fileId, details) => {
    // API_URL + fileId + '/details' -> .../api/files/:id/details
    return axios.put(API_URL + fileId + '/details', details, {
        headers: getAuthHeader()
    });
};


// --- Creación del objeto de servicio ---

// Creamos UN SOLO objeto con TODAS las funciones
const fileService = {
    getFilesByFolder,
    getAllFiles, // <-- NUEVO
    uploadFile,
    updateFile,
    deleteFile,
    updateFileDetails // <-- NUEVO
};

// Exportamos ESE ÚNICO objeto
export default fileService;

