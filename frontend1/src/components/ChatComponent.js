import React, { useState } from 'react';
import axios from 'axios';
import '../styles/ChatComponent.css';

const ChatComponent = () => {
    const [messages, setMessages] = useState([{ sender: 'bot', text: '¡Hola! Soy Gestor IA. ¿En qué puedo ayudarte hoy?' }]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const token = localStorage.getItem('user_token');
            const response = await axios.post(`${RENDER_BACKEND_URL}/api/chat`, 
                { message: input },
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            const botMessage = { sender: 'bot', text: response.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            const errorMessage = { sender: 'bot', text: 'Lo siento, hubo un error al conectar con la IA.' };
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
                {isLoading && <div className="message bot">Pensando...</div>}
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