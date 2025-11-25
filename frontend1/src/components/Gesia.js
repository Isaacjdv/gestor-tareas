import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import '../styles/ChatComponent.css';

// 💡 IMPORTAR TESSERACT
import Tesseract from 'tesseract.js'; 

const RENDER_BACKEND_URL = 'https://gestor-tareas-backend-11hi.onrender.com';

const Gesia = ({ onReloadFolders, onReloadFiles, onOpenFolder }) => {
  const [supported, setSupported] = useState(true);
  const [hasTts, setHasTts] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState([]); 
  const [availableVoices, setAvailableVoices] = useState([]);
  // 💡 NUEVO ESTADO: MANEJO DE PROCESAMIENTO DE ARCHIVO
  const [isProcessingFile, setIsProcessingFile] = useState(false); 

  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);

  const fullHistoryRef = useRef([]);

  // Refs para mantener funciones actualizadas
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
        // Si está hablando, paramos TTS para escuchar
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
        }
        startListening(); 
      }
    };
    
    const handleKeyUp = (e) => { 
      if (e.key === 'Shift' && isListeningRef.current) {
        stopListeningAndSend();
      }
    };

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
    if (isProcessingFile) return; 
    transcriptRef.current = '';
    setTranscript('');
    try {
      recognitionRef.current.start();
      setIsListening(true);
      isListeningRef.current = true;
    } catch (err) {
      console.error(err);
    }
  }

  async function stopListeningAndSend() {
    if (!recognitionRef.current || !isListeningRef.current) return;
    recognitionRef.current.stop();
    setIsListening(false);
    isListeningRef.current = false;
    const finalText = transcriptRef.current.trim();
    transcriptRef.current = '';
    setTranscript('');
    if (finalText && !isProcessingFile) await sendMessageToBackend(finalText); 
  }

  async function sendMessageToBackend(text) {
    const token = localStorage.getItem('user_token');
    const userMessage = { sender: 'user', text };

    fullHistoryRef.current = [...fullHistoryRef.current, userMessage];

    const historyForBackend = fullHistoryRef.current.map(m => ({
      sender: m.sender,
      text: m.text,
    }));

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
      const folderMatch = replyText.match(
        /(?:abriendo|entrar|ir|mostrar|ver|carpeta|folder|contenido de)\s+(?:a\s+|en\s+|la\s+|el\s+)?(?:carpeta|folder)?\s*["'*]*([a-zA-Z0-Z0-9_ áéíóúñ]+)["'*]*[:.]?/i
      );

      if (folderMatch && folderMatch[1]) {
        const folderName = folderMatch[1].replace(/['"*.:,]/g, '').trim();
        const textLower = replyText.toLowerCase();

        const forbiddenWords = ['elimina', 'borra', 'crea', 'deshacer'];
        const isDangerousAction = forbiddenWords.some(word => textLower.includes(word));

        if (!isDangerousAction && onOpenFolderRef.current) {
          onOpenFolderRef.current(folderName);
        }
      }

      const botMessage = { sender: 'bot', text: replyText, type: replyType };

      fullHistoryRef.current = [...fullHistoryRef.current, botMessage];

      setMessages(prev => [...prev, botMessage].slice(-2));

      if (onReloadFoldersRef.current) onReloadFoldersRef.current();
      if (onReloadFilesRef.current) onReloadFilesRef.current();

      if (hasTts) speakText(replyText);

    } catch (error) {
      console.error('Error al enviar mensaje a backend:', error);
      const errorMessage = { sender: 'bot', text: 'Error de conexión.' };

      fullHistoryRef.current = [...fullHistoryRef.current, errorMessage];

      setMessages(prev => [...prev, errorMessage].slice(-2));
    } finally {
      setIsSending(false);
    }
  }

  // 🟢 3. LÓGICA DE VOZ (TTS)
  function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel(); 

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
      utterance.pitch = 1.6; 
      utterance.rate = 1.1;
    }

    window.speechSynthesis.speak(utterance);
  }

  // 💡 4. NUEVA FUNCIÓN: PROCESAMIENTO DE IMAGEN CON TESSERACT
  async function processImageWithOcr(file) {
    if (!file || !file.type.startsWith('image/')) return;

    // 1. Mostrar mensaje de usuario simple
    const userMessage = { sender: 'user', text: `[IMAGEN ENVIADA: ${file.name}]` };
    setMessages(prev => [...prev, userMessage].slice(-2));
    setIsProcessingFile(true); 

    try {
        const { data: { text } } = await Tesseract.recognize(
            file,
            'spa', 
            {} 
        );

        const ocrText = text.trim();
        
        if (ocrText) {
            // 2. Comando oculto para la IA
            const commandForAI = `AI_CMD_PROCESS_TEXT: El usuario acaba de subir una imagen cuyo texto extraído es: "${ocrText}". Por favor, analiza este texto, haz un resumen o conclusión breve y responde al usuario sobre qué se trata y cómo puedes ayudarle a gestionarlo.`;
            
            // 3. Enviar el comando al backend
            await sendMessageToBackend(commandForAI);

        } else {
            await sendMessageToBackend("No pude extraer texto legible de la imagen. ¿Es una imagen clara?");
        }

    } catch (error) {
        console.error('Error durante el OCR:', error);
        await sendMessageToBackend("Hubo un error al procesar la imagen con OCR.");
    } finally {
        setIsProcessingFile(false);
    }
  }


  // 💡 5. NUEVA FUNCIÓN: MANEJAR CAMBIO DE ARCHIVO DEL INPUT
  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Resetear el input para permitir subir el mismo archivo de nuevo
    event.target.value = null; 

    if (file.type.startsWith('image/')) {
        // Si es una imagen, usamos Tesseract en el Frontend
        processImageWithOcr(file);
    } else {
        // Si es PDF o Word (u otro), enviamos una notificación al backend (requiere backend actualizado)
        const userMessage = { sender: 'user', text: `Adjunté el archivo: ${file.name}. ¿Qué quieres que haga con él?` };
        setMessages(prev => [...prev, userMessage].slice(-2));
        sendMessageToBackend(`Adjunté un archivo (${file.name}). ¿Qué hago con él?`);
    }
  }


  return (
    <div className="gesia-container">
      <div className="gesia-card">
        <div className="gif-wrapper">
          <img
            src="https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWNoenFlb3Frdzh5ajJsZ2RhejFzbml2djdvcDJxbHBpMTMzaHppeCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1kMEIaYLHnjmKdjLtK/giphy.gif"
            alt="Gesia AI"
            className="gesia-gif"
          />
        </div>

        {/* 💡 INPUT DE ARCHIVO (OCULTO) */}
        <input 
            type="file" 
            id="fileInput" 
            accept="image/*, application/pdf, .doc, .docx" 
            style={{ display: 'none' }} 
            onChange={handleFileChange} 
            disabled={isSending || isProcessingFile}
        />

        <div className="gesia-cta">
          <button 
            className={`voice-button ${isListening ? 'listening' : ''}`} 
            onMouseDown={!isSending && !isProcessingFile ? startListening : undefined} 
            onMouseUp={stopListeningAndSend} 
            onMouseLeave={() => isListeningRef.current && stopListeningAndSend()} 
            disabled={!supported || isSending || isProcessingFile}
          >
            {isListening ? 'Suelta para enviar' : 'Mantén pulsado para hablar'}
          </button>
          
          {/* 💡 BOTÓN DE SUBIDA DE ARCHIVO */}
          <button 
            className="file-upload-button"
            onClick={() => document.getElementById('fileInput').click()}
            disabled={isSending || isProcessingFile}
            style={{ marginLeft: '10px' }}
          >
            {isProcessingFile ? 'Procesando OCR...' : '📎 Subir Archivo'}
          </button>
        </div>

        <div className="transcript-box">
          <div className={`transcript-content ${!transcript ? 'empty' : ''}`}>
            {transcript || (isProcessingFile ? 'Analizando imagen, por favor espera...' : 'Mantén pulsado el botón o Shift y verás aquí tu voz ✨')}
          </div>
        </div>

        <div className="gesia-chat">
          <div className="gesia-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`gesia-message ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {(isSending || isProcessingFile) && <div className="gesia-message bot gesia-typing">...</div>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Gesia;