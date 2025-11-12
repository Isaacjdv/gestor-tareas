import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { UserContext } from '../App';
import '../styles/AuthForm.css';
import axios from 'axios';

// URL del backend para el chat público
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com'; // Asegúrate de que esta URL es correcta
const CHAT_API_URL = `${RENDER_BACKEND_URL}/api/public-chat`;

// --- Componente NavBar (USADO EN LOGIN PAGE) ---
const NavBar = ({ scrollToLogin }) => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const isScrolled = window.scrollY > 50;
            if (isScrolled !== scrolled) {
                setScrolled(isScrolled);
            }
        };

        document.addEventListener('scroll', handleScroll, { passive: true });
        return () => {
            document.removeEventListener('scroll', handleScroll);
        };
    }, [scrolled]);

    return (
        <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
            <div className="navbar-logo">
                <Link to="/">Gestor IA</Link>
            </div>

            <ul className="navbar-links">
                {/* Inicio (scroll en la misma página) */}
               

                {/* SUBMENÚ SOBRE NOSOTROS (APUNTA AL ABOUT) */}
                <li className="has-submenu">
                    <span className="submenu-label">
                        Sobre Nosotros ▾
                    </span>
                    <ul className="submenu">
                        <li>
                            <Link to="/about#about">Visión general</Link>
                        </li>
                        <li>
                            <Link to="/about#vision">Misión & Visión</Link>
                        </li>
                        <li>
                            <Link to="/about#timeline">Historia</Link>
                        </li>
                        <li>
                            <Link to="/about#team">Comunidad</Link>
                        </li>
                        <li>
                            <Link to="/about#faq">FAQ</Link>
                        </li>
                    </ul>
                </li>


                 <li>
                    <a href="#whatsapp">Características</a>
                </li>
               
                {/* Scroll al login en la misma landing */}
                <li>
                    <a href="#login-section" onClick={scrollToLogin}>
                        Empezar Ahora
                    </a>
                </li>

                
            </ul>
        </nav>
    );
};



// --- Componente del Chatbot de IA Público ---
const PublicChatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        { sender: 'bot', text: '¡Hola! Soy Gestor IA. ¿Tienes preguntas sobre la aplicación? (Ej: ¿Qué hace esta página?)' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = { sender: 'user', text: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            // Este endpoint NO requiere autenticación
            const response = await axios.post(CHAT_API_URL, { message: input });
            const botMessage = { sender: 'bot', text: response.data.reply };
            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            setMessages(prev => [...prev, { sender: 'bot', text: 'Lo siento, no puedo responder ahora mismo.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) {
        return (
            <button className="chat-bubble" onClick={() => setIsOpen(true)} aria-label="Abrir chat de ayuda">
                🤖
            </button>
        );
    }

    return (
        <div className="chat-window">
            <div className="chat-header">
                <h3>Asistente IA</h3>
                <button onClick={() => setIsOpen(false)} aria-label="Cerrar chat">×</button>
            </div>
            <div className="chat-messages">
                {messages.map((msg, index) => (
                    <div key={index} className={`message ${msg.sender}`}>
                        {msg.text}
                    </div>
                ))}
                {isLoading && <div className="message bot typing">...</div>}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="chat-input-form">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Escribe tu pregunta..."
                    disabled={isLoading}
                    aria-label="Escribe tu pregunta"
                />
                <button type="submit" aria-label="Enviar mensaje">➤</button>
            </form>
        </div>
    );
};

// --- Componente Principal de la Página de Login/Landing ---
const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const { setUser } = useContext(UserContext);
    const navigate = useNavigate();

    // Referencias para las secciones de scroll
    const [visibleSection, setVisibleSection] = useState('whatsapp');
    const sectionsRef = useRef([]);
    const loginSectionRef = useRef(null); // Ref para la sección de login

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setVisibleSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.6 } // La sección debe estar 60% visible
        );

        const currentRefs = sectionsRef.current;
        currentRefs.forEach(section => {
            if (section) observer.observe(section);
        });

        // Observar también la sección de login para el navbar
        if (loginSectionRef.current) observer.observe(loginSectionRef.current);


        return () => {
            currentRefs.forEach(section => {
                if (section) observer.unobserve(section);
            });
            if (loginSectionRef.current) observer.unobserve(loginSectionRef.current);
        };
    }, []);

    const scrollToLogin = (e) => {
        e.preventDefault();
        loginSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await authService.login(email, password);
            const userResponse = await authService.getSelf();
            setUser(userResponse.data);
            navigate('/dashboard');
        } catch (error) {
            setMessage(error.response?.data?.message || 'Error al iniciar sesión.');
        }
    };

    return (
        <div className="landing-container">
            <NavBar scrollToLogin={scrollToLogin} /> {/* <-- Navbar aquí */}

            {/* --- SECCIÓN 1: BIENVENIDA (Pantalla completa) --- */}
            <section className="scroll-section hero-section" style={{ backgroundImage: `url('https://www.telemundo.com/sites/nbcutelemundo/files/mujer-usando-computadora-y-.jpg')`}}>
                <div className="hero-content">
                    <h1>Tu Gestor Inteligente de Archivos</h1>
                    <p>Organiza tu vida digital. Sincroniza tus documentos, PDFs e imágenes con tu WhatsApp usando el poder de la IA.</p>
                    <a href="#login-section" onClick={scrollToLogin} className="cta-button">Empezar Ahora</a>
                </div>
            </section>

            {/* --- CONTENEDOR PARA LA HISTORIA CON SCROLL --- */}
            <div className="scroll-story-container">
                
                {/* --- LADO IZQUIERDO (Texto que cambia) --- */}
                <div className="story-text-panel">
                    <div className={`feature-text ${visibleSection === 'whatsapp' ? 'visible' : ''}`}>
                        <i className="fab fa-whatsapp story-icon"></i>
                        <h2>Integración Nativa con WhatsApp</h2>
                        <p>Consulta, crea, y gestiona tus archivos usando lenguaje natural. Transcribe audios, genera PDFs y recibe recordatorios, todo desde tu chat.</p>
                    </div>
                    <div className={`feature-text ${visibleSection === 'files' ? 'visible' : ''}`}>
                        <i className="fas fa-archive story-icon"></i>
                        <h2>Gestión Total de Archivos</h2>
                        <p>Tu dashboard centralizado te permite organizar todo en carpetas y subcarpetas. Sube cualquier tipo de archivo de forma segura.</p>
                    </div>
                    <div className={`feature-text ${visibleSection === 'ai' ? 'visible' : ''}`}>
                        <i className="fas fa-brain story-icon"></i>
                        <h2>Poderosa IA a tu Servicio</h2>
                        <p>Genera informes completos con imágenes, obtén resúmenes de tus tareas y mantén conversaciones naturales con un asistente que realmente entiende.</p>
                    </div>
                </div>

                {/* --- LADO DERECHO (Imágenes que cambian) --- */}
                <div className="story-image-panel">
                    <div className="image-stack">
                        <img 
                            src="https://i.ibb.co/KzSCMsZS/unnamed.jpg  " 
                            alt="Chat de WhatsApp" 
                            className={visibleSection === 'whatsapp' ? 'visible' : ''}
                        />
                        <img 
                            src="https://i.ibb.co/8D7gffDv/Chicos-viendo-el-programa.png" 
                            alt="Gestor de archivos" 
                            className={visibleSection === 'files' ? 'visible' : ''}
                        />
                        <img 
                            src="https://i.ibb.co/4wSLZnbB/Gemini-Generated-Image-e1vynee1vynee1vy.png" 
                            alt="Cerebro de IA" 
                            className={visibleSection === 'ai' ? 'visible' : ''}
                        />
                    </div>
                    {/* Referencias invisibles para el Intersection Observer */}
                    <div className="story-trigger" id="whatsapp" ref={el => sectionsRef.current[0] = el}></div>
                    <div className="story-trigger" id="files" ref={el => sectionsRef.current[1] = el}></div>
                    <div className="story-trigger" id="ai" ref={el => sectionsRef.current[2] = el}></div>
                </div>
            </div>
            
            {/* --- SECCIÓN 3: LOGIN --- */}
            <section id="login-section" className="scroll-section login-form-section" ref={loginSectionRef}>
                <form onSubmit={handleLogin} className="auth-form-landing">
                    <h2>Inicia Sesión</h2>
                    <p>Accede a tu dashboard para gestionar todo tu contenido.</p>
                    
                    <div className="input-container">
                        <i className="fas fa-user"></i>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            placeholder="Correo" 
                            required
                        />
                    </div>
                    
                    <div className="input-container">
                        <i className="fas fa-lock"></i>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            placeholder="Contraseña" 
                            required
                        />
                    </div>
                    
                    <div className="form-options">
                        <label>
                            <input type="checkbox" /> Recuérdame
                        </label>
                        <a href="/forgot-password">¿Olvidaste tu contraseña?</a>
                    </div>
                    
                    <button  type="submit">LOGIN</button>
                    
                    {message && <p className="message">{message}</p>}
                    
                    <p className="register-link">
                        ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
                    </p>
                </form>
            </section>

            {/* --- CHATBOT FLOTANTE --- */}
            <PublicChatbot />
        </div>
    );
};

export default LoginPage;

