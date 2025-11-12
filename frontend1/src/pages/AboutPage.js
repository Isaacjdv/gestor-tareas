// src/pages/AboutPage.js
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/AuthForm.css';

const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';
const CHAT_API_URL = `${RENDER_BACKEND_URL}/api/public-chat`;

/* ================= NAVBAR ================= */

const NavBar = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 50;
      if (isScrolled !== scrolled) setScrolled(isScrolled);
    };

    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => document.removeEventListener('scroll', handleScroll);
  }, [scrolled]);

  return (
    <nav className={`landing-navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="navbar-logo">
        <Link to="/">Gestor IA</Link>
      </div>

      <ul className="navbar-links">
        <li>
          <Link to="/">Inicio</Link>
        </li>

        {/* SUBMENÚ SOBRE NOSOTROS (SIN COMUNIDAD) */}
        <li className="has-submenu">
          <span className="submenu-label">
            Sobre Nosotros ▾
          </span>
          <ul className="submenu">
            <li><Link to="/about#about">Visión general</Link></li>
            <li><Link to="/about#vision">Misión & Visión</Link></li>
            <li><Link to="/about#timeline">Historia</Link></li>
            <li><Link to="/about#faq">FAQ</Link></li>
          </ul>
        </li>

        {/* Link directo solo a sección distinta del submenu */}
        <li>
          <a href="#features">Características</a>
        </li>

        <li>
          <Link to="/" className="navbar-cta">
            Iniciar Sesión
          </Link>
        </li>
      </ul>
    </nav>
  );
};

/* ================= CHAT IA ================= */

const PublicChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text:
        '👋 Hola, soy Gestor IA. Pregúntame sobre la plataforma, integración con WhatsApp, seguridad o cómo puede ayudarte en tus estudios y trabajo.'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await axios.post(CHAT_API_URL, { message: input });
      const botMessage = { sender: 'bot', text: res.data.reply };
      setMessages((prev) => [...prev, botMessage]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Lo siento, ahora mismo no puedo responder. Intenta nuevamente en unos minutos.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        className="chat-bubble"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir chat informativo de Gestor IA"
      >
        🤖
      </button>
    );
  }

  return (
    <div className="chat-window">
      <div className="chat-header">
        <h3>Asistente IA</h3>
        <button onClick={() => setIsOpen(false)} aria-label="Cerrar chat">
          ×
        </button>
      </div>
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.sender}`}>
            {msg.text}
          </div>
        ))}
        {isLoading && <div className="message bot typing" />}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="chat-input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregúntame sobre Gestor IA..."
          disabled={isLoading}
        />
        <button type="submit">➤</button>
      </form>
    </div>
  );
};

/* ================= PÁGINA ABOUT ================= */

const AboutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const sectionsRef = useRef({});
  const [visible, setVisible] = useState({});

  // Animar secciones al entrar en viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.id;
            setVisible((prev) => ({ ...prev, [id]: true }));
          }
        });
      },
      { threshold: 0.25 }
    );

    Object.values(sectionsRef.current).forEach((sec) => {
      if (sec) observer.observe(sec);
    });

    return () => {
      Object.values(sectionsRef.current).forEach((sec) => {
        if (sec) observer.unobserve(sec);
      });
    };
  }, []);

  // Scroll suave según el hash (/about#vision, etc.)
  useEffect(() => {
    if (location.hash) {
      const targetId = location.hash.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 150);
      }
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location]);

  const setRef = (id) => (el) => {
    sectionsRef.current[id] = el;
  };

  return (
    <div className="landing-container about-page">
      <NavBar />

      {/* ========== HERO SOBRE NOSOTROS ========== */}
      <section
        id="about"
        ref={setRef('about')}
        className={`scroll-section hero-section ${visible['about'] ? 'visible' : ''}`}
        style={{
          backgroundImage:
            "url('https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg')"
        }}
      >
        <div className="hero-content">
          <h1>Sobre Gestor IA</h1>
          <p>
            Gestor IA nace para transformar el desorden digital en un flujo claro:
            conecta tus chats, archivos, tareas y evidencias con una IA que entiende tu contexto.
          </p>
          <div className="hero-actions">
            <button className="cta-button" onClick={() => navigate('/')}>
              Ir al Login
            </button>
            <a
              href="#features"
              className="cta-button"
              style={{
                backgroundColor: 'transparent',
                border: '1px solid #007AFF'
              }}
            >
              Ver funcionalidades
            </a>
          </div>
        </div>
      </section>

      {/* ========== MISIÓN & VISIÓN ========== */}
      <section
        id="vision"
        ref={setRef('vision')}
        className={`scroll-section ${visible['vision'] ? 'visible' : ''}`}
        style={{
          flexDirection: 'column',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <h2 style={{ marginBottom: '20px' }}>Misión & Visión</h2>
          <div
            style={{
              display: 'flex',
              gap: '30px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}
          >
            <div
              className="about-block"
              style={{
                flex: '1 1 260px',
                background: '#1E1E1E',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid #333'
              }}
            >
              <h3>Nuestra Misión</h3>
              <p>
                Simplificar la gestión de información de estudiantes, docentes, profesionales
                y equipos, centralizando sus recursos y potenciándolos con una IA clara,
                rápida y accesible.
              </p>
            </div>
            <div
              className="about-block"
              style={{
                flex: '1 1 260px',
                background: '#1E1E1E',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid #333'
              }}
            >
              <h3>Nuestra Visión</h3>
              <p>
                Ser el asistente digital de referencia en entornos académicos y laborales,
                donde tareas, evidencias, documentos y comunicación conviven en armonía
                en una sola plataforma inteligente.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== FEATURES / DIFERENCIALES ========== */}
      <section
        id="features"
        ref={setRef('features')}
        className={`scroll-section ${visible['features'] ? 'visible' : ''}`}
        style={{
          flexDirection: 'column',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <h2>¿Qué hace único a Gestor IA?</h2>
        <div className="home-card-grid" style={{ marginTop: '30px' }}>
          <div className="home-card">
            <img
              src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
              alt="WhatsApp & IA"
            />
            <div className="card-overlay">
              <h3>Conecta tus conversaciones con tu información clave.</h3>
            </div>
            <div className="card-footer">
              <h4>Integración con WhatsApp</h4>
            </div>
          </div>
          <div className="home-card">
            <img
              src="https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg"
              alt="Dashboard organizado"
            />
            <div className="card-overlay">
              <h3>Todo tu contenido en una vista clara y moderna.</h3>
            </div>
            <div className="card-footer">
              <h4>Dashboard inteligente</h4>
            </div>
          </div>
          <div className="home-card">
            <img
              src="https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg"
              alt="IA"
            />
            <div className="card-overlay">
              <h3>Resúmenes, recordatorios, generación de documentos y más.</h3>
            </div>
            <div className="card-footer">
              <h4>IA aplicada a tu día a día</h4>
            </div>
          </div>
          <div className="home-card">
            <img
              src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg"
              alt="Colaboración"
            />
            <div className="card-overlay">
              <h3>Listo para equipos, proyectos y organizaciones.</h3>
            </div>
            <div className="card-footer">
              <h4>Escalable & colaborativo</h4>
            </div>
          </div>
        </div>
      </section>

      {/* ========== HISTORIA / TIMELINE ========== */}
      <section
        id="timeline"
        ref={setRef('timeline')}
        className={`scroll-section ${visible['timeline'] ? 'visible' : ''}`}
        style={{
          flexDirection: 'column',
          padding: '40px'
        }}
      >
        <h2>Cómo nace Gestor IA</h2>
        <ul
          className="timeline-list"
          style={{
            listStyle: 'none',
            padding: 0,
            marginTop: '30px',
            maxWidth: '900px'
          }}
        >
          <li style={{ display: 'flex', marginBottom: '20px' }}>
            <span
              className="timeline-badge"
              style={{
                marginRight: '15px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#007AFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}
            >
              1
            </span>
            <div className="timeline-content">
              <h4>El problema real</h4>
              <p>
                Archivos en chats, tareas en mil plataformas, PDFs perdidos y cero tiempo
                para ordenar. Se detecta la necesidad de un centro de mando único.
              </p>
            </div>
          </li>
          <li style={{ display: 'flex', marginBottom: '20px' }}>
            <span
              className="timeline-badge"
              style={{
                marginRight: '15px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#007AFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}
            >
              2
            </span>
            <div className="timeline-content">
              <h4>La idea</h4>
              <p>
                Unir mensajería, almacenamiento, automatización y asistencia IA:
                que el sistema entienda instrucciones en lenguaje natural y actúe.
              </p>
            </div>
          </li>
          <li style={{ display: 'flex' }}>
            <span
              className="timeline-badge"
              style={{
                marginRight: '15px',
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: '#007AFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '700'
              }}
            >
              3
            </span>
            <div className="timeline-content">
              <h4>La plataforma</h4>
              <p>
                Nace Gestor IA: dashboard web moderno, conexión con WhatsApp,
                generación de contenido, gestión de evidencias y espacio para crecer
                según las necesidades reales de usuarios y organizaciones.
              </p>
            </div>
          </li>
        </ul>
      </section>

      {/* ========== SECCIÓN TEAM (SIGUE EXISTIENDO, SOLO SIN LINK EN NAV) ========== */}
      <section
        id="team"
        ref={setRef('team')}
        className={`scroll-section ${visible['team'] ? 'visible' : ''}`}
        style={{
          flexDirection: 'column',
          padding: '40px',
          textAlign: 'center'
        }}
      >
        <h2>Creado desde la experiencia real</h2>
        <p
          style={{
            maxWidth: '800px',
            marginTop: '15px',
            marginInline: 'auto'
          }}
        >
          Gestor IA se construye desde la realidad de quienes viven entre entregas,
          prácticas, informes, proyectos y trabajo en equipo. No es solo un concepto:
          es una herramienta diseñada para adaptarse a tu ritmo.
        </p>
        <div
          className="team-tags"
          style={{
            marginTop: '20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px',
            justifyContent: 'center'
          }}
        >
          <span>#Estudiantes</span>
          <span>#Docentes</span>
          <span>#Investigadores</span>
          <span>#Freelancers</span>
          <span>#EquiposÁgiles</span>
          <span>#ProductividadReal</span>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section
        id="faq"
        ref={setRef('faq')}
        className={`scroll-section ${visible['faq'] ? 'visible' : ''}`}
        style={{
          flexDirection: 'column',
          padding: '40px',
          maxHeight: '100vh',
          overflowY: 'auto'
        }}
      >
        <h2>Preguntas Frecuentes</h2>

        <div className="faq-item" style={{ marginTop: '20px' }}>
          <h3>¿Necesito saber de IA para usar Gestor IA?</h3>
          <p>No. Escribir como siempre es suficiente: Gestor IA entiende y actúa.</p>
        </div>

        <div className="faq-item" style={{ marginTop: '15px' }}>
          <h3>¿Qué pasa con la seguridad de mis archivos?</h3>
          <p>
            La plataforma está pensada para entornos académicos y profesionales:
            autenticación, separación de usuarios y buenas prácticas en el backend.
          </p>
        </div>

        <div className="faq-item" style={{ marginTop: '15px' }}>
          <h3>¿Sirve solo para una persona?</h3>
          <p>
            No. Está diseñada para crecer: materias, grupos, equipos de trabajo,
            proyectos institucionales y más.
          </p>
        </div>
      </section>

      {/* ========== CTA FINAL ========== */}
      <section
        className="scroll-section"
        style={{
          flexDirection: 'column',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: '#0d0d0d'
        }}
      >
        <h2>¿Listo para organizar tu caos digital?</h2>
        <p style={{ marginTop: '10px' }}>
          Vuelve al inicio, inicia sesión o crea tu cuenta y deja que Gestor IA trabaje contigo.
        </p>
        <div className="hero-actions" style={{ marginTop: '20px' }}>
          <button className="cta-button" onClick={() => navigate('/')}>
            Ir al Login
          </button>
          <Link
            to="/register"
            className="cta-button"
            style={{ backgroundColor: 'transparent', border: '1px solid #007AFF' }}
          >
            Crear cuenta
          </Link>
        </div>
      </section>

      <PublicChatbot />
    </div>
  );
};

export default AboutPage;
