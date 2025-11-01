import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import chatService from '../services/chatService'; // El servicio que creamos antes
import { UserContext } from '../App'; // Para saber quién eres (currentUser)
import '../styles/UserChatWindow.css'; // Crearemos este archivo CSS después

// URL del backend donde corre Socket.io
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';
const socket = io(RENDER_BACKEND_URL);

/**
 * Componente de la ventana de chat individual para chatear con un amigo.
 * @param {object} friend - El objeto del usuario amigo (ej: {id, nombre, foto_perfil_url})
 * @param {function} onClose - Función para cerrar esta ventana de chat
 */
const UserChatWindow = ({ friend, onClose }) => {
    const { user: currentUser } = useContext(UserContext); // Obtenemos el usuario logueado (tú)
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const messagesEndRef = useRef(null);

    // Función para hacer scroll al final
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // 1. Cargar historial y unirse a la sala de Socket.io
    useEffect(() => {
        if (!currentUser || !friend) return;

        // A. Unirse a la sala personal de Socket.io
        // (El backend nos enviará mensajes a esta "sala" cuando alguien nos escriba)
        socket.emit('join_room', currentUser.id);

        // B. Cargar el historial de chat
        const fetchHistory = async () => {
            setIsLoading(true);
            try {
                // Usamos el servicio que creamos en el paso anterior
                const response = await chatService.getHistory(friend.id);
                setMessages(response.data);
            } catch (error) {
                console.error("Error cargando historial de chat:", error);
                // (Podríamos mostrar un mensaje de error en el chat)
            } finally {
                setIsLoading(false);
            }
        };

        fetchHistory();

    }, [currentUser, friend]); // Se ejecuta si el amigo o el usuario cambian

    // 2. Escuchar mensajes nuevos en tiempo real
    useEffect(() => {
        // Función para manejar el mensaje entrante
        const handleReceiveMessage = (data) => {
            // Solo añadir el mensaje si es de la persona con la que estamos chateando
            if (data.sender_id === friend.id) {
                setMessages(prev => [...prev, data]);
            }
        };

        socket.on('receive_private_message', handleReceiveMessage);

        // Limpieza: dejar de escuchar cuando el componente se desmonte
        return () => {
            socket.off('receive_private_message', handleReceiveMessage);
        };
    }, [friend.id]); // Volver a escuchar solo si el amigo (ID) cambia

    // 3. Hacer scroll al final cuando los mensajes cambian
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 4. Enviar un mensaje
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || !currentUser || !friend) return;

        const messageData = {
            sender_id: currentUser.id,
            receiver_id: friend.id,
            contenido: input
        };

        // A. Enviar el mensaje al servidor (que lo guarda en BD y lo reenvía)
        socket.emit('send_private_message', messageData);

        // B. Añadir nuestro propio mensaje a la UI inmediatamente (Optimistic Update)
        setMessages(prev => [...prev, { ...messageData, created_at: new Date().toISOString() }]);
        setInput('');
    };

    // --- Renderizado ---
    return (
        <div className="user-chat-window">
            <div className="user-chat-header" onClick={onClose}>
                <img src={friend.foto_perfil_url} alt={friend.nombre} />
                <span>{friend.nombre}</span>
                <button className="close-chat-btn" onClick={onClose}>&times;</button>
            </div>
            <div className="user-chat-messages">
                {isLoading && <div className="chat-loading">Cargando historial...</div>}
                {!isLoading && messages.map((msg, index) => (
                    <div 
                        key={index} 
                        // Determina si el mensaje es 'sent' (nuestro) o 'received' (del amigo)
                        className={`msg ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`}
                    >
                        {msg.contenido}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form className="user-chat-form" onSubmit={handleSubmit}>
G               <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe un mensaje..."
                />
                <button type="submit">
                    <i className="fas fa-paper-plane"></i>
              € </button>
            </form>
        </div>
    );
};

export default UserChatWindow;