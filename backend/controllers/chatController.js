const userModel = require('../models/userModel');
const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const aiService = require('../services/aiService');
const messageModel = require('../models/messageModel'); 
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "https://gestor-tareas-backend-11hi.onrender.com";

exports.handleChatMessage = async (req, res) => {
  // Recibimos el historial completo del frontend para tener memoria
  const { history } = req.body;
  const user = req.user; 

  // Extraemos el último mensaje del usuario para analizar la intención inmediata
  const latestUserMessage = history && history.length > 0 ? history[history.length - 1].text : "";

  try {
    // 1. El cerebro detecta la intención (¿Quiere crear carpeta o solo hablar?)
    const interpretation = await aiService.interpretMessage(latestUserMessage);
    
    console.log(`🧠 Intención detectada: ${interpretation.intent} | Usuario: ${user.nombre}`);

    // --- LÓGICA DE COMANDOS (ACCIONES REALES) ---
    switch (interpretation.intent) {
      
      // 📁 CASO 1: CREAR CARPETA
      case 'create_folder': {
        const { entity: newFolderName, parent_entity: parentFolderName } = interpretation;
        if (!newFolderName) return res.json({ reply: "Necesito un nombre para crear la carpeta." });
        
        let parentId = null;
        if (parentFolderName) {
          const parentFolder = await folderModel.findByNameAndUserId(parentFolderName, user.userId);
          if (!parentFolder) return res.json({ reply: `No encontré la carpeta padre "${parentFolderName}".`, type: 'error' });
          parentId = parentFolder.id;
        }
        
        await folderModel.create(newFolderName, user.userId, parentId);
        const location = parentFolderName ? ` dentro de "${parentFolderName}"` : '';
        
        return res.json({ reply: `¡Listo! Carpeta "${newFolderName}" creada${location}.`, type: 'success' });
      }

      // ✏️ CASO 2: RENOMBRAR CARPETA
      case 'edit_folder': {
        const { entity: oldName, new_entity: newName } = interpretation;
        if (!oldName || !newName) return res.json({ reply: "Dime qué carpeta renombrar y el nuevo nombre." });
        
        const folderToEdit = await folderModel.findByNameAndUserId(oldName, user.userId);
        if (!folderToEdit) return res.json({ reply: `No encontré la carpeta "${oldName}".`, type: 'error' });
        
        await folderModel.update(folderToEdit.id, newName);
        return res.json({ reply: `Carpeta renombrada a "${newName}".`, type: 'success' });
      }

      // 🗑️ CASO 3: ELIMINAR CARPETA
      case 'delete_folder': {
        const folderToDeleteName = interpretation.entity;
        if (!folderToDeleteName) return res.json({ reply: "¿Qué carpeta quieres eliminar?" });
        
        const folderToDelete = await folderModel.findByNameAndUserId(folderToDeleteName, user.userId);
        if (!folderToDelete) return res.json({ reply: `No encontré la carpeta "${folderToDeleteName}".`, type: 'error' });
        
        await folderModel.remove(folderToDelete.id);
        return res.json({ reply: `Carpeta "${folderToDeleteName}" eliminada (incluyendo su contenido).`, type: 'success' });
      }

      // 👁️ CASO 4: VER CONTENIDO
      case 'view_folder': {
        const folderToViewName = interpretation.entity;
        if (!folderToViewName) return res.json({ reply: "Dime el nombre de la carpeta que quieres ver." });
        
        const targetFolder = await folderModel.findByNameAndUserId(folderToViewName, user.userId);
        if (!targetFolder) return res.json({ reply: `No encontré la carpeta "${folderToViewName}".`, type: 'error' });

        const subFolders = await folderModel.findByParentId(user.userId, targetFolder.id);
        const filesInFolder = await fileModel.findByFolderId(targetFolder.id);
        
        // Construimos una respuesta limpia para el lector de voz
        let content = `Contenido de "${targetFolder.nombre}": `;
        if (subFolders.length === 0 && filesInFolder.length === 0) {
          content = `La carpeta "${targetFolder.nombre}" está vacía.`;
        } else {
          const folderNames = subFolders.map(f => f.nombre).join(', ');
          const fileNames = filesInFolder.map(f => f.nombre_original).join(', ');
          
          if (folderNames) content += ` Carpetas: ${folderNames}.`;
          if (fileNames) content += ` Archivos: ${fileNames}.`;
        }
        return res.json({ reply: content.trim() });
      }

      // 📄 CASO 5: GENERAR PDF (ASÍNCRONO)
      case 'generate_pdf': {
        const query = interpretation.entity;
        if (!query) return res.json({ reply: "¿Sobre qué tema quieres el PDF?" });

        // Respuesta inmediata al usuario para que no espere
        res.json({ reply: `Entendido. Estoy escribiendo tu PDF sobre "${query}". Te avisaré cuando esté listo.` });
        
        // Proceso en segundo plano (No bloquea la respuesta)
        (async () => {
            try {
              const pdfData = await aiService.generatePdfContent(query, user.nombre);
              if (!pdfData || !pdfData.textContent) return;

              const doc = new PDFDocument();
              // Nombre de archivo seguro
              const sanitizedQuery = query.split(' ').slice(0,3).join('_').replace(/[^a-zA-Z0-9_]/g, '');
              const pdfName = `${sanitizedQuery}_${Date.now()}.pdf`;

              // Rutas
              const uploadsRoot = path.join(__dirname, '..', 'uploads');
              const userUploadsPath = path.join(uploadsRoot, String(user.userId));
              if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });

              const pdfAbsPath = path.join(userUploadsPath, pdfName);
              const stream = fs.createWriteStream(pdfAbsPath);
              
              // Escribir PDF
              doc.pipe(stream);
              doc.fontSize(22).text(pdfData.topic, { align: 'center' });
              doc.moveDown(0.5);
              doc.fontSize(10).text(`Autor: ${pdfData.userName}`, { align: 'center' });
              doc.fontSize(10).text(`Fecha: ${pdfData.today}`, { align: 'center' });
              doc.moveDown(2);
              doc.fontSize(12).text(pdfData.textContent, { align: 'justify' }); // TextContent ya viene limpio de markdown
              doc.end();
              
              // Esperar a que termine de escribirse
              await new Promise(resolve => stream.on('finish', resolve));
              
              console.log(`✅ PDF Generado: ${pdfName}`);
              // Aquí podrías emitir un evento de socket si quisieras notificar en tiempo real
            } catch (pdfError) {
              console.error("❌ Error generando PDF background:", pdfError);
            }
        })();
        return; 
      }

      case 'clarification_needed':
        return res.status(200).json({ reply: "No estoy segura de a qué te refieres. ¿Podrías ser más específico con el nombre del archivo o carpeta?" });
      
      case 'upload_file': 
        return res.status(200).json({ reply: "Para subir archivos, por favor usa el botón azul de la interfaz." });

      // 🗣️ CASO DEFAULT: CONVERSACIÓN GENERAL INTELIGENTE
      // Aquí caen: 'greeting', 'unknown', 'list_folders' y cualquier cosa que no sea un comando exacto.
      case 'list_folders':
      case 'greeting':
      case 'unknown':
      default: {
        // 1. Obtenemos el contexto real del usuario
        const userFolders = await folderModel.findByUserId(user.userId);
        const userFiles = await fileModel.findAllByUserId(user.userId);

        // 2. Preparamos los datos para la IA
        const contextData = { folders: userFolders, files: userFiles };

        // 3. Llamamos al servicio conversacional (que ahora incluye el System Prompt mejorado)
        // Le pasamos el 'history' completo para que sepa de qué estábamos hablando
        const conversationalReply = await aiService.generateConversationalResponse(
          history, 
          user.nombre, 
          contextData
        );
        
        return res.status(200).json({ reply: conversationalReply });
      }
    }
  } catch (error) {
    console.error("❌ Error crítico en chatController:", error);
    res.status(500).json({ reply: 'Tuve un pequeño mareo digital. ¿Puedes repetirme eso?' });
  }
};

// --- FUNCIONES AUXILIARES (CHAT ENTRE USUARIOS) ---
exports.getChatHistory = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    const { otherUserId } = req.params;

    const otherUserIdNum = parseInt(otherUserId, 10);
    if (isNaN(otherUserIdNum)) {
      return res.status(400).json({ message: 'ID de usuario inválido.' });
    }

    const history = await messageModel.getHistory(currentUserId, otherUserIdNum);
    res.status(200).json(history);

  } catch (error) {
    console.error("Error en getChatHistory:", error);
    res.status(500).json({ message: 'Error en el servidor al obtener el historial.' });
  }
};