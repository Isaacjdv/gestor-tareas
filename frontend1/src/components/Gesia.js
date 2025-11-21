import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import '../styles/ChatComponent.css';

const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

const Gesia = ({ onReloadFolders, onReloadFiles, onOpenFolder }) => {
  const [supported, setSupported] = useState(true);
  const [hasTts, setHasTts] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]); 
  const [availableVoices, setAvailableVoices] = useState([]);

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);

  // Refs para mantener funciones actualizadas y evitar cierres obsoletos
  const onOpenFolderRef = useRef(onOpenFolder);
  const onReloadFoldersRef = useRef(onReloadFolders);
  const onReloadFilesRef = useRef(onReloadFiles);

  useEffect(() => { onOpenFolderRef.current = onOpenFolder; }, [onOpenFolder]);
  useEffect(() => { onReloadFoldersRef.current = onReloadFolders; }, [onReloadFolders]);
  useEffect(() => { onReloadFilesRef.current = onReloadFiles; }, [onReloadFiles]);
  useEffect(() => { isListeningRef.current = isListening; }, [isListening]);

  // 🟢 1. CARGA DE VOCES
  useEffect(() => {
    if (!('speechSynthesis' in window)) {
      setHasTts(false);
      return;
    }

    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
      }
    };

    loadVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // 🟢 2. CONFIGURACIÓN DE RECONOCIMIENTO DE VOZ Y TECLADO
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { setSupported(false); return; }
    
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'es-ES';

    recognition.onresult = (event) => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript + ' ';
      }
      let cleaned = text.trim();
      // Correcciones comunes de nombre
      cleaned = cleaned.replace(/(jessia|jessie|jessica|yesia)/gi, 'Gesia');
      setTranscript(cleaned);
      transcriptRef.current = cleaned;
    };

    recognition.onerror = (e) => console.error('Error voz:', e);
    recognitionRef.current = recognition;

    // --- EVENTOS DE TECLADO (SHIFT) ---
    const handleKeyDown = (e) => { 
      if (e.key === 'Shift' && !isListeningRef.current) {
        // MEJORA: Si el asistente habla, lo callamos al pulsar Shift para que nos escuche
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        startListening(); 
      }
    };
    
    const handleKeyUp = (e) => { if (e.key === 'Shift' && isListeningRef.current) stopListeningAndSend(); };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      try { recognition.stop(); } catch(e){}
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  function startListening() {
    if (!recognitionRef.current || isListeningRef.current) return;
    transcriptRef.current = '';
    setTranscript('');
    try { recognitionRef.current.start(); setIsListening(true); isListeningRef.current = true; } 
    catch (err) { console.error(err); }
  }

  async function stopListeningAndSend() {
    if (!recognitionRef.current || !isListeningRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    const finalText = transcriptRef.current.trim();
    transcriptRef.current = '';
    setTranscript('');
    if (finalText) await sendMessageToBackend(finalText);
  }

  async function sendMessageToBackend(text) {
    const token = localStorage.getItem('user_token');
    const userMessage = { sender: 'user', text };
    
    // Enviamos todo el historial al backend para contexto
    const historyForBackend = [...messages, userMessage].map(m => ({ sender: m.sender, text: m.text }));

    // MEJORA: Visualmente solo guardamos los últimos 2
    setMessages(prev => [...prev, userMessage].slice(-2));
    setIsSending(true);

    try {
      const response = await axios.post(
        `${RENDER_BACKEND_URL}/api/chat`,
        { history: historyForBackend },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const replyText = response.data.reply || '...';
      const replyType = response.data.type;

      // --- LÓGICA DE DETECCIÓN DE CARPETAS SEGURA ---
      const folderMatch = replyText.match(/(?:abriendo|entrar|ir|mostrar|ver|carpeta|folder|contenido de)\s+(?:a\s+|en\s+|la\s+|el\s+)?(?:carpeta|folder)?\s*["'*]*([a-zA-Z0-9_ áéíóúñ]+)["'*]*[:.]?/i);

      if (folderMatch && folderMatch[1]) {
        const folderName = folderMatch[1].replace(/['"*.:,]/g, '').trim();
        const textLower = replyText.toLowerCase();

        // MEJORA CRÍTICA: Palabras raíz que indican peligro.
        // "elimina" detecta: eliminar, eliminada, eliminado, eliminando.
        // "borra" detecta: borrar, borrado, borraste.
        // "crea" detecta: crear, creada, creando.
        const forbiddenWords = ['elimina', 'borra', 'crea', 'deshacer'];
        
        const isDangerousAction = forbiddenWords.some(word => textLower.includes(word));

        // Solo abrimos si NO es una acción peligrosa
        if (!isDangerousAction && onOpenFolderRef.current) {
            onOpenFolderRef.current(folderName);
        }
      }

      const botMessage = { sender: 'bot', text: replyText, type: replyType };
      
      // Visualmente solo guardamos los últimos 2 tras la respuesta también
      setMessages(prev => [...prev, botMessage].slice(-2));

      if (onReloadFoldersRef.current) onReloadFoldersRef.current();
      if (onReloadFilesRef.current) onReloadFilesRef.current();
      
      if (hasTts) speakText(replyText);

    } catch (error) {
      setMessages(prev => [...prev, { sender: 'bot', text: 'Error de conexión.' }].slice(-2));
    } finally {
      setIsSending(false);
    }
  }

  // 🟢 3. LÓGICA DE VOZ (PITCH SHIFT)
  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); // Reset audio por seguridad

    const utterance = new SpeechSynthesisUtterance(text);
    let voices = availableVoices;
    
    if (voices.length === 0) {
        voices = window.speechSynthesis.getVoices();
    }

    const femaleVoice = voices.find(v => 
        v.lang.includes('es') && 
        (v.name.includes('Sabina') || v.name.includes('Helena') || v.name.includes('Monica') || v.name.includes('Paulina') || v.name.includes('Zira'))
    );

    const anySpanish = voices.find(v => v.lang.includes('es'));

    const selectedVoice = femaleVoice || anySpanish || voices[0];

    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    if (selectedVoice && (selectedVoice.name.includes('Sabina') || selectedVoice.name.includes('Helena') || selectedVoice.name.includes('Monica'))) {
        utterance.pitch = 1.0; 
        utterance.rate = 1.1;
    } else {
        // Forzar tono femenino si la voz es genérica
        utterance.pitch = 1.6; 
        utterance.rate = 1.1;
    }

    window.speechSynthesis.speak(utterance);
  }

  return (
    <div className="gesia-container">
      <div className="gesia-card">
        <div className="gif-wrapper">
          <img src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWNoenFlb3Frdzh5ajJsZ2RhejFzbml2djdvcDJxbHBpMTMzaHppeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1kMEIaYLHnjmKdjLtK/giphy.gif" alt="Gesia AI" className="gesia-gif" />
        </div>
        <div className="gesia-cta">
          <button 
            className={`voice-button ${isListening ? 'listening' : ''}`} 
            onMouseDown={!isSending ? startListening : undefined} 
            onMouseUp={stopListeningAndSend} 
            onMouseLeave={() => isListeningRef.current && stopListeningAndSend()} 
            disabled={!supported || isSending}
          >
            {isListening ? 'Suelta para enviar' : 'Mantén pulsado para hablar'}
          </button>
        </div>
        <div className="transcript-box">
           <div className={`transcript-content ${!transcript ? 'empty' : ''}`}>
             {transcript || 'Mantén pulsado el botón o Shift y verás aquí tu voz ✨'}
           </div>
        </div>
        <div className="gesia-chat">
          <div className="gesia-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`gesia-message ${msg.sender}`}>{msg.text}</div>
            ))}
            {isSending && <div className="gesia-message bot gesia-typing">...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gesia;