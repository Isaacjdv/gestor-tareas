import React, { useState, useEffect } from 'react';
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import '../styles/DashboardPage.css';
import ChatComponent from '../components/ChatComponent'; // Import the new chat component

// Your backend URL on Render
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

const DashboardPage = () => {
    // --- STATES ---
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]);
    const [message, setMessage] = useState('');
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [editingFile, setEditingFile] = useState(null);

    // --- STATES FOR SUBFOLDER NAVIGATION ---
    const [currentFolder, setCurrentFolder] = useState(null); // Current folder object (null is root)
    const [path, setPath] = useState([]); // History for the "Back" button

    // --- EFFECTS ---
    // Load folders and files whenever we navigate to a new folder
    useEffect(() => {
        const folderId = currentFolder ? currentFolder.id : null;
        loadFolders(folderId);
        if (folderId) {
            loadFiles(folderId);
        } else {
            setFiles([]); // Clear files if we are at the root
        }
    }, [currentFolder]);

    // --- DATA LOADING LOGIC ---
    const loadFolders = async (parentId) => {
        try {
            const response = await folderService.getFolders(parentId);
            setFolders(response.data);
        } catch (error) { setMessage('Error loading folders.'); }
    };

    const loadFiles = async (folderId) => {
        try {
            const response = await fileService.getFilesByFolder(folderId);
            setFiles(response.data);
        } catch (error) { setMessage('Error loading files.'); }
    };

    // --- NAVIGATION LOGIC ---
    const handleFolderClick = (folder) => {
        setPath([...path, currentFolder]);
        setCurrentFolder(folder);
    };

    const handleGoBack = () => {
        const newPath = [...path];
        const parent = newPath.pop();
        setPath(newPath);
        setCurrentFolder(parent);
    };
    
    // --- ACTION HANDLERS ---
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const parentId = currentFolder ? currentFolder.id : null;
            await folderService.createFolder(newFolderName, parentId);
            setNewFolderName('');
            setMessage(`Folder "${newFolderName}" created.`);
            loadFolders(parentId);
        } catch (error) { setMessage('Error creating folder.'); }
    };

    const handleUpdateFolder = async (e) => {
        e.preventDefault();
        try {
            await folderService.updateFolder(editingFolder.id, editingFolder.nombre);
            setMessage('Folder updated.');
            setEditingFolder(null);
            loadFolders(currentFolder ? currentFolder.id : null);
        } catch (error) { setMessage('Error updating folder.'); }
    };

    const handleDeleteFolder = async (folderId) => {
        if (window.confirm('Are you sure you want to delete this folder and all its contents?')) {
            try {
                await folderService.deleteFolder(folderId);
                setMessage('Folder deleted.');
                loadFolders(currentFolder ? currentFolder.id : null);
            } catch (error) { setMessage('Error deleting folder.'); }
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const handleUploadFile = async (e) => {
        e.preventDefault();
        if (!selectedFile || !currentFolder) return; 
        setUploading(true);
        setMessage('Uploading file...');
        try {
            await fileService.uploadFile(currentFolder.id, selectedFile);
            setSelectedFile(null);
            document.getElementById('fileInput').value = "";
            loadFiles(currentFolder.id);
            setMessage('File uploaded successfully!');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error uploading file.');
        } finally {
            setUploading(false);
        }
    };

    const handleUpdateFile = async (e) => {
        e.preventDefault();
        try {
            await fileService.updateFile(editingFile.id, editingFile.nombre_original);
            setMessage('File name updated.');
            setEditingFile(null);
            loadFiles(currentFolder.id);
        } catch (error) { setMessage('Error updating file.'); }
    };

    const handleDeleteFile = async (fileId) => {
        if (window.confirm('Are you sure you want to delete this file?')) {
            try {
                await fileService.deleteFile(fileId);
                setMessage('File deleted.');
                loadFiles(currentFolder.id);
            } catch (error) { setMessage('Error deleting file.'); }
        }
    };
    
    // --- RENDER ---
    return (
        <div className="dashboard-container">
            <div className="sidebar">
                <h2>{currentFolder ? currentFolder.nombre : 'Main Folders'}</h2>
                
                {path.length > 0 && <button onClick={handleGoBack} className="back-button">← Back</button>}

                <form onSubmit={handleCreateFolder} className="folder-form">
                    <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="New folder..."/>
                    <button type="submit">+</button>
                </form>
                
                <ul className="folder-list">
                    {folders.map(folder => (
                        <li key={folder.id}>
                            <span onClick={() => handleFolderClick(folder)}>📁 {folder.nombre}</span>
                            <div className="actions">
                                <button onClick={() => setEditingFolder(folder)}>✏️</button>
                                <button onClick={() => handleDeleteFolder(folder.id)}>❌</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="main-content">
                <ChatComponent /> {/* The AI Chat component */}
                
                <div className="files-section">
                    {currentFolder ? (
                        <>
                            <h2>Files in: {currentFolder.nombre}</h2>
                            
                            <form onSubmit={handleUploadFile} className="upload-form">
                                 <input type="file" id="fileInput" onChange={handleFileChange} />
                                 <button type="submit" disabled={!selectedFile || uploading}>
                                    {uploading ? 'Uploading...' : 'Upload File'}
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
                            <h2>Welcome</h2>
                            <p>Select a folder to view its contents or create a new one.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;