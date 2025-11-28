/* eslint-disable react/prop-types */
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import { UserContext } from '../App';
import '../styles/AuthForm.css'; 
import axios from 'axios';

// URL del backend
const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';
const CHAT_API_URL = `${RENDER_BACKEND_URL}/api/public-chat`;

/* =========================================
   NAVBAR (CON PREFIJOS DE CLASE _dash)
   ========================================= */
const NavBar = ({ scrollToLogin }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false); // ESTADO SUBMENÚ

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => document.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
    if (mobileMenuOpen) setSubmenuOpen(false); 
  };
  
  const closeMenu = () => {
    setMobileMenuOpen(false);
    setSubmenuOpen(false); 
  };

  const toggleSubmenu = (e) => {
      e.preventDefault();
      setSubmenuOpen(!submenuOpen);
  };

  return (
    <>
      {/* CLASES ACTUALIZADAS: nav-overlay -> _dash-nav-overlay */}
      <div className={`_dash-nav-overlay ${mobileMenuOpen ? 'open' : ''}`} onClick={closeMenu} />
      
      {/* CLASES ACTUALIZADAS: landing-navbar -> _dash-landing-navbar */}
      <nav className={`_dash-landing-navbar ${scrolled ? '_dash-scrolled' : ''}`}>
        <div className="_dash-navbar-logo">
          <Link to="/" onClick={closeMenu}>
            {/* CLASES ACTUALIZADAS: navbar-logo-img -> _dash-navbar-logo-img */}
            <img src="https://i.ibb.co/G4JcrC0v/852ae06c-511e-4480-8441-afd340897585.png" alt="Gesia AI" className="_dash-navbar-logo-img" />
          </Link>
        </div>

        {/* CLASES ACTUALIZADAS: mobile-toggle -> _dash-mobile-toggle */}
        <button className={`_dash-mobile-toggle ${mobileMenuOpen ? 'open' : ''}`} onClick={toggleMenu} aria-label="Menu">
          <span></span><span></span><span></span>
        </button>

        {/* CLASES ACTUALIZADAS: navbar-links -> _dash-navbar-links */}
        <ul className={`_dash-navbar-links ${mobileMenuOpen ? 'open' : ''}`}>
          
          {/* CLASES ACTUALIZADAS: has-submenu -> _dash-has-submenu */}
          <li className={`_dash-has-submenu ${submenuOpen ? 'open' : ''}`}>
            {/* CLASES ACTUALIZADAS: submenu-label -> _dash-submenu-label */}
            <span 
                className="_dash-submenu-label" 
                onClick={toggleSubmenu}
            >
                Sobre Nosotros <i className="fas fa-chevron-down" style={{ fontSize: '0.8rem', marginLeft: '5px', transform: submenuOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}></i>
            </span>
            {/* CLASES ACTUALIZADAS: submenu -> _dash-submenu */}
            <ul className="_dash-submenu">
              <li><Link to="/about#about" onClick={closeMenu}>Visión general</Link></li>
              <li><Link to="/about#vision" onClick={closeMenu}>Misión</Link></li>
              <li><Link to="/about#team" onClick={closeMenu}>Equipo</Link></li>
            </ul>
          </li>
          
          <li>
            <a href="#features" onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById('features');
              if(el) el.scrollIntoView({ behavior: 'smooth' });
              closeMenu();
            }}>Características</a>
          </li>
          
          {/* CLASES ACTUALIZADAS: nav-cta -> _dash-nav-cta */}
          <li>
            <a href="#login-section" onClick={(e) => { 
                scrollToLogin(e); 
                closeMenu(); 
            }} className="_dash-nav-cta">
                Empezar
            </a>
          </li>
        </ul>
      </nav>
    </>
  );
};
/* =========================================
   CARRUSEL (CON FLECHAS Y DOTS)
   ========================================= */
const FeatureCarousel = () => {
  const slides = [
    {
      id: 1,
      title: "Integración WhatsApp",
      text: "Envía audios, fotos o documentos a tu chat y la IA los organiza automáticamente en tu nube. Olvídate de subir archivos manualmente.",
      img: "https://i.ibb.co/KzSCMsZS/unnamed.jpg", 
      icon: "fab fa-whatsapp"
    },
    {
      id: 2,
      title: "Gestión de Archivos",
      text: "Tu dashboard centralizado. Crea carpetas, mueve documentos y mantén todo ordenado sin esfuerzo. Acceso seguro desde cualquier lugar.",
      img: "https://i.ibb.co/8D7gffDv/Chicos-viendo-el-programa.png",
      icon: "fas fa-folder-open"
    },
    {
      id: 3,
      title: "Inteligencia Artificial",
      text: "No solo guardamos tus archivos, los entendemos. Pide resúmenes de PDFs, transcripciones de audio o análisis de datos al instante.",
      img: "https://i.ibb.co/4wSLZnbB/Gemini-Generated-Image-e1vynee1vynee1vy.png",
      icon: "fas fa-brain"
    }
  ];

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = () => setCurrent(current === slides.length - 1 ? 0 : current + 1);
  const prevSlide = () => setCurrent(current === 0 ? slides.length - 1 : current - 1);

  // Auto-play
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => { nextSlide(); }, 6000);
    return () => clearInterval(interval);
    // eslint-disable-next-line
  }, [isPaused, current]);

  return (
    <div 
      className="carousel-section" 
      id="features"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="carousel-container">
        <button className="carousel-arrow left" onClick={prevSlide}>&#10094;</button>

        <div className="carousel-content-wrapper">
          <div className="carousel-badge">POTENCIA TU FLUJO</div>
          <h2 key={`h2-${current}`} className="fade-in-text">
            <i className={slides[current].icon}></i> {slides[current].title}
          </h2>
          <p key={`p-${current}`} className="fade-in-text">{slides[current].text}</p>
          
          <div className="carousel-dots">
            {slides.map((_, idx) => (
              <span key={idx} className={`dot ${current === idx ? 'active' : ''}`} onClick={() => setCurrent(idx)}></span>
            ))}
          </div>
        </div>

        <div className="carousel-image-wrapper">
          <div className="image-overlay-gradient"></div>
          <img src={slides[current].img} alt="Feature" className="carousel-img fade-in-img" key={`img-${current}`}/>
        </div>

        <button className="carousel-arrow right" onClick={nextSlide}>&#10095;</button>
      </div>
    </div>
  );
};

/* =========================================
   CHATBOT (SVG MANUAL PARA EL AVIÓN)
   ========================================= */
const PublicChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ sender: 'bot', text: '¡Hola! Soy Gestor IA. 🤖 ¿En qué te ayudo hoy?' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    setMessages(prev => [...prev, { sender: 'user', text: input }]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(CHAT_API_URL, { message: currentInput });
      setMessages(prev => [...prev, { sender: 'bot', text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error de conexión. Intenta más tarde.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <div className="chat-trigger-container">
        {/* TOOLTIP CON TEXTO ANIMADO */}
        <div className="chat-tooltip-wrapper">
           <span className="tooltip-text t-1">👋 Habla conmigo</span>
           <span className="tooltip-text t-2">🤖 Resuelvo dudas</span>
        </div>
        
        <button className="chat-bubble pulse-animation" onClick={() => setIsOpen(true)}>
          🤖
        </button>
      </div>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <div className="chat-header-info">
          <span className="status-dot"></span>
          <h3>Asistente IA</h3>
        </div>
        <button onClick={() => setIsOpen(false)} className="close-chat">×</button>
      </div>
      
      <div className="chat-messages">
        {messages.map((m, i) => <div key={i} className={`message ${m.sender}`}>{m.text}</div>)}
        {isLoading && <div className="message bot typing"><span>.</span><span>.</span><span>.</span></div>}
        <div ref={endRef} />
      </div>
      
      {/* INPUT CON BOTÓN SVG (SVG MANUAL) */}
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Escribe aquí..." 
            disabled={isLoading}
        />
        <button type="submit" disabled={!input.trim()} className="send-btn">
          {/* SVG del Avión de papel (Material Design) */}
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
             <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path>
          </svg>
        </button>
      </form>
    </div>
  );
};

/* =========================================
   PAGE PRINCIPAL (LOGIN)
   ========================================= */
const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { setUser } = useContext(UserContext);
  const navigate = useNavigate();
  const loginSectionRef = useRef(null);

  const scrollToLogin = (e) => {
    if (e) e.preventDefault();
    loginSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const data = await authService.login(email, password);
      if (data.user) setUser(data.user);
      else {
        const me = await authService.getSelf();
        setUser(me.data);
      }
      navigate('/dashboard');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  };

  return (
    <div className="landing-container">
      <NavBar scrollToLogin={scrollToLogin} />

      {/* SECCIÓN 1: HERO */}
      <section className="scroll-area hero-section" style={{ backgroundImage: `url('https://www.telemundo.com/sites/nbcutelemundo/files/mujer-usando-computadora-y-.jpg')` }}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <div className="hero-badge">NUEVA GENERACIÓN</div>
          <h1>Tu Gestor Inteligente</h1>
          <p>Sincroniza tus archivos de WhatsApp, organízalos y analízalos con el poder de la Inteligencia Artificial.</p>
          
          <div className="hero-buttons">
            <button onClick={scrollToLogin} className="cta-button primary-glow">Empezar Ahora</button>
            <button 
                onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })} 
                className="cta-button secondary-outline"
            >
                Ver Demo
            </button>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: CARRUSEL */}
      <section className="scroll-area carousel-wrapper">
        <FeatureCarousel />
      </section>

      {/* SECCIÓN 3: LOGIN (Glassmorphism Moderno) */}
      <section id="login-section" className="scroll-area login-full-screen" ref={loginSectionRef}>
        <div className="login-background-effect"></div>
        
        <form onSubmit={handleLogin} className="auth-form-landing">
          <div className="form-header">
            <h2>Bienvenido</h2>
            <p>Ingresa a tu espacio de trabajo</p>
          </div>
          
          <div className="input-group">
            <div className="input-container">
              <i className="fas fa-envelope"></i>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo electrónico" required />
            </div>
            <div className="input-container">
              <i className="fas fa-lock"></i>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" required />
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-container" style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
              <input type="checkbox" style={{width: 'auto'}} /> Recordarme
            </label>
            <a href="/forgot">¿Recuperar contraseña?</a>
          </div>
          
          <button type="submit" className="login-btn">INICIAR SESIÓN</button>
          
          {message && <p className="message-error">{message}</p>}
          
          <div className="register-footer">
            ¿Aún no tienes cuenta? <Link to="/register">Crear cuenta gratis</Link>
          </div>
        </form>
      </section>

      <PublicChatbot />
    </div>
  );
};

export default LoginPage;