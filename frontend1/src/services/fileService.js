import axios from 'axios';

// URL de tu backend en Render
const API_BASE_URL = 'https://gestor-tareas-backend-11hi.onrender.com/api/files/';

// --- FUNCIÓN AUXILIAR ---
const getAuthHeader = () => {
    const token = localStorage.getItem('user_token');
    return token ? { Authorization: 'Bearer ' + token } : {};
};

// Obtener archivos de una carpeta específica
const getFilesByFolder = (folderId) => {
    return axios.get(API_BASE_URL + folderId, { headers: getAuthHeader() });
};

// --- NUEVA FUNCIÓN: Obtener TODOS los archivos del usuario
const getAllFiles = () => {
    // La ruta es GET /api/files/
    return axios.get(API_BASE_URL, { headers: getAuthHeader() });
};

// Subir un archivo
const uploadFile = (folderId, file) => {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(API_BASE_URL + folderId + '/upload', formData, {
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'multipart/form-data'
        }
    });
};

// Actualizar el nombre de un archivo (PUT)
const updateFile = (id, nombre_original) => {
    return axios.put(API_BASE_URL + id, { nombre_original }, { headers: getAuthHeader() });
};

// --- NUEVA FUNCIÓN: Actualizar Status y Nota de un archivo (PATCH)
const updateFileDetails = (id, details) => {
    // La ruta es PATCH /api/files/:id/details
    return axios.patch(`${API_BASE_URL}${id}/details`, details, { headers: getAuthHeader() });
};

// Eliminar un archivo
const deleteFile = (id) => {
    return axios.delete(API_BASE_URL + id, { headers: getAuthHeader() });
};

const fileService = {
    getFilesByFolder,
    getAllFiles, // <-- AÑADIDO
    uploadFile,
    updateFile,
    updateFileDetails, // <-- AÑADIDO
    deleteFile
};

export default fileService;
