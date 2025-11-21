import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/ChatComponent.css';

const ChatComponent = ({ onReloadFolders, onReloadFiles }) => {
    const messagesEndRef = useRef(null);
    
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! Soy Gestor IA. ¿En qué puedo ayudarte hoy?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        const newMessages = [...messages, userMessage];
        
        setMessages(newMessages);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('user_token');
            
            // Historial para contexto
            const historyForBackend = newMessages.map((msg) => ({
                sender: msg.sender,
                text: msg.text
            }));

            const response = await axios.post(
                `${RENDER_BACKEND_URL}/api/chat`,
                { history: historyForBackend },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            const botMessage = {
                sender: 'bot',
                text: response.data.reply,
                type: response.data.type
            };

            // Acciones de recarga si es necesario
            if (response.data.type === 'success') {
                if (onReloadFolders) onReloadFolders();
                if (onReloadFiles) onReloadFiles();
            }

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = {
                sender: 'bot',
                text: 'Lo siento, hubo un error al conectar con la IA. Verifica tu conexión.',
                type: 'error'
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-wrapper" style={{ height: '100%' }}>
            <div className="panel chat-panel" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                
                {/* ÁREA DE MENSAJES */}
                <div className="messages-area">
                    {messages.map((msg, index) => (
                        <div key={index} className={`message ${msg.sender} ${msg.type || ''}`}>
                            {msg.text}
                        </div>
                    ))}
                    
                    {/* 🔥 ANIMACIÓN DE CARGA (BOLITAS SALTANDO) 🔥 */}
                    {isLoading && (
                        <div className="message bot">
                            <div className="typing-indicator">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                </div>

                {/* FORMULARIO DE ENVÍO */}
                <form onSubmit={handleSubmit} className="chat-form">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Pregúntale algo a la IA..."
                        disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading}>
                        {/* 🔥 ICONO SVG DEL AVIÓN DE PAPEL 🔥 */}
                        <svg viewBox="0 0 24 24" width="24" height="24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatComponent;