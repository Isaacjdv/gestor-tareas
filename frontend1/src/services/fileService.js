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

// --- NUEVA FUNCIÓN: Obtener TODOS los archivos del usuario (para el Home)
// Ruta: GET /api/files/
const getAllFiles = () => {
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
// Ruta: PATCH /api/files/:id/details
const updateFileDetails = (id, details) => {
    // details es un objeto como { status: 'in_process', nota: 'nueva nota' }
    return axios.patch(`${API_BASE_URL}${id}/details`, details, { headers: getAuthHeader() });
};

// Eliminar un archivo
const deleteFile = (id) => {
    return axios.delete(API_BASE_URL + id, { headers: getAuthHeader() });
};

const fileService = {
    getFilesByFolder,
    getAllFiles, 
    uploadFile,
    updateFile,
    updateFileDetails, 
    deleteFile
};

export default fileService;
