import React, { useState, useEffect } from 'react';
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import '../styles/DashboardPage.css';
import ChatComponent from '../components/ChatComponent'; // Importa el chat

// URL de tu backend en Render
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

const DashboardPage = () => {
    // --- ESTADOS ---
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [editingFile, setEditingFile] = useState(null);

    // --- ESTADOS PARA NAVEGACIÓN DE SUBCARPETAS ---
    const [currentFolder, setCurrentFolder] = useState(null); // Objeto de la carpeta actual (null es la raíz)
    const [path, setPath] = useState([]); // Historial para el botón "Volver"

    // --- EFECTOS ---
    // Carga carpetas y archivos cada vez que navegamos a una nueva carpeta
    useEffect(() => {
        const folderId = currentFolder ? currentFolder.id : null;
        loadFolders(folderId);
        if (folderId) {
            loadFiles(folderId);
        } else {
            setFiles([]); // Limpia los archivos si estamos en la raíz
        }
    }, [currentFolder]);

    // --- LÓGICA DE CARGA ---
    const loadFolders = async (parentId) => {
        try {
            const response = await folderService.getFolders(parentId);
            setFolders(response.data);
        } catch (error) { setMessage('Error al cargar carpetas.'); }
    };

    const loadFiles = async (folderId) => {
        try {
            const response = await fileService.getFilesByFolder(folderId);
            setFiles(response.data);
        } catch (error) { setMessage('Error al cargar archivos.'); }
    };

    // --- LÓGICA DE NAVEGACIÓN ---
    const handleFolderClick = (folder) => {
        setPath([...path, currentFolder]);
        setCurrentFolder(folder);
    };

    const handleGoBack = () => {
        const newPath = [...path];
        const parent = newPath.pop();
        setPath(newPath);
        setCurrentFolder(parent); // Vuelve a la carpeta padre
    };
    
    // --- MANEJADORES DE ACCIONES ---
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const parentId = currentFolder ? currentFolder.id : null;
            await folderService.createFolder(newFolderName, parentId);
            setNewFolderName('');
            setMessage(`Carpeta "${newFolderName}" creada.`);
            loadFolders(parentId);
        } catch (error) { setMessage('Error al crear la carpeta.'); }
    };

    const handleUpdateFolder = async (e) => {
        e.preventDefault();
        try {
            await folderService.updateFolder(editingFolder.id, editingFolder.nombre);
            setMessage('Carpeta actualizada.');
            setEditingFolder(null);
            loadFolders(currentFolder ? currentFolder.id : null);
        } catch (error) { setMessage('Error al actualizar la carpeta.'); }
    };

    const handleDeleteFolder = async (folderId) => {
        if (window.confirm('¿Seguro que quieres eliminar esta carpeta y todo su contenido?')) {
            try {
                await folderService.deleteFolder(folderId);
                setMessage('Carpeta eliminada.');
                loadFolders(currentFolder ? currentFolder.id : null);
            } catch (error) { setMessage('Error al eliminar la carpeta.'); }
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUploadFile = async (e) => {
        e.preventDefault();
        if (!selectedFile || !currentFolder) {
             setMessage('Por favor, selecciona un archivo y una carpeta primero.');
             return;
        }
        setUploading(true);
        setMessage('Subiendo archivo...');
        try {
            await fileService.uploadFile(currentFolder.id, selectedFile);
            setSelectedFile(null);
            document.getElementById('fileInput').value = "";
            loadFiles(currentFolder.id);
            setMessage('¡Archivo subido con éxito!');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error al subir el archivo.');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateFile = async (e) => {
        e.preventDefault();
        try {
            await fileService.updateFile(editingFile.id, editingFile.nombre_original);
            setMessage('Nombre del archivo actualizado.');
            setEditingFile(null);
            loadFiles(currentFolder.id);
        } catch (error) { setMessage('Error al actualizar el archivo.'); }
    };

    const handleDeleteFile = async (fileId) => {
        if (window.confirm('¿Seguro que quieres eliminar este archivo?')) {
            try {
                await fileService.deleteFile(fileId);
                setMessage('Archivo eliminado.');
                loadFiles(currentFolder.id);
            } catch (error) { setMessage('Error al eliminar el archivo.'); }
        }
    };
    
    // --- RENDERIZADO ---
    return (
        <div className="dashboard-container">
            {/* Columna 1: Sidebar de Carpetas */}
            <div className="sidebar">
                <h2>{currentFolder ? currentFolder.nombre : 'Carpetas Principales'}</h2>
                
                {path.length > 0 && <button onClick={handleGoBack} className="back-button">← Volver</button>}

                <form onSubmit={handleCreateFolder} className="folder-form">
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Nueva carpeta..."/>
                    <button type="submit">+</button>
                </form>
                
                <ul className="folder-list">
                    {folders.map(folder => (
                        <li key={folder.id} className={currentFolder?.id === folder.id ? 'active' : ''}>
                            <span onClick={() => handleFolderClick(folder)}> {folder.nombre}</span>
                            <div className="actions">
                                <button onClick={() => setEditingFolder(folder)}>✏️</button>
                                <button onClick={() => handleDeleteFolder(folder.id)}>❌</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            {/* Columna 2: Contenido Principal (Archivos) */}
            <div className="main-content">
                <div className="files-section">
                    {currentFolder ? (
                        <>
                            <h2>Archivos en: {currentFolder.nombre}</h2>
                            
                            <form onSubmit={handleUploadFile} className="upload-form">
                                 <input type="file" id="fileInput" onChange={handleFileChange} />
                                 <button typeS="submit" disabled={!selectedFile || uploading}>
                                    {uploading ? 'Subiendo...' : 'Subir Archivo'}
                                </button>
                            </form>
                            
                            {message && <p className="message">{message}</p>}
                            
                            <ul className="file-list">
                                 {files.map(file => (
                                    <li key={file.id}>
                                        {editingFile?.id === file.id ? (
                                            <form onSubmit={handleUpdateFile} className="edit-form">
                                                <input type="text" value={editingFile.nombre_original} onChange={(e) => setEditingFile({ ...editingFile, nombre_original: e.target.value })} autoFocus/>
                                                <button type="submit">✔</button>
                                                <button type="button" onClick={() => setEditingFile(null)}>✖</button>
                                            </form>
                                        ) : (
                                            <a href={`${RENDER_BACKEND_URL}/${file.path_archivo.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer">
                                                📄 {file.nombre_original}
                                            </a>
                                        )}
                                        <div className="actions">
                                            <button onClick={() => setEditingFile(file)}>✏️</button>
                                            <button onClick={() => handleDeleteFile(file.id)}>❌</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <div className="welcome-message">
                            <h2>Bienvenido a tu Gestor</h2>
                            <p>Selecciona una carpeta para ver su contenido o crea una nueva.</p>
                        </div>
                    )}
                </div>
                
                {/* Columna 3: Chat de IA */}
                <div className="chat-sidebar">
                    <ChatComponent />
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;