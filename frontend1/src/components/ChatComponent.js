import React, { useState, useEffect, useRef } from 'react'; 
import axios from 'axios';
import '../styles/ChatComponent.css';

// El componente ahora acepta onReloadFolders y onReloadFiles como props
const ChatComponent = ({ onReloadFolders, onReloadFiles }) => {
    // Referencia para manejar el scroll automático
    const messagesEndRef = useRef(null);
    
    // Estado principal de la conversación
    const [messages, setMessages] = useState([{ sender: 'bot', text: '¡Hola! Soy Gestor IA. ¿En qué puedo ayudarte hoy?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

    // Efecto para hacer scroll al final cada vez que se actualizan los mensajes
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        
        // 1. Acumular el mensaje del usuario y limpiar input
        const newMessages = [...messages, userMessage];
        setMessages(newMessages); 
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('user_token');
            
            // 2. Preparar el historial para el backend (solo sender y text)
            const historyForBackend = newMessages.map(msg => ({
                sender: msg.sender,
                text: msg.text 
            }));
            
            // 3. Enviar el historial completo para retención de memoria
            const response = await axios.post(`${RENDER_BACKEND_URL}/api/chat`, 
                { history: historyForBackend }, // Envía el array completo
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            // 4. Procesar la respuesta del bot
            const botMessage = { 
                sender: 'bot', 
                text: response.data.reply,
                type: response.data.type // Puede ser 'success', 'error', o undefined
            };
            
            // 5. [LÓGICA CLAVE DE RECARGA SIN REFRESCAR]
            // Si el backend devuelve type: 'success' (indicando que se creó/editó/eliminó algo)
            if (response.data.type === 'success') {
                if (onReloadFolders) onReloadFolders();
                if (onReloadFiles) onReloadFiles();
            }

            // 6. Actualizar la conversación
            setMessages(prev => [...prev, botMessage]);

        } catch (error) {
            // Manejo de error de red o respuesta HTTP 500
            const errorMessage = { 
                sender: 'bot', 
                text: 'Lo siento, hubo un error al conectar con la IA o al procesar tu solicitud. Revisa el backend.', 
                type: 'error' 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="messages-area">
                {messages.map((msg, index) => (
                    // El campo msg.type se usa para estilos de error/éxito si el backend lo devuelve
                    <div key={index} className={`message ${msg.sender} ${msg.type || ''}`}>
                        {msg.text}
                    </div>
                ))}
                {/* Mostrar el indicador de carga si isLoading es true */}
                {isLoading && (
                    <div className="message bot typing"></div>
                )}
                <div ref={messagesEndRef} /> {/* Elemento para el scroll */}
            </div>
            <form onSubmit={handleSubmit} className="chat-form">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pregúntale algo a la IA..."
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    <i className="fas fa-paper-plane"></i>
                </button>
            </form>
        </div>
    );
};

export default ChatComponent;