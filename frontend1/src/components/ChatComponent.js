import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../styles/ChatComponent.css';

const ChatComponent = () => {
    // [MODIFICACIÓN] El mensaje inicial ayuda a establecer el tono y la función
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! Soy Gestor IA. Puedes preguntarme sobre tus archivos o pedirme crear/renombrar carpetas.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

    // Función para hacer scroll al final
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };
    useEffect(scrollToBottom, [messages]);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        
        // 1. Prepara el historial de mensajes a enviar (incluyendo el nuevo)
        const history = [...messages, userMessage];
        
        // 2. Actualiza el estado visible con el mensaje del usuario
        setMessages(history); 
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('user_token');

            // 3. Mapea el historial al formato que espera la API de IA (rol y contenido)
            const conversationHistory = history.map(msg => ({
                // El rol del bot en el backend es 'assistant' para el modelo
                role: msg.sender === 'user' ? 'user' : 'assistant', 
                content: msg.text
            }));
            
            // 4. Envía la conversación completa al backend
            const response = await axios.post(`${RENDER_BACKEND_URL}/api/chat`, 
                { history: conversationHistory },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            const botMessage = { sender: 'bot', text: response.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error("Error en el chat:", error);
            const errorMessage = { sender: 'bot', text: 'Lo siento, hubo un error al conectar con la IA o al procesar tu solicitud.' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="chat-container">
            <div className="messages-area">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && <div className="message bot typing">Pensando</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="chat-form">
                <input 
                    type="text" 
                    value={input} 
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Pregúntale algo a la IA..."
                    disabled={isLoading}
                />
                <button type="submit">➤</button>
            </form>
        </div>
    );
};

export default ChatComponent;
