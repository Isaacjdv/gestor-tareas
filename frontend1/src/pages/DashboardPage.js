/* eslint-disable react/prop-types */
import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

import folderService from '../services/folderService';
import fileService from '../services/fileService';
import authService from '../services/authService';
import userService from '../services/userService';
import notificationService from '../services/notificationService';

import { UserContext } from '../App';
import '../styles/DashboardPage.css';

import ChatComponent from '../components/ChatComponent';
import UserChatWindow from '../components/UserChatWindow';

/* ====================== URL BACKEND UNIVERSAL ====================== */
function getApiBase() {
  const viteUrl =
    (typeof import.meta !== 'undefined' &&
      import.meta &&
      import.meta.env &&
      import.meta.env.VITE_API_URL) ||
    null;
  const craUrl = typeof process !== 'undefined' ? process.env?.REACT_APP_API_URL : null;
  const windowUrl = typeof window !== 'undefined' ? window.__API_URL__ : null;
  return viteUrl || craUrl || windowUrl || 'https://gestor-tareas-backend-11hi.onrender.com';
}
const RENDER_BACKEND_URL = getApiBase();
const socket = io(RENDER_BACKEND_URL);

/* ====================== TRADUCCIONES ====================== */
const translations = {
  es: {
    searchPlaceholder: 'Buscar...',
    hello: 'Hola',
    logout: 'Cerrar Sesión',
    root: 'Inicio',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    rename: 'Renombrar',
    delete: 'Eliminar',
    noteModalTitle: 'Nota para',
    notePlaceholder: 'Escribe una nota o instrucciones...',
    saveNote: 'Guardar nota',
    welcomeTitle: 'Bienvenido a tu Espacio',
    welcomeMessage: 'Monitorea tus tareas, sube archivos y organiza tu flujo de trabajo.',
    homeCardAnalyticsTitle: 'Analítica',
    homeCardReportsTitle: 'Reportes',
    homeCardSettingsTitle: 'Ajustes',
    advantagesTitle: 'Ventajas del flujo',
    advantagesDesc: 'Automatiza procesos, colabora con tu equipo y mantén todo organizado.',
    myArea: 'Mi Área de Trabajo',
    pending: 'Pendiente',
    in_process: 'En proceso',
    done: 'Terminado',
    emptyFolderMessage: 'Esta carpeta está vacía. Sube un archivo para comenzar.',
    emptyFolderTitle: 'Sin archivos',
    noResultsTitle: 'Sin resultados',
    noResultsMessage: 'No se encontraron archivos que coincidan con "{searchTerm}".',
    myFolders: 'Mis Carpetas',
    goBackTo: 'Volver a',
    newFolderPlaceholder: 'Nueva carpeta...',
    selectFile: 'Selecciona un archivo',
    uploading: 'Subiendo...',
    uploadFile: 'Subir',
    folderCreated: 'Carpeta creada',
    folderUpdated: 'Carpeta actualizada',
    folderDeleted: 'Carpeta eliminada',
    errorCreateFolder: 'No se pudo crear la carpeta',
    errorUpdateFolder: 'No se pudo actualizar',
    errorDeleteFolder: 'No se pudo eliminar',
    errorLoadFolders: 'No se pudieron cargar las carpetas',
    errorLoadFiles: 'No se pudieron cargar los archivos',
    fileUploaded: 'Archivo subido',
    fileUpdated: 'Archivo actualizado',
    errorUploadFile: 'No se pudo subir el archivo',
    deleteFolderTitle: 'Eliminar carpeta',
    confirmDeleteFolder: '¿Seguro que deseas eliminar esta carpeta?',
    deleteFileTitle: 'Eliminar archivo',
    confirmDeleteFile: '¿Seguro que deseas eliminar este archivo?',
    addNote: 'Agregar nota',
    editNote: 'Editar nota',
    noFoldersFound: 'No se encontraron carpetas.',
    search_files: 'Archivos',
    search_folders: 'Carpetas',
    search_users: 'Amigos',
  },
  en: {
    searchPlaceholder: 'Search...',
    hello: 'Hi',
    logout: 'Logout',
    root: 'Home',
    cancel: 'Cancel',
    confirm: 'Confirm',
    rename: 'Rename',
    delete: 'Delete',
    noteModalTitle: 'Note for',
    notePlaceholder: 'Write a note or instructions...',
    saveNote: 'Save note',
    welcomeTitle: 'Welcome to your Home',
    welcomeMessage: 'Monitor tasks, upload files and organize your workflow.',
    homeCardAnalyticsTitle: 'Analytics',
    homeCardReportsTitle: 'Reports',
    homeCardSettingsTitle: 'Settings',
    advantagesTitle: 'Flow advantages',
    advantagesDesc: 'Automate processes, collaborate and keep everything tidy.',
    myArea: 'My Workspace',
    pending: 'Pending',
    in_process: 'In process',
    done: 'Done',
    emptyFolderMessage: 'This folder is empty. Upload a file to begin.',
    emptyFolderTitle: 'No files',
    noResultsTitle: 'No results',
    noResultsMessage: 'No files matched "{searchTerm}".',
    myFolders: 'My Folders',
    goBackTo: 'Go back to',
    newFolderPlaceholder: 'New folder...',
    selectFile: 'Select a file',
    uploading: 'Uploading...',
    uploadFile: 'Upload',
    folderCreated: 'Folder created',
    folderUpdated: 'Folder updated',
    folderDeleted: 'Folder deleted',
    errorCreateFolder: 'Failed to create folder',
    errorUpdateFolder: 'Failed to update',
    errorDeleteFolder: 'Failed to delete',
    errorLoadFolders: 'Failed to load folders',
    errorLoadFiles: 'Failed to load files',
    fileUploaded: 'File uploaded',
    fileUpdated: 'File updated',
    errorUploadFile: 'Failed to upload file',
    deleteFolderTitle: 'Delete folder',
    confirmDeleteFolder: 'Are you sure you want to delete this folder?',
    deleteFileTitle: 'Delete file',
    confirmDeleteFile: 'Are you sure you want to delete this file?',
    addNote: 'Add note',
    editNote: 'Edit note',
    noFoldersFound: 'No folders found.',
    search_files: 'Files',
    search_folders: 'Folders',
    search_users: 'Friends',
  },
};

/* ====================== PERSISTENCIA LOCAL NOTIS ====================== */
const LS_NOTIS_KEY = (uid) => `gestoria:notifications:${uid}`;

function loadLocalNotifications(userId) {
  if (!userId || typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LS_NOTIS_KEY(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalNotifications(userId, notifications) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_NOTIS_KEY(userId), JSON.stringify(notifications));
  } catch {
    /* ignore */
  }
}

/** Merge por remitente: suma counts y conserva el último mensaje */
function mergeBySender(existing, incoming) {
  const map = new Map();
  const put = (n) => {
    const id = n?.sender?.id;
    if (!id) return;
    if (!map.has(id)) {
      map.set(id, { ...n, count: n.count ?? 1 });
    } else {
      const cur = map.get(id);
      map.set(id, {
        ...cur,
        count: (cur.count ?? 0) + (n.count ?? 1),
        message: n.message || cur.message,
        sender: n.sender || cur.sender,
      });
    }
  };
  existing.forEach(put);
  incoming.forEach(put);
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.message?.created_at || 0).getTime();
    const tb = new Date(b.message?.created_at || 0).getTime();
    return tb - ta;
  });
}

/* =========================== MODALES =========================== */
const ConfirmModal = ({ isOpen, title, message, onConfirm, onClose, t }) => {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button onClick={onClose} className="modal-close-btn" title={t('cancel')}>&times;</button>
        </div>
        <div className="modal-body"><p>{message}</p></div>
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">{t('cancel')}</button>
          <button onClick={onConfirm} className="btn btn-danger">{t('confirm')}</button>
        </div>
      </div>
    </div>
  );
};

const NoteModal = ({ file, onClose, onSave, t }) => {
  const [noteText, setNoteText] = useState(file?.nota || '');
  const handleSave = () => { onSave(file, noteText); onClose(); };
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

/* ===================== AUX COMPONENTES ===================== */
const LanguageSwitcher = ({ language, setLanguage }) => {
  const toggleLanguage = () => setLanguage((lang) => (lang === 'es' ? 'en' : 'es'));
  return (
    <div className="language-switcher">
      <button onClick={toggleLanguage} className="btn btn-secondary btn-lang" title="Change Language">
        {language === 'es' ? 'EN' : 'ES'}
      </button>
    </div>
  );
};

const Breadcrumbs = ({ path, currentFolder, onCrumbClick, t }) => {
  const crumbs = [...path.filter((p) => p), currentFolder].filter((p) => p);
  return (
    <nav className="breadcrumbs">
      <span className="crumb" onClick={() => onCrumbClick(null)}><i className="fas fa-home"></i> {t('root')}</span>
      {crumbs.map((crumb, index) => (
        <React.Fragment key={crumb.id}>
          <span className="separator">&gt;</span>
          <span className="crumb" onClick={() => onCrumbClick(crumb, index)}>{crumb.nombre}</span>
        </React.Fragment>
      ))}
    </nav>
  );
};

const DashboardNavbar = ({
  user, language, setLanguage, t, searchTerm, setSearchTerm, searchFilter, setSearchFilter,
  hasUnread, onToggleNotificationPanel
}) => {
  const navigate = useNavigate();
  const handleLogout = () => { authService.logout(); navigate('/'); };

  return (
    <nav className="dashboard-navbar">
      <div className="navbar-logo"><a href="/dashboard">Gestor IA</a></div>

      <div className="navbar-search">
        <select className="search-filter" value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)}>
          <option value="files">{t('search_files')}</option>
          <option value="folders">{t('search_folders')}</option>
          <option value="users">{t('search_users')}</option>
        </select>
        <i className="fas fa-search"></i>
        <input
          type="text"
          placeholder={
            searchFilter === 'files' ? 'Buscar en archivos...' :
            searchFilter === 'folders' ? 'Buscar carpetas...' :
            'Buscar amigos...'
          }
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="navbar-user">
        <LanguageSwitcher language={language} setLanguage={setLanguage} />

        {/* Campanita (azul) */}
        <div className="notification-bell bell-blue" onClick={onToggleNotificationPanel} title="Notificaciones" role="button" aria-label="Notificaciones">
          <svg className="bell-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
            <path d="M12 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 006 14h12a1 1 0 00.707-1.707L18 11.586V8a6 6 0 00-6-6zm0 20a3 3 0 002.995-2.824L15 19h-6a3 3 0 002.824 2.995L12 22z"></path>
          </svg>
          {hasUnread && <div className="blinking-dot"></div>}
        </div>

        <span className="welcome-text">{t('hello')}, {user ? user.nombre : 'Usuario'}</span>
        <button onClick={handleLogout} className="btn btn-primary">{t('logout')}</button>
      </div>
    </nav>
  );
};

const HomePageCards = ({ onNavigate, t, groupedFiles, fileListHandlers }) => {
  const totalFiles = (groupedFiles.pending || []).length + (groupedFiles.in_process || []).length + (groupedFiles.done || []).length;
  const totalPending = (groupedFiles.pending || []).length;
  const totalDone = (groupedFiles.done || []).length;

  return (
    <div className="home-hub">
      <h2>{t('welcomeTitle')}</h2>
      <p className="home-subtitle">{t('welcomeMessage')}</p>

      <div className="home-card-grid">
        <div className="home-card" onClick={() => onNavigate('analytics')} style={{ backgroundColor: '#0A84FF', color: '#fff' }}>
          <i className="fas fa-chart-line card-icon"></i>
          <div className="card-overlay"><h3>{totalFiles} Archivos Totales</h3></div>
          <div className="card-footer"><h4>{t('homeCardAnalyticsTitle')}</h4></div>
        </div>
        <div className="home-card" onClick={() => onNavigate('reports')} style={{ backgroundColor: '#FF3B30', color: '#fff' }}>
          <i className="fas fa-file-alt card-icon"></i>
          <div className="card-overlay"><h3>{totalPending} Tareas Pendientes</h3></div>
          <div className="card-footer"><h4>{t('homeCardReportsTitle')}</h4></div>
        </div>
        <div className="home-card" onClick={() => onNavigate('settings')} style={{ backgroundColor: '#60d382ff', color: '#222' }}>
          <i className="fas fa-cog card-icon"></i>
          <div className="card-overlay"><h3>{totalDone} Tareas Terminadas</h3></div>
          <div className="card-footer"><h4>{t('homeCardSettingsTitle')}</h4></div>
        </div>
      </div>

      <div className="advantages-section">
        <div className="advantages-text">
          <h3>{t('advantagesTitle')}</h3>
          <p>{t('advantagesDesc')}</p>
        </div>
        <div className="advantages-image">
          <img src="https://placehold.co/600x400/2C2C2C/E0E0E0?text=Workflow" alt="Workflow Advantages" />
        </div>
      </div>

      <div className="mi-area-section">
        <h3 className="file-group-header">{t('myArea')}</h3>
        <FileListGroup title={t('pending')} files={groupedFiles.pending} {...fileListHandlers} />
        <FileListGroup title={t('in_process')} files={groupedFiles.in_process} {...fileListHandlers} />
        <FileListGroup title={t('done')} files={groupedFiles.done} {...fileListHandlers} />
        {totalFiles === 0 && (
          <div className="empty-state-small">
            <i className="fas fa-box-open" style={{ fontSize: '2rem', marginBottom: '1rem' }}></i>
            <p>{t('emptyFolderMessage')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ApartadoView = ({ viewName, onGoHome, t }) => {
  const getTitle = (name) => ({
    analytics: t('homeCardAnalyticsTitle'),
    reports: t('homeCardReportsTitle'),
    settings: t('homeCardSettingsTitle'),
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

const getFileIcon = (fileName) => {
  if (!fileName) return 'fas fa-file';
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

const FileListGroup = ({
  title, files, onStatusChange, onNoteClick, editingFile, onUpdateFile, onSetEditingFile, onDeleteFile, t
}) => {
  if (!files || files.length === 0) return null;

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
              <>
                <a
                  href={`${RENDER_BACKEND_URL}/${file.path_archivo?.replace(/\\/g, '/')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="item-name"
                >
                  <i className={getFileIcon(file.nombre_original)}></i>
                  <span>{file.nombre_original}</span>
                </a>

                {file.status === 'in_process' && file.nota && (
                  <div className="note-tooltip">
                    <i className="fas fa-info-circle"></i>
                    <div className="note-tooltip-text">{file.nota}</div>
                  </div>
                )}

                <div className="actions">
                  <button onClick={() => onSetEditingFile(file)} title={t('rename')}><i className="fas fa-pen"></i></button>
                  <button onClick={() => onDeleteFile(file.id)} title={t('delete')}><i className="fas fa-trash-alt"></i></button>
                </div>

                <div className="file-status-actions">
                  <button className="status-btn pending" title="Poner Pendiente" onClick={() => onStatusChange(file, { status: 'pending', nota: '' })}>
                    <i className="fas fa-exclamation-circle"></i>
                  </button>
                  <button className="status-btn in-process" title={file.nota ? 'Editar nota' : 'Agregar nota'} onClick={() => onNoteClick(file)}>
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

const UserSearchResults = ({ query, results, onOpenChat }) => {
  return (
    <div className="user-search-results">
      <div className="main-content-header">
        <h2>Resultados de Amigos para: "{query}"</h2>
      </div>
      <ul className="user-result-list">
        {results.length > 0 ? results.map(user => (
          <li className="user-result-item" key={user.id}>
            <img src={user.foto_perfil_url} alt={user.nombre} />
            <div className="user-info">
              <span className="user-name">{user.nombre}</span>
              <span className="user-email">{user.email}</span>
            </div>
            <button className="btn btn-primary" onClick={() => onOpenChat(user)}>
              <i className="fas fa-paper-plane"></i> Enviar Mensaje
            </button>
          </li>
        )) : (
          <div className="empty-state-small">
            <p>No se encontraron usuarios con ese nombre o correo.</p>
          </div>
        )}
      </ul>
    </div>
  );
};

const NotificationPanel = ({ notifications, onOpenChat, onClearNotifications }) => {
  return (
    <div className="notification-panel">
      <div className="notification-header">
        <h3>Notificaciones</h3>
        <button onClick={onClearNotifications}>Limpiar</button>
      </div>
      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="notification-empty">No tienes notificaciones nuevas.</div>
        ) : (
          notifications.map((noti, index) => (
            <div className="notification-item" key={index} onClick={() => onOpenChat(noti.sender)}>
              <img src={noti.sender.foto_perfil_url} alt={noti.sender.nombre} />
              <div className="notification-content">
                <strong>{noti.sender.nombre}</strong>
                <span>{noti.message?.contenido || 'Nuevo mensaje'}</span>
                {noti.count > 1 ? (
                  <span className="notification-count">({noti.count} nuevos)</span>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

/* ======================== DASHBOARD PAGE ======================== */
const DashboardPage = () => {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [message, setMessage] = useState(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [newFolderRename, setNewFolderRename] = useState('');
  const [editingFile, setEditingFile] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [path, setPath] = useState([]);
  const [language, setLanguage] = useState('es');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchFilter, setSearchFilter] = useState('users'); // CAMBIO
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [openChats, setOpenChats] = useState([]);
  const [modalState, setModalState] = useState({ isOpen: false });
  const [mainView, setMainView] = useState('home');
  const [noteModalFile, setNoteModalFile] = useState(null);

  // Notificaciones
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasUnread, setHasUnread] = useState(false);

  // CONTEXTO
  const { user } = useContext(UserContext);

  // t() traducción
  const t = (key, params = {}) => {
    let text = translations[language][key] || translations['es'][key] || key;
    if (text) Object.keys(params).forEach(k => { text = text.replace(`{${k}}`, params[k]); });
    return text;
  };

  /* -------------------- PERSISTENCIA DE NOTIFICACIONES -------------------- */
  useEffect(() => {
    if (!user?.id) return;

    // 1) Cargar locales inmediatamente
    const local = loadLocalNotifications(user.id);
    setNotifications(local);
    setHasUnread(local.length > 0);

    // 2) Luego pedir al backend y MERGE con las locales
    (async () => {
      try {
        const summary = await notificationService.getUnreadSummary(user.id);
        const fromBackend = (summary || []).map(row => ({
          sender: {
            id: row.sender_id,
            nombre: row.nombre || `Usuario ${row.sender_id}`,
            foto_perfil_url: row.foto_perfil_url || 'https://placehold.co/50x50/E0E0E0/121212?text=?'
          },
          message: { contenido: row.last_message, created_at: row.last_created_at },
          count: row.unread_count
        }));

        const merged = mergeBySender(local, fromBackend);
        setNotifications(merged);
        setHasUnread(merged.length > 0);
        saveLocalNotifications(user.id, merged);
      } catch (e) {
        console.error('Error cargando notificaciones persistidas:', e);
        // Si falla el backend, mantenemos las locales
        saveLocalNotifications(user.id, local);
      }
    })();
  }, [user?.id]);

  /* ------------------------------ EFECTOS ----------------------------- */
  useEffect(() => {
    if (user) {
      const folderId = currentFolder ? currentFolder.id : null;
      loadFolders(folderId);
      if (folderId) {
        setAllFiles([]);
        loadFiles(folderId);
      } else {
        setFiles([]);
        loadAllUserFiles();
      }
    }
  }, [currentFolder, user]);

  useEffect(() => {
    if (searchFilter === 'users' && searchTerm.trim() !== '') {
      const searchUsers = async () => {
        try {
          const response = await userService.search(searchTerm);
          setUserSearchResults(response.data);
        } catch (error) {
          console.error('Error buscando usuarios:', error);
          setUserSearchResults([]);
        }
      };
      const timer = setTimeout(() => { searchUsers(); }, 300);
      return () => clearTimeout(timer);
    } else {
      setUserSearchResults([]);
    }
  }, [searchTerm, searchFilter]);

  // Socket.io
  useEffect(() => {
    if (user?.id) {
      socket.emit('join_room', user.id);

      const folderListener = () => {
        loadFolders(currentFolder ? currentFolder.id : null);
      };
      socket.on('folders_updated', folderListener);

      const fileListener = () => {
        if (currentFolder) loadFiles(currentFolder.id);
        else loadAllUserFiles();
      };
      socket.on('files_updated', fileListener);

      const notificationListener = (data) => {
        const senderId = data.sender?.id ?? data.sender_id;
        const nombre = data.sender?.nombre || `Usuario ${senderId}`;
        const foto = data.sender?.foto_perfil_url || 'https://placehold.co/50x50/E0E0E0/121212?text=?';
        const lastMessage = {
          contenido: data.message?.contenido ?? data.contenido ?? '',
          created_at: data.message?.created_at ?? new Date().toISOString()
        };

        setNotifications(prevNotis => {
          const incoming = [{
            sender: { id: senderId, nombre, foto_perfil_url: foto },
            message: lastMessage,
            count: 1
          }];
          const merged = mergeBySender(prevNotis, incoming);
          // Guardar inmediatamente en localStorage
          saveLocalNotifications(user.id, merged);
          return merged;
        });
        setHasUnread(true);
      };
      socket.on('new_notification', notificationListener);

      return () => {
        socket.off('folders_updated', folderListener);
        socket.off('files_updated', fileListener);
        socket.off('new_notification', notificationListener);
      };
    }
  }, [user, currentFolder]);

  /* ------------------------------ LOADERS ----------------------------- */
  const loadFolders = async (parentId) => {
    try {
      const response = await folderService.getFolders(parentId);
      setFolders(response.data);
    } catch (error) {
      console.error('Error en loadFolders:', error);
      showMessage(t('errorLoadFolders'), 'error');
    }
  };

  const loadFiles = async (folderId) => {
    try {
      const response = await fileService.getFilesByFolder(folderId);
      setFiles(response.data);
    } catch (error) {
      console.error('Error en loadFiles:', error);
      showMessage(t('errorLoadFiles'), 'error');
    }
  };

  const loadAllUserFiles = async () => {
    try {
      const response = await fileService.getAllFiles();
      setAllFiles(response.data);
    } catch (error) {
      console.error('Error en loadAllUserFiles:', error);
      showMessage(t('errorLoadFiles'), 'error');
    }
  };

  /* ------------------------------ HELPERS ----------------------------- */
  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

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

  const handleOpenChat = async (userToChat) => {
    if (!openChats.find(chat => chat.id === userToChat.id)) {
      setOpenChats(prevChats => [userToChat, ...prevChats.slice(0, 2)]);
    }
    try {
      if (user?.id) await notificationService.markFromSender(user.id, userToChat.id);
    } catch (e) { /* noop */ }
    setNotifications(prev => {
      const filtered = prev.filter(n => n.sender.id !== userToChat.id);
      saveLocalNotifications(user.id, filtered);
      setHasUnread(filtered.length > 0);
      return filtered;
    });
  };

  const toggleNotificationPanel = () => {
    setIsNotificationOpen(prev => !prev);
  };

  const handleClearNotifications = async () => {
    try {
      if (user?.id) await notificationService.markAllRead(user.id);
    } catch (e) { /* noop */ }
    saveLocalNotifications(user?.id, []);
    setNotifications([]);
    setHasUnread(false);
  };

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    try {
      const parentId = currentFolder ? currentFolder.id : null;
      await folderService.createFolder(newFolderName, parentId);
      setNewFolderName('');
      showMessage(t('folderCreated'));
      loadFolders(parentId);
    } catch { showMessage(t('errorCreateFolder'), 'error'); }
  };

  const handleStartFolderRename = (folder) => {
    setEditingFolder(folder);
    setNewFolderRename(folder.nombre);
  };

  const handleUpdateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderRename.trim() || !editingFolder || newFolderRename.trim() === editingFolder.nombre) {
      setEditingFolder(null);
      return;
    }
    try {
      await folderService.updateFolder(editingFolder.id, newFolderRename);
      showMessage(t('folderUpdated'));
      setEditingFolder(null);
      setNewFolderRename('');
      loadFolders(currentFolder ? currentFolder.id : null);
      if (currentFolder && currentFolder.id === editingFolder.id) {
        setCurrentFolder({ ...currentFolder, nombre: newFolderRename });
      }
    } catch { showMessage(t('errorUpdateFolder'), 'error'); }
  };

  const handleDeleteFolder = (folderId) => {
    setModalState({
      isOpen: true,
      title: t('deleteFolderTitle'),
      message: t('confirmDeleteFolder'),
      onConfirm: () => confirmDeleteFolder(folderId)
    });
  };

  const confirmDeleteFolder = async (folderId) => {
    try {
      await folderService.deleteFolder(folderId);
      showMessage(t('folderDeleted'));
      loadFolders(currentFolder ? currentFolder.id : null);
    } catch { showMessage(t('errorDeleteFolder'), 'error'); }
    closeModal();
  };

  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!selectedFile || !currentFolder) { showMessage(t('selectFileAndFolder'), 'error'); return; }
    setUploading(true);
    showMessage(t('uploading'), 'info');
    try {
      await fileService.uploadFile(currentFolder.id, selectedFile);
      setSelectedFile(null);
      const input = document.getElementById('fileInput');
      if (input) input.value = '';
      loadFiles(currentFolder.id);
      showMessage(t('fileUploaded'));
    } catch (error) {
      showMessage(error.response?.data?.message || t('errorUploadFile'), 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateFile = async (e) => {
    e.preventDefault();
    if (!editingFile) return;
    try {
      await fileService.updateFile(editingFile.id, editingFile.nombre_original);
      showMessage(t('fileUpdated'));
      setEditingFile(null);
      if (currentFolder) loadFiles(currentFolder.id);
      else loadAllUserFiles();
    } catch (error) {
      console.error('Error en handleUpdateFile:', error);
      showMessage(t('errorUpdateFolder'), 'error');
    }
  };

  const handleDeleteFile = (fileId) => {
    setModalState({
      isOpen: true,
      title: t('deleteFileTitle'),
      message: t('confirmDeleteFile'),
      onConfirm: () => confirmDeleteFile(fileId)
    });
  };

  const confirmDeleteFile = async (fileId) => {
    try {
      await fileService.deleteFile(fileId);
      showMessage(t('fileDeleted'));
      if (currentFolder) loadFiles(currentFolder.id);
      else loadAllUserFiles();
    } catch { showMessage(t('errorDeleteFile'), 'error'); }
    closeModal();
  };

  const closeModal = () => setModalState({ isOpen: false });

  const handleUpdateFileDetails = async (file, details) => {
    try {
      const { data: updatedFile } = await fileService.updateFileDetails(file.id, details);
      setFiles((cur) => cur.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
      setAllFiles((cur) => cur.map((f) => (f.id === updatedFile.id ? updatedFile : f)));
    } catch (error) {
      console.error('Error en handleUpdateFileDetails:', error);
      showMessage(t('errorUpdateFolder'), 'error');
    }
  };

  const handleSaveNote = (file, noteText) => {
    handleUpdateFileDetails(file, { status: 'in_process', nota: noteText });
  };

  /* ------------------- FILTRO Y AGRUPACIÓN ------------------- */
  const filteredFiles = useMemo(() => {
    const sourceFiles = currentFolder ? files : allFiles;
    if (searchFilter === 'users') return [];
    if (!searchTerm) return sourceFiles;
    return sourceFiles.filter((file) =>
      file.nombre_original?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [files, allFiles, searchTerm, currentFolder, searchFilter]);

  // ⬇⬇ AJUSTE CLAVE: mantener carpetas visibles aunque el filtro esté en "users"
  const filteredFolders = useMemo(() => {
    if (searchFilter === 'users') return folders; // antes devolvía [], causando que desaparezcan
    if (!searchTerm) return folders;
    return folders.filter((folder) =>
      folder.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [folders, searchTerm, searchFilter]);

  const groupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    filteredFiles.forEach((f) => {
      if (f.status === 'done') done.push(f);
      else if (f.status === 'in_process') in_process.push(f);
      else pending.push(f);
    });
    return { pending, in_process, done };
  }, [filteredFiles]);

  const globalGroupedFiles = useMemo(() => {
    const pending = [], in_process = [], done = [];
    const filesToGroup =
      (searchFilter === 'users' || !searchTerm)
        ? allFiles
        : allFiles.filter((file) =>
            file.nombre_original?.toLowerCase().includes(searchTerm.toLowerCase())
          );

    filesToGroup.forEach((f) => {
      if (f.status === 'done') done.push(f);
      else if (f.status === 'in_process') in_process.push(f);
      else pending.push(f);
    });
    return { pending, in_process, done };
  }, [allFiles, searchTerm, searchFilter]);

  const fileListHandlers = {
    onStatusChange: handleUpdateFileDetails,
    onNoteClick: setNoteModalFile,
    editingFile: editingFile,
    onUpdateFile: handleUpdateFile,
    onSetEditingFile: setEditingFile,
    onDeleteFile: handleDeleteFile,
    t: t,
  };

  /* --------------------------- RENDER -------------------------- */
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
        searchFilter={searchFilter}
        setSearchFilter={setSearchFilter}
        hasUnread={hasUnread}
        onToggleNotificationPanel={() => setIsNotificationOpen(prev => !prev)}
      />

      <div className="dashboard-body">
        {/* Sidebar carpetas */}
        <div className="sidebar">
          <h3>{t('myFolders')}</h3>

          {path.length > 0 && (
            <button onClick={handleGoBack} className="back-button">
              <i className="fas fa-arrow-left"></i> {t('goBackTo')} {path[path.length - 1]?.nombre || t('root')}
            </button>
          )}

          <form onSubmit={handleCreateFolder} className="folder-form">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t('newFolderPlaceholder')}
            />
            <button type="submit" disabled={!newFolderName.trim()}>
              <i className="fas fa-plus"></i>
            </button>
          </form>

          <ul className="folder-list">
            {filteredFolders.map((folder, index) => (
              <li
                key={folder.id}
                className={currentFolder?.id === folder.id ? 'active' : ''}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                {editingFolder?.id === folder.id ? (
                  <form onSubmit={handleUpdateFolder} className="edit-form-folder">
                    <input
                      type="text"
                      value={newFolderRename}
                      onChange={(e) => setNewFolderRename(e.target.value)}
                      autoFocus
                    />
                    <button type="submit" title={t('rename')}><i className="fas fa-check"></i></button>
                    <button type="button" onClick={() => setEditingFolder(null)} title={t('cancel')}><i className="fas fa-times"></i></button>
                  </form>
                ) : (
                  <span className="item-name" onClick={() => handleFolderClick(folder)}>
                    <i className="fas fa-folder"></i> {folder.nombre}
                  </span>
                )}
                <div className="actions">
                  <button onClick={() => handleStartFolderRename(folder)} title={t('rename')}><i className="fas fa-pen"></i></button>
                  <button onClick={() => handleDeleteFolder(folder.id)} title={t('delete')}><i className="fas fa-trash-alt"></i></button>
                </div>
              </li>
            ))}
            {folders.length > 0 && filteredFolders.length === 0 && (
              <div className="empty-state-small"><p>{t('noFoldersFound')}</p></div>
            )}
          </ul>
        </div>

        {/* Contenido principal */}
        <div className="main-content">
          {(searchFilter === 'users' && searchTerm) ? (
            <UserSearchResults
              query={searchTerm}
              results={userSearchResults}
              onOpenChat={handleOpenChat}
            />
          ) : (
            <>
              {currentFolder ? (
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

                  <FileListGroup title={t('pending')} files={groupedFiles.pending} {...fileListHandlers} />
                  <FileListGroup title={t('in_process')} files={groupedFiles.in_process} {...fileListHandlers} />
                  <FileListGroup title={t('done')} files={groupedFiles.done} {...fileListHandlers} />

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
                      <p>{t('noResultsMessage', { searchTerm })}</p>
                    </div>
                  )}
                </>
              ) : (
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
            </>
          )}
        </div>

        {/* Chat de IA */}
        <div className="chat-sidebar">
          <ChatComponent
            onReloadFolders={() => loadFolders(currentFolder ? currentFolder.id : null)}
            onReloadFiles={() => {
              if (currentFolder) loadFiles(currentFolder.id);
              else loadAllUserFiles();
            }}
          />
        </div>
      </div>

      {/* Panel de Notificaciones */}
      {isNotificationOpen && (
        <NotificationPanel
          notifications={notifications}
          onOpenChat={handleOpenChat}
          onClearNotifications={handleClearNotifications}
        />
      )}

      {/* Ventanas de chat de Amigos */}
      <div className="chat-dock-container">
        {openChats.map(chatUser => (
          <UserChatWindow
            key={chatUser.id}
            friend={chatUser}
            onClose={() => setOpenChats(chats => chats.filter(c => c.id !== chatUser.id))}
          />
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
  