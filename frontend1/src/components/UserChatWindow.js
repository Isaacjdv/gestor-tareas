import React, { useState, useEffect, useRef, useContext } from 'react';
import { io } from 'socket.io-client';
import chatService from '../services/chatService';
import { UserContext } from '../App';
import '../styles/UserChatWindow.css';

const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';
const socket = io(RENDER_BACKEND_URL);

const UserChatWindow = ({ friend, onClose }) => {
  const { user: currentUser } = useContext(UserContext);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!currentUser || !friend) return;
    socket.emit('join_room', currentUser.id);

    const fetchHistory = async () => {
      setIsLoading(true);
      try {
        const response = await chatService.getHistory(friend.id);
        setMessages(response.data);
      } catch (error) {
        console.error('Error cargando historial de chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
  }, [currentUser, friend]);

  useEffect(() => {
    const handleReceiveMessage = (data) => {
      if (data.sender_id === friend.id) {
        setMessages((prev) => [...prev, data]);
      }
    };
    socket.on('receive_private_message', handleReceiveMessage);
    return () => {
      socket.off('receive_private_message', handleReceiveMessage);
    };
  }, [friend.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || !currentUser || !friend) return;

    const messageData = {
      sender_id: currentUser.id,
      receiver_id: friend.id,
      contenido: input,
    };

    socket.emit('send_private_message', messageData);
    setMessages((prev) => [...prev, { ...messageData, created_at: new Date().toISOString() }]);
    setInput('');
  };

  return (
    <div className="user-chat-window">
      <div className="user-chat-header">
        <img src={friend.foto_perfil_url} alt={friend.nombre} />
        <span>{friend.nombre}</span>
        <button className="close-chat-btn" onClick={onClose}>&times;</button>
      </div>

      <div className="user-chat-messages">
        {isLoading && <div className="chat-loading">Cargando historial...</div>}
        {!isLoading &&
          messages.map((msg, index) => (
            <div
              key={index}
              className={`msg ${msg.sender_id === currentUser.id ? 'sent' : 'received'}`}
            >
              {msg.contenido}
            </div>
          ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="user-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit" aria-label="Enviar">
          <i className="fas fa-paper-plane" />
        </button>
      </form>
    </div>
  );
};

export default UserChatWindow;
