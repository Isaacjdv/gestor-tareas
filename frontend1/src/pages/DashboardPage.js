import React, { useState, useEffect, useContext, useMemo } from 'react';
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import { UserContext } from '../App';
import '../styles/DashboardPage.css';
import ChatComponent from '../components/ChatComponent';

// URL de tu backend en Render
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

// --- Objeto de Traducciones (necesario para la lógica del componente) ---
const translations = {
    es: {
        searchPlaceholder: 'Buscar en la carpeta actual...',
        hello: 'Hola',
        logout: 'Cerrar Sesión',
        myFolders: 'Mis Carpetas',
        goBackTo: 'Volver a',
        root: 'Raíz',
        newFolderPlaceholder: 'Nueva carpeta...',
        rename: 'Renombrar',
        delete: 'Eliminar',
        filesIn: 'Archivos en',
        selectFile: 'Seleccionar archivo...',
        uploadFile: 'Subir Archivo',
        uploading: 'Subiendo...',
        confirmDeleteFolder: 'Esta acción es irreversible. ¿Seguro que quieres eliminar esta carpeta y todo su contenido?',
        confirmDeleteFile: '¿Seguro que quieres eliminar este archivo?',
        deleteFolderTitle: 'Eliminar Carpeta',
        deleteFileTitle: 'Eliminar Archivo',
        confirm: 'Confirmar',
        cancel: 'Cancelar',
        folderCreated: 'Carpeta creada.',
        folderUpdated: 'Carpeta actualizada.',
        folderDeleted: 'Carpeta eliminada.',
        fileUploaded: '¡Archivo subido con éxito!',
        fileUpdated: 'Nombre del archivo actualizado.',
        fileDeleted: 'Archivo eliminado.',
        errorLoadFolders: 'Error al cargar carpetas.',
        errorLoadFiles: 'Error al cargar archivos.',
        errorCreateFolder: 'Error al crear la carpeta.',
        errorUpdateFolder: 'Error al actualizar la carpeta.',
        errorDeleteFolder: 'Error al eliminar la carpeta.',
        errorUploadFile: 'Error al subir el archivo.',
        errorUpdateFile: 'Error al actualizar el archivo.',
        errorDeleteFile: 'Error al eliminar el archivo.',
        welcomeTitle: 'Bienvenido a tu Gestor IA',
        welcomeMessage: 'Selecciona una carpeta o explora tus herramientas.',
        emptyFolderTitle: 'Carpeta Vacía',
        emptyFolderMessage: 'Sube un archivo para empezar.',
        selectFileAndFolder: 'Por favor, selecciona un archivo y una carpeta primero.',
        noResultsTitle: 'Sin resultados',
        noResultsMessage: 'No se encontraron archivos o carpetas con el nombre "{searchTerm}".',
        noFoldersFound: 'No se encontraron carpetas.',
        homeCardAnalyticsTitle: 'Analíticas',
        homeCardAnalyticsDesc: 'Revisa el uso de tus archivos.',
        homeCardReportsTitle: 'Reportes',
        homeCardReportsDesc: 'Genera reportes automáticos.',
        homeCardSettingsTitle: 'Configuración',
        homeCardSettingsDesc: 'Ajusta tu perfil y cuenta.',
        pending: 'Pendientes',
        in_process: 'En Proceso',
        done: 'Terminados',
        advantagesTitle: 'Potencia tu Flujo de Trabajo',
        advantagesDesc: 'Organiza, prioriza y ejecuta. Tu gestor ahora te ayuda a seguir el progreso de cada tarea, desde el inicio hasta el final.',
        addNote: 'Añadir Nota',
        editNote: 'Editar Nota',
        noteModalTitle: 'Nota para',
        saveNote: 'Guardar Nota',
        notePlaceholder: 'Escribe tu nota aquí...',
        myArea: 'Mi Área de Trabajo',
    },
    en: {
        searchPlaceholder: 'Search current folder...',
        hello: 'Hello',
        logout: 'Log Out',
        myFolders: 'My Folders',
        goBackTo: 'Back to',
        root: 'Root',
        newFolderPlaceholder: 'New folder...',
        rename: 'Rename',
        delete: 'Delete',
        filesIn: 'Files in',
        selectFile: 'Select file...',
        uploadFile: 'Upload File',
        uploading: 'Uploading...',
        confirmDeleteFolder: 'This action is irreversible. Are you sure you want to delete this folder and all its content?',
        confirmDeleteFile: 'Are you sure you want to delete this file?',
        deleteFolderTitle: 'Delete Folder',
        deleteFileTitle: 'Delete File',
        confirm: 'Confirm',
        cancel: 'Cancel',
        folderCreated: 'Folder created.',
        folderUpdated: 'Folder updated.',
        folderDeleted: 'Folder deleted.',
        fileUploaded: 'File uploaded successfully!',
        fileUpdated: 'File name updated.',
        fileDeleted: 'File deleted.',
        errorLoadFolders: 'Error loading folders.',
        errorLoadFiles: 'Error loading files.',
        errorCreateFolder: 'Error creating folder.',
        errorUpdateFolder: 'Error updating folder.',
        errorDeleteFolder: 'Error deleting folder.',
        errorUploadFile: 'Error uploading file.',
        errorUpdateFile: 'Error updating file.',
        errorDeleteFile: 'Error deleting file.',
        welcomeTitle: 'Welcome to your AI Manager',
        welcomeMessage: 'Select a folder or explore your tools.',
        emptyFolderTitle: 'Empty Folder',
        emptyFolderMessage: 'Upload a file to get started.',
        selectFileAndFolder: 'Please select a file and a folder first.',
        noResultsTitle: 'No results',
        noResultsMessage: 'No files or folders found matching "{searchTerm}".',
        noFoldersFound: 'No folders found.',
        homeCardAnalyticsTitle: 'Analytics',
        homeCardAnalyticsDesc: 'Review your file usage.',
        homeCardReportsTitle: 'Reports',
        homeCardReportsDesc: 'Generate automated reports.',
        homeCardSettingsTitle: 'Settings',
        homeCardSettingsDesc: 'Adjust your profile and account.',
        pending: 'Pending',
        in_process: 'In Process',
        done: 'Done',
        advantagesTitle: 'Boost your Workflow',
        advantagesDesc: 'Organize, prioritize, and execute. Your manager now helps you track the progress of every task, from start to finish.',
        addNote: 'Add Note',
        editNote: 'Edit Note',
        noteModalTitle: 'Note for',
        saveNote: 'Save Note',
        notePlaceholder: 'Write your note here...',
        myArea: 'My Workspace',
    }
};


// --- Componente Modal de Confirmación ---
const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose, t }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header"><h3>{title}</h3><button onClick={onClose} className="modal-close-btn" title={t('cancel')}>&times;</button></div>
                <div className="modal-body"><p>{message}</p></div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
                    <button onClick={onConfirm} className="btn btn-danger">{t('confirm')}</button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Modal para Notas ---
const NoteModal = ({ file, onClose, onSave, t }) => {
    const [noteText, setNoteText] = useState(file.nota || '');

    const handleSave = () => {
        onSave(file, noteText);
        onClose();
    };

    if (!file) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{t('noteModalTitle')} "{file.nombre_original}"</h3>
                    <button onClick={onClose} className="modal-close-btn" title={t('cancel')}>&times;</button>
                </div>
                <div className="modal-body">
                    <textarea
                        className="note-textarea"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder={t('notePlaceholder')}
                    />
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
                    <button onClick={handleSave} className="btn btn-primary">{t('saveNote')}</button>
                </div>
            </div>
        </div>
    );
};

// --- Componente Selector de Idioma ---
const LanguageSwitcher = ({ language, setLanguage }) => {
    const toggleLanguage = () => setLanguage(lang => lang === 'es' ? 'en' : 'es');
    return (
        <div className="language-switcher">
            <button onClick={toggleLanguage} className="btn btn-secondary btn-lang" title="Change Language">
                {language === 'es' ? 'EN' : 'ES'}
            </button>
        </div>
    );
};

// --- Componente Migas de Pan ---
const Breadcrumbs = ({ path, currentFolder, onCrumbClick, t }) => {
    const crumbs = [...path.filter(p => p), currentFolder].filter(p => p);
    return (
        <nav className="breadcrumbs">
            <span className="crumb" onClick={() => onCrumbClick(null)}>{t('root')}</span>
            {crumbs.map((crumb, index) => (
                <React.Fragment key={crumb.id}>
                    <span className="separator">&gt;</span>
                    <span className="crumb" onClick={() => onCrumbClick(crumb, index)}>{crumb.nombre}</span>
                </React.Fragment>
            ))}
        </nav>
    );
};

// --- Componente Navbar ---
const DashboardNavbar = ({ user, language, setLanguage, t, searchTerm, setSearchTerm }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        authService.logout();
        navigate('/');
    };
    return (
        <nav className="dashboard-navbar">
            <div className="navbar-logo"><a href="/dashboard">Gestor IA</a></div>
            <div className="navbar-search">
                <i className="fas fa-search"></i>
                <input type="text" placeholder={t('searchPlaceholder')} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="navbar-user">
                <LanguageSwitcher language={language} setLanguage={setLanguage} />
                <span className="welcome-text">{t('hello')}, {user ? user.nombre : 'Usuario'}</span>
                <button onClick={handleLogout} className="btn btn-primary">{t('logout')}</button>
            </div>
        </nav>
    );
};

// --- Componente para las Tarjetas del Home ---
const HomePageCards = ({ onNavigate, t, groupedFiles, fileListHandlers }) => {
    // La lógica de agrupación de archivos ya viene del hook useMemo en DashboardPage
    
    // Contadores para las tarjetas de analíticas
    const totalFiles = groupedFiles.pending.length + groupedFiles.in_process.length + groupedFiles.done.length;
    const totalPending = groupedFiles.pending.length;
    const totalDone = groupedFiles.done.length;

    return (
        <div className="home-hub">
            <h2 className="welcome-header">{t('welcomeTitle')}</h2>
            <p className="home-subtitle">{t('welcomeMessage')}</p>
            
            <div className="home-card-grid">
                <div className="home-card" onClick={() => onNavigate('analytics')}>
                    <i className="fas fa-chart-line card-icon"></i>
                    <div className="card-overlay"><h3>{totalFiles} Archivos Totales</h3></div>
                    <div className="card-footer"><h4>{t('homeCardAnalyticsTitle')}</h4></div>
                </div>
                <div className="home-card" onClick={() => onNavigate('reports')}>
                    <i className="fas fa-file-alt card-icon"></i>
                    <div className="card-overlay"><h3>{totalPending} Tareas Pendientes</h3></div>
                    <div className="card-footer"><h4>{t('homeCardReportsTitle')}</h4></div>
                </div>
                <div className="home-card" onClick={() => onNavigate('settings')}>
                    <i className="fas fa-cog card-icon"></i>
                    <div className="card-overlay"><h3>{totalDone} Tareas Terminadas</h3></div>
                    <div className="card-footer"><h4>{t('homeCardSettingsTitle')}</h4></div>
                </div>
            </div>

            {/* Sección "Mi Área" */}
            <div className="mi-area-section">
                <h3 className="file-group-header">{t('myArea')}</h3>
                <FileListGroup
                    title={t('pending')}
                    files={groupedFiles.pending}
                    {...fileListHandlers}
                />
                <FileListGroup
                    title={t('in_process')}
                    files={groupedFiles.in_process}
                    {...fileListHandlers}
                />
                <FileListGroup
                    title={t('done')}
                    files={groupedFiles.done}
                    {...fileListHandlers}
                />
                {/* Mensaje si no hay archivos en absoluto */}
                {totalFiles === 0 && (
                    <div className="empty-state-small">
                        <i className="fas fa-box-open" style={{fontSize: '2rem', marginBottom: '1rem'}}></i>
                        <p>{t('emptyFolderMessage')}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Componente para la Vista de "Apartado" ---
const ApartadoView = ({ viewName, onGoHome, t }) => {
    const getTitle = (name) => ({
        'analytics': t('homeCardAnalyticsTitle'),
        'reports': t('homeCardReportsTitle'),
        'settings': t('homeCardSettingsTitle'),
    })[name] || name;
    const title = getTitle(viewName);

    return (
        <div className="apartado-view">
            <nav className="breadcrumbs apartado-breadcrumbs">
                <span className="crumb" onClick={onGoHome}><i className="fas fa-home"></i> {t('root')}</span>
                <span className="separator">&gt;</span>
                <span className="crumb">{title}</span>
            </nav>
            <div className="apartado-content">
                <h2>{title}</h2>
                <p>Aquí iría el contenido específico de la sección "<b>{title}</b>".</p>
                <img src={`https://placehold.co/800x300/2C2C2C/E0E0E0?text=Contenido+de+${title}`} alt={title} style={{ width: '100%', borderRadius: '8px', marginTop: '1rem' }} />
            </div>
        </div>
    );
};

// --- Función de Iconos (fuera del componente) ---
const getFileIcon = (fileName) => {
    if (!fileName) return 'fas fa-file'; // Fallback
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return 'fas fa-file-pdf';
        case 'png': case 'jpg': case 'jpeg': return 'fas fa-file-image';
        case 'doc': case 'docx': return 'fas fa-file-word';
        case 'xls': case 'xlsx': return 'fas fa-file-excel';
        case 'ppt': case 'pptx': return 'fas fa-file-powerpoint';
        case 'zip': case 'rar': return 'fas fa-file-archive';
        case 'txt': return 'fas fa-file-alt';
        case 'mp3': case 'wav': return 'fas fa-file-audio';
        case 'mp4': case 'mov': return 'fas fa-file-video';
        default: return 'fas fa-file';
    }
};

// --- Componente FileListGroup (fuera del componente) ---
const FileListGroup = ({ 
    title, 
    files, 
    onStatusChange, 
    onNoteClick,
    editingFile,
    onUpdateFile,
    onSetEditingFile,
    onDeleteFile,
    t 
}) => {
    if (files.length === 0) return null;
    
    return (
        <div className="file-group-container">
            <h3 className="file-group-header">{title} ({files.length})</h3>
            <ul className="file-list">
                {files.map((file, index) => (
                    <li 
                        key={file.id} 
                        className={`file-item status-${file.status || 'pending'}`} 
                        // Tooltip para la nota
                        title={file.status === 'in_process' && file.nota ? `Nota: ${file.nota}` : title}
                        style={{ animationDelay: `${index * 30}ms` }}
                    >
                        {editingFile?.id === file.id ? (
                            // Formulario para renombrar
                            <form onSubmit={(e) => { e.preventDefault(); onUpdateFile(e); }} className="edit-form">
                                <input 
                                    type="text" 
                                    value={editingFile.nombre_original} 
                                    onChange={(e) => onSetEditingFile({ ...editingFile, nombre_original: e.target.value })} 
                                    autoFocus
                                />
                                <button type="submit" title={t('saveNote')}><i className="fas fa-check"></i></button>
                                <button type="button" onClick={() => onSetEditingFile(null)} title={t('cancel')}><i className="fas fa-times"></i></button>
                            </form>
                        ) : (
                            // Vista normal del archivo
                            <>
                                <a href={`${RENDER_BACKEND_URL}/${file.path_archivo.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="item-name">
                                    <i className={getFileIcon(file.nombre_original)}></i>
                                    <span>{file.nombre_original}</span>
                                </a>
                                
                                {/* Acciones de Renombrar y Eliminar */}
                                <div className="actions">
                                    <button onClick={() => onSetEditingFile(file)} title={t('rename')}><i className="fas fa-pen"></i></button>
                                    <button onClick={() => onDeleteFile(file.id)} title={t('delete')} className="delete-btn"><i className="fas fa-trash-alt"></i></button>
                                </div>
                                
                                {/* Acciones de Estado (Semaforización) */}
                                <div className="file-status-actions">
                                    <button className={`status-btn pending ${file.status === 'pending' ? 'active' : ''}`} title={t('pending')} onClick={() => onStatusChange(file, { status: 'pending', nota: '' })}>
                                        <i className="fas fa-exclamation-circle"></i>
                                    </button>
                                    
                                    <button className={`status-btn in-process ${file.status === 'in_process' ? 'active' : ''}`} title={file.nota ? t('editNote') : t('addNote')} onClick={() => onNoteClick(file)}>
                                        <i className="fas fa-pencil-alt"></i>
                                    </button>
                                    
                                    <button className={`status-btn done ${file.status === 'done' ? 'active' : ''}`} title={t('done')} onClick={() => onStatusChange(file, { status: 'done', nota: '' })}>
                                        <i className="fas fa-check-circle"></i>
                                    </button>
                                </div>
                            </>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
};


// --- Componente Principal del Dashboard ---
const DashboardPage = () => {
    // --- ESTADOS ---
    const [folders, setFolders] = useState([]);
    const [files, setFiles] = useState([]); // Archivos de la carpeta actual
    const [allFiles, setAllFiles] = useState([]); // Todos los archivos del usuario
    const [message, setMessage] = useState(null);
    const [newFolderName, setNewFolderName] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [editingFile, setEditingFile] = useState(null); // Estado para renombrar archivo
    const [currentFolder, setCurrentFolder] = useState(null);
    const [path, setPath] = useState([]);
    const [language, setLanguage] = useState('es');
    const [searchTerm, setSearchTerm] = useState('');
    const [modalState, setModalState] = useState({ isOpen: false }); // Modal de confirmación
    const [mainView, setMainView] = useState('home');
    const [noteModalFile, setNoteModalFile] = useState(null); // Modal de notas

    // --- CONTEXTO ---
    const { user } = useContext(UserContext);

    // --- Traducción ---
    const t = (key, params = {}) => {
        let text = translations[language][key] || key;
        if (!text) text = translations['es'][key] || key; // Fallback a español
        if (text) {
            Object.keys(params).forEach(paramKey => {
                text = text.replace(`{${paramKey}}`, params[paramKey]);
            });
        }
        return text;
    };

    // --- EFECTOS ---
    // El efecto principal que carga las carpetas y archivos
    useEffect(() => {
        if (user) {
            const folderId = currentFolder ? currentFolder.id : null;
            loadFolders(folderId); // Cargar carpetas (siempre se ven)
            
            if (folderId) {
                setAllFiles([]); // Limpiar archivos globales
                loadFiles(folderId); // Cargar archivos de UNA carpeta
            } else {
                setFiles([]); // Limpiar archivos de carpeta
                loadAllUserFiles(); // Cargar TODOS los archivos para el Home
            }
        }
    }, [currentFolder, user]);

    // --- LÓGICA DE CARGA ---
    const loadFolders = async (parentId) => {
        try {
            const response = await folderService.getFolders(parentId);
            setFolders(response.data);
        } catch (error) { 
            console.error("Error en loadFolders:", error);
            showMessage(t('errorLoadFolders'), 'error'); 
        }
    };

    const loadFiles = async (folderId) => {
        try {
            const response = await fileService.getFilesByFolder(folderId);
            setFiles(response.data);
        } catch (error) { 
            console.error("Error en loadFiles:", error);
            showMessage(t('errorLoadFiles'), 'error'); 
        }
    };
    
    const loadAllUserFiles = async () => {
        try {
            const response = await fileService.getAllFiles();
            setAllFiles(response.data);
        } catch (error) {
            console.error("Error en loadAllUserFiles:", error);
            showMessage(t('errorLoadFiles'), 'error');
        }
    };
    
    const showMessage = (text, type = 'success') => {
        setMessage({ text, type });
        setTimeout(() => setMessage(null), 3000);
    };

    // --- LÓGICA DE NAVEGACIÓN ---
    const handleFolderClick = (folder) => {
        setPath(prevPath => [...prevPath.filter(p => p), currentFolder].filter(Boolean));
        setCurrentFolder(folder);
        setSearchTerm('');
        setMainView('folder'); // Cambiar a vista de carpeta
    };
    
    const handleGoBack = () => {
        const newPath = [...path];
        const parent = newPath.pop();
        setPath(newPath);
        setCurrentFolder(parent || null);
        setSearchTerm('');
        if (!parent) setMainView('home');
    };

    const handleCrumbClick = (folder, index) => {
        setSearchTerm('');
        if (folder === null) {
            setPath([]);
            setCurrentFolder(null);
            setMainView('home');
        } else {
            const newPath = path.slice(0, index);
            setPath(newPath);
            setCurrentFolder(folder);
            setMainView('folder');
        }
    };
    
    // --- MANEJADORES DE ACCIONES (CRUD) ---
    const handleCreateFolder = async (e) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;
        try {
            const parentId = currentFolder ? currentFolder.id : null;
            await folderService.createFolder(newFolderName, parentId);
            setNewFolderName('');
            showMessage(t('folderCreated'));
            loadFolders(parentId);
        } catch (error) { showMessage(t('errorCreateFolder'), 'error'); }
    };

    const handleUpdateFolder = async (e) => {
        e.preventDefault();
        try {
            await folderService.updateFolder(editingFolder.id, editingFolder.nombre);
            showMessage(t('folderUpdated'));
            setEditingFolder(null);
            loadFolders(currentFolder ? currentFolder.id : null);
        } catch (error) { showMessage(t('errorUpdateFolder'), 'error'); }
    };

    const handleDeleteFolder = (folderId) => {
        setModalState({ isOpen: true, title: t('deleteFolderTitle'), message: t('confirmDeleteFolder'), onConfirm: () => confirmDeleteFolder(folderId) });
    };

    const confirmDeleteFolder = async (folderId) => {
        try {
            await folderService.deleteFolder(folderId);
            showMessage(t('folderDeleted'));
            loadFolders(currentFolder ? currentFolder.id : null);
        } catch (error) { showMessage(t('errorDeleteFolder'), 'error'); }
        closeModal();
    };

    const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

    const handleUploadFile = async (e) => {
        e.preventDefault();
        if (!selectedFile || !currentFolder) {
            showMessage(t('selectFileAndFolder'), 'error');
            return;
        }
        setUploading(true);
        showMessage(t('uploading'), 'info');
        try {
            await fileService.uploadFile(currentFolder.id, selectedFile);
            setSelectedFile(null);
            document.getElementById('fileInput').value = "";
            loadFiles(currentFolder.id); // Recarga los archivos de la carpeta
            showMessage(t('fileUploaded'));
        } catch (error) {
            showMessage(error.response?.data?.message || t('errorUploadFile'), 'error');
        } finally {
            setUploading(false);
        }
    };

    // Esta función es para el botón de "Renombrar"
    const handleUpdateFile = async (e) => {
        e.preventDefault();
        if (!editingFile) return;
        try {
            const updatedFile = await fileService.updateFile(editingFile.id, editingFile.nombre_original);
            showMessage(t('fileUpdated'));
            setEditingFile(null);
            // Recargar la lista de archivos correcta (carpeta actual o todos)
            if (currentFolder) {
                loadFiles(currentFolder.id);
            } else {
                loadAllUserFiles();
            }
        } catch (error) { 
            console.error("Error en handleUpdateFile:", error);
            showMessage(t('errorUpdateFile'), 'error'); 
        }
    };

    // Esta función es para el botón "Eliminar"
    const handleDeleteFile = (fileId) => {
        setModalState({ isOpen: true, title: t('deleteFileTitle'), message: t('confirmDeleteFile'), onConfirm: () => confirmDeleteFile(fileId) });
    };

    const confirmDeleteFile = async (fileId) => {
        try {
            await fileService.deleteFile(fileId);
            showMessage(t('fileDeleted'));
            // Recargar la lista de archivos correcta (carpeta actual o todos)
            if (currentFolder) {
                loadFiles(currentFolder.id);
            } else {
                loadAllUserFiles();
            }
        } catch (error) { showMessage(t('errorDeleteFile'), 'error'); }
        closeModal();
    };
    
    const closeModal = () => setModalState({ isOpen: false });


    // --- MANEJADORES DE ESTADO Y NOTAS (Semaforización) ---

    // Esta función es para los botones de "Semaforización"
    const handleUpdateFileDetails = async (file, details) => {
        try {
            const { data: updatedFile } = await fileService.updateFileDetails(file.id, details);
            // Actualizar AMBAS listas (la de carpeta y la global)
            setFiles(currentFiles =>
                currentFiles.map(f => f.id === updatedFile.id ? updatedFile : f)
            );
            setAllFiles(currentFiles =>
                currentFiles.map(f => f.id === updatedFile.id ? updatedFile : f)
            );
        } catch (error) {
            console.error("Error en handleUpdateFileDetails:", error);
            showMessage(t('errorUpdateFile'), 'error');
        }
    };

    // Esta función se llama al guardar desde el Modal de Notas
    const handleSaveNote = (file, noteText) => {
        // Al guardar la nota, el estado pasa a "in_process"
        handleUpdateFileDetails(file, { status: 'in_process', nota: noteText });
    };

    // --- Lógica de Filtrado y Agrupación ---
    const filteredFiles = useMemo(() => {
        const sourceFiles = currentFolder ? files : allFiles;
        if (!searchTerm) return sourceFiles;
        return sourceFiles.filter(file =>
            file.nombre_original.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [files, allFiles, searchTerm, currentFolder]);
    
    const filteredFolders = useMemo(() => {
        if (!searchTerm) return folders;
        return folders.filter(folder =>
            folder.nombre.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [folders, searchTerm]);

    // Agrupación de archivos
    const groupedFiles = useMemo(() => {
        const pending = [], in_process = [], done = [];
        filteredFiles.forEach(f => {
            if (f.status === 'done') done.push(f);
            else if (f.status === 'in_process') in_process.push(f);
            else pending.push(f);
        });
        return { pending, in_process, done };
    }, [filteredFiles]);

    const globalGroupedFiles = useMemo(() => {
        const pending = [], in_process = [], done = [];
        const filesToGroup = allFiles.filter(file =>
            file.nombre_original.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        filesToGroup.forEach(f => {
            if (f.status === 'done') done.push(f);
            else if (f.status === 'in_process') in_process.push(f);
            else pending.push(f);
        });
        return { pending, in_process, done };
    }, [allFiles, searchTerm]);


    // Objeto de handlers para pasar a FileListGroup
    const fileListHandlers = {
        onStatusChange: handleUpdateFileDetails,
        onNoteClick: setNoteModalFile,
        editingFile: editingFile,
        onUpdateFile: handleUpdateFile,
        onSetEditingFile: setEditingFile,
        onDeleteFile: handleDeleteFile,
        t: t,
        RENDER_BACKEND_URL: RENDER_BACKEND_URL, // Pasar la URL
    };

    // --- RENDERIZADO ---
    return (
        <div className="dashboard-container">
            {/* TOAST MESSAGE */}
            {message && (
                <div className={`toast-message ${message.type || 'info'}`}>
                    <i className={
                        message.type === 'success' ? 'fas fa-check-circle' :
                        message.type === 'error' ? 'fas fa-exclamation-circle' :
                        'fas fa-info-circle'
                    }></i>
                    {message.text}
                </div>
            )}
            
            {/* MODALS */}
            <ConfirmModal
                isOpen={modalState.isOpen}
                title={modalState.title}
                message={modalState.message}
                onConfirm={modalState.onConfirm}
                onClose={closeModal}
                t={t}
            />

            {noteModalFile && (
                <NoteModal
                    file={noteModalFile}
                    onClose={() => setNoteModalFile(null)}
                    onSave={handleSaveNote}
                    t={t}
                />
            )}

            {/* NAVBAR */}
            <DashboardNavbar 
                user={user} 
                language={language} 
                setLanguage={setLanguage} 
                t={t}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            
            <div className="dashboard-body">
            
                {/* Columna 1: Sidebar de Carpetas */}
                <div className="sidebar">
                    <h3>{t('myFolders')}</h3>
                
                    {path.length > 0 && <button onClick={handleGoBack} className="back-button"><i className="fas fa-arrow-left"></i> {t('goBackTo')} {path[path.length - 1]?.nombre || t('root')}</button>}

                    <form onSubmit={handleCreateFolder} className="folder-form">
                        <input type="text" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder={t('newFolderPlaceholder')}/>
                        <button type="submit" disabled={!newFolderName.trim()}>
                            <i className="fas fa-plus"></i>
                        </button>
                    </form>
                
                    <ul className="folder-list">
                        {filteredFolders.map((folder, index) => (
                            <li key={folder.id} 
                                className={currentFolder?.id === folder.id ? 'active' : ''}
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <span className="item-name" onClick={() => handleFolderClick(folder)}>
                                    <i className="fas fa-folder"></i> {folder.nombre}
                                </span>
                                <div className="actions">
                                    <button onClick={() => setEditingFolder(folder)} title={t('rename')}><i className="fas fa-pen"></i></button>
                                    <button onClick={() => handleDeleteFolder(folder.id)} title={t('delete')} className="delete-btn"><i className="fas fa-trash-alt"></i></button>
                                </div>
                            </li>
                        ))}
                        {folders.length > 0 && filteredFolders.length === 0 && (
                            <div className="empty-state-small">
                                <p>{t('noFoldersFound')}</p>
                            </div>
                        )}
                    </ul>
                </div>
            
                {/* Columna 2 & 3: Contenido Principal y Chat */}
                <div className="main-content">
                    <div className="files-section">
                        
                        {/* Renderiza el contenido de Home o la carpeta */}
                        {mainView === 'folder' && currentFolder ? (
                            // --- A. VISTA DE CARPETA ---
                            <>
                                <div className="main-content-header">
                                    <h2><i className="fas fa-folder-open"></i> {currentFolder.nombre}</h2>
                                    <Breadcrumbs path={path} currentFolder={currentFolder} onCrumbClick={handleCrumbClick} t={t} />
                                </div>

                                <form onSubmit={handleUploadFile} className="upload-form">
                                    <label htmlFor="fileInput" className="custom-file-upload">
                                        <i className="fas fa-cloud-upload-alt"></i>
                                        {selectedFile ? selectedFile.name : t('selectFile')}
                                    </label>
                                    <input type="file" id="fileInput" onChange={handleFileChange} />
                                    <button type="submit" disabled={!selectedFile || uploading} className="btn btn-success">
                                        {uploading ? t('uploading') : t('uploadFile')}
                                    </button>
                                </form>
                                
                                {message && <p className="message">{message}</p>}

                                {/* Grupos de Archivos (PENDING, IN PROCESS, DONE) */}
                                {['pending', 'in_process', 'done'].map(statusKey => (
                                    <FileListGroup
                                        key={statusKey}
                                        title={t(statusKey)}
                                        files={groupedFiles[statusKey]}
                                        {...fileListHandlers}
                                    />
                                ))}

                                {/* Estados vacíos */}
                                {files.length === 0 && !uploading && !searchTerm && (
                                    <div className="empty-state">
                                        <i className="fas fa-box-open"></i>
                                        <h3>{t('emptyFolderTitle')}</h3>
                                        <p>{t('emptyFolderMessage')}</p>
                                    </div>
                                )}
                                {files.length > 0 && filteredFiles.length === 0 && searchTerm && (
                                    <div className="empty-state">
                                        <i className="fas fa-search-minus"></i>
                                        <h3>{t('noResultsTitle')}</h3>
                                        <p>{t('noResultsMessage', { searchTerm: searchTerm })}</p>
                                    </div>
                                )}
                            </>
                        ) : (
                            // --- B. VISTA DE INICIO (Home Hub) ---
                            <>
                                {mainView === 'home' ? (
                                    <HomePageCards 
                                        onNavigate={setMainView} 
                                        t={t}
                                        groupedFiles={globalGroupedFiles}
                                        fileListHandlers={fileListHandlers}
                                    />
                                ) : (
                                    <ApartadoView 
                                        viewName={mainView} 
                                        onGoHome={() => setMainView('home')} 
                                        t={t} 
                                    />
                                )}
                            </>
                        )}
                    </div>
                
                    {/* Columna 3: Chat de IA */}
                    <div className="chat-sidebar">
                        <ChatComponent />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
