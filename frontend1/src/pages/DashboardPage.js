/* eslint-disable react/prop-types */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import { UserContext } from '../App';
import '../styles/DashboardPage.css';
import ChatComponent from '../components/ChatComponent';

// URL de tu backend en Render
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

// --- Objeto de Traducciones ---
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
    // ... (traducciones en inglés)
    myArea: 'My Workspace',
  }
};
// --- (Fin de Traducciones) ---


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
  const handleLogout = () => navigate('/');
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
  return (
    <div className="home-hub">
      <h2>{t('welcomeTitle')}</h2>
      <p className="home-subtitle">{t('welcomeMessage')}</p>
      
      <div className="home-card-grid">
        <div className="home-card" onClick={() => onNavigate('analytics')}>
          <img src="https://placehold.co/600x400/3182CE/E0E0E0?text=Analytics" alt="Analytics" />
          <div className="card-overlay"><h3>{t('homeCardAnalyticsDesc')}</h3></div>
          <div className="card-footer"><h4>{t('homeCardAnalyticsTitle')}</h4></div>
        </div>
        <div className="home-card" onClick={() => onNavigate('reports')}>
          <img src="https://placehold.co/600x400/38A169/E0E0E0?text=Reports" alt="Reports" />
          <div className="card-overlay"><h3>{t('homeCardReportsDesc')}</h3></div>
          <div className="card-footer"><h4>{t('homeCardReportsTitle')}</h4></div>
        </div>
        <div className="home-card" onClick={() => onNavigate('settings')}>
          <img src="https://placehold.co/600x400/B0B0B0/121212?text=Settings" alt="Settings" />
          <div className="card-overlay"><h3>{t('homeCardSettingsDesc')}</h3></div>
          <div className="card-footer"><h4>{t('homeCardSettingsTitle')}</h4></div>
        </div>
      </div>

      {/* Sección de Ventajas */}
      <div className="advantages-section">
        <div className="advantages-text">
          <h3>{t('advantagesTitle')}</h3>
          <p>{t('advantagesDesc')}</p>
        </div>
        <div className="advantages-image">
          <img src="https://placehold.co/600x400/2C2C2C/E0E0E0?text=Workflow" alt="Workflow Advantages" />
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
        {groupedFiles.pending.length === 0 &&
        groupedFiles.in_process.length === 0 &&
        groupedFiles.done.length === 0 && (
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
        <span className="crumb" onClick={onGoHome}>{t('root')}</span>
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
  onUpdateFile,       // <--- Restaurado
  onSetEditingFile,   // <--- Restaurado
  onDeleteFile,       // <--- Restaurado
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
            style={{ animationDelay: `${index * 30}ms` }}
          >
            {editingFile?.id === file.id ? (
              // Formulario para renombrar
              <form onSubmit={onUpdateFile} className="edit-form">
                <input 
                  type="text" 
                  value={editingFile.nombre_original} 
                  onChange={(e) => onSetEditingFile({ ...editingFile, nombre_original: e.target.value })} 
                  autoFocus
                />
                <button type="submit" title="Guardar"><i className="fas fa-check"></i></button>
                <button type="button" onClick={() => onSetEditingFile(null)} title="Cancelar"><i className="fas fa-times"></i></button>
              </form>
            ) : (
              // Vista normal del archivo
              <>
                <a href={`${RENDER_BACKEND_URL}/${file.path_archivo.replace(/\\/g, '/')}`} target="_blank" rel="noopener noreferrer" className="item-name">
                  <i className={getFileIcon(file.nombre_original)}></i>
                  <span>{file.nombre_original}</span>
                </a>
                
                {/* Tooltip de Nota */}
                {file.status === 'in_process' && file.nota && (
                  <div className="note-tooltip">
                    <i className="fas fa-info-circle"></i>
                    <div className="note-tooltip-text">{file.nota}</div>
                  </div>
                )}

                {/* Acciones de Renombrar y Eliminar */}
                <div className="actions">
                  <button onClick={() => onSetEditingFile(file)} title={t('rename')}><i className="fas fa-pen"></i></button>
                  <button onClick={() => onDeleteFile(file.id)} title={t('delete')}><i className="fas fa-trash-alt"></i></button>
                </div>
                
                {/* Acciones de Estado (Semaforización) */}
                <div className="file-status-actions">
                  <button className="status-btn pending" title="Poner Pendiente" onClick={() => onStatusChange(file, { status: 'pending', nota: '' })}>
                    <i className="fas fa-exclamation-circle"></i>
                  </button>
                  <button className="status-btn in-process" title={file.nota ? t('editNote') : t('addNote')} onClick={() => onNoteClick(file)}>
                    <i className="fas fa-pencil-alt"></i>
                  </button>
                  <button className="status-btn done" title="Marcar Terminado" onClick={() => onStatusChange(file, { status: 'done' })}>
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
    if (text) { // Asegurarse de que text no sea undefined
      Object.keys(params).forEach(paramKey => {
        text = text.replace(`{${paramKey}}`, params[paramKey]);
      });
    }
    return text;
  };

  // --- EFECTOS ---
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
  }, [currentFolder, user]); // Se ejecuta cuando el usuario o la carpeta cambian

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
      await fileService.updateFile(editingFile.id, editingFile.nombre_original);
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


  // --- MANEJADORES DE ESTADO Y NOTAS ---

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
    handleUpdateFileDetails(file, { status: 'in_process', nota: noteText });
  };

  // --- Lógica de Filtrado (Búsqueda) ---
  const filteredFiles = useMemo(() => {
    if (!searchTerm) return files;
    return files.filter(file =>
      file.nombre_original.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, searchTerm]);
  
  const filteredFolders = useMemo(() => {
    if (!searchTerm) return folders;
    return folders.filter(folder =>
      folder.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm]);

  // Agrupación para la VISTA DE CARPETA
  const groupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    filteredFiles.forEach(f => {
      if (f.status === 'done') done.push(f);
      else if (f.status === 'in_process') in_process.push(f);
      else pending.push(f);
    });
    return { pending, in_process, done };
  }, [filteredFiles]);
  
  // Agrupación para la VISTA DE INICIO (Home)
  const globalGroupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    // Filtra 'allFiles' por el 'searchTerm'
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
  };

  // --- RENDERIZADO ---
  return (
    <div className="dashboard-layout">
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
                  <button onClick={() => handleDeleteFolder(folder.id)} title={t('delete')}><i className="fas fa-trash-alt"></i></button>
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
      
        {/* Columna 2: Contenido Principal (Archivos) */}
        <div className="main-content">
          
          {currentFolder ? (
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
            
              {/* Renderizado por grupos de estado (de la carpeta) */}
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
                  groupedFiles={globalGroupedFiles} // <-- Pasa los archivos globales
                  fileListHandlers={fileListHandlers} // <-- Pasa los handlers
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
  );
};

export default DashboardPage;

