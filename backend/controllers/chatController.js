// backend/controllers/chatController.js
const userModel = require('../models/userModel');
const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const aiService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const messageModel = require('../models/messageModel');

const RENDER_URL =
  process.env.RENDER_EXTERNAL_URL || 'https://gestor-tareas-backend-11hi.onrender.com';

exports.handleChatMessage = async (req, res) => {
  const { history } = req.body;
  const user = req.user;

  // Buscamos el último mensaje que venga del usuario (por si el historial incluye mensajes del bot)
  let latestUserMessage = '';
  if (Array.isArray(history) && history.length > 0) {
    const lastUserMsg = [...history]
      .reverse()
      .find(
        (m) =>
          String(m.sender || m.role || '').toLowerCase() === 'user' ||
          String(m.sender || m.role || '').toLowerCase() === 'me'
      );
    latestUserMessage = lastUserMsg ? String(lastUserMsg.text ?? lastUserMsg.content ?? '') : '';
  }

  // 💡 LÓGICA AGREGADA: VERIFICAR COMANDO OCR PRIMERO 💡
  // Si el mensaje contiene el comando secreto, evitamos la interpretación normal
  const isOcrCommand = latestUserMessage.includes('AI_CMD_PROCESS_TEXT:');
  
  if (isOcrCommand) {
    // Si se detecta el comando, saltamos a generar la respuesta conversacional.
    // El 'aiService.generateConversationalResponse' es donde la IA resumirá el texto.
    const userFolders = await folderModel.findByUserId(user.userId);
    const userFiles = await fileModel.findAllByUserId(user.userId);

    const conversationalReply = await aiService.generateConversationalResponse(
      history,
      user.nombre,
      { folders: userFolders, files: userFiles }
    );

    // Devolvemos la respuesta y TERMINAMOS la función.
    return res.status(200).json({ reply: conversationalReply });
  }
  // 💡 FIN LÓGICA OCR 💡

  try {
    const interpretation = await aiService.interpretMessage(latestUserMessage);

    switch (interpretation.intent) {
      /* ======================
       * CARPETAS: CRUD
       * ====================== */

      case 'create_folder': {
        const { entity: newFolderName, parent_entity: parentFolderName } = interpretation;

        if (!newFolderName) {
          return res.json({ reply: 'Dime el nombre de la carpeta a crear.' });
        }

        let parentId = null;

        if (parentFolderName) {
          const parentFolder = await folderModel.findByNameAndUserId(
            parentFolderName,
            user.userId
          );
          if (!parentFolder) {
            return res.json({
              reply: `No encontré la carpeta padre "${parentFolderName}".`,
              type: 'error',
            });
          }
          parentId = parentFolder.id;
        }

        await folderModel.create(newFolderName, user.userId, parentId);
        const location = parentFolderName ? ` dentro de "${parentFolderName}"` : '';

        return res.json({
          reply: `Listo, he creado la carpeta "${newFolderName}"${location}.`,
          type: 'success',
        });
      }

      case 'edit_folder': {
        const { entity: oldName, new_entity: newName } = interpretation;

        if (!oldName || !newName) {
          return res.json({
            reply:
              'Dime qué carpeta renombrar y el nuevo nombre. Ejemplo: renombra mate a matemáticas.',
          });
        }

        const folderToEdit = await folderModel.findByNameAndUserId(oldName, user.userId);
        if (!folderToEdit) {
          return res.json({
            reply: `No encontré la carpeta "${oldName}".`,
            type: 'error',
          });
        }

        await folderModel.update(folderToEdit.id, newName);
        return res.json({
          reply: `He renombrado la carpeta a "${newName}".`,
          type: 'success',
        });
      }

      case 'delete_folder': {
        const folderToDeleteName = interpretation.entity;

        if (!folderToDeleteName) {
          return res.json({ reply: 'Dime qué carpeta quieres eliminar.' });
        }

        const folderToDelete = await folderModel.findByNameAndUserId(
          folderToDeleteName,
          user.userId
        );
        if (!folderToDelete) {
          return res.json({
            reply: `No encontré la carpeta "${folderToDeleteName}".`,
            type: 'error',
          });
        }

        await folderModel.remove(folderToDelete.id);

        return res.json({
          reply: `He eliminado la carpeta "${folderToDeleteName}" y su contenido.`,
          type: 'success',
        });
      }

      case 'view_folder': {
        const folderToViewName = interpretation.entity;

        if (!folderToViewName) {
          return res.json({ reply: 'Dime el nombre de la carpeta que quieres ver.' });
        }

        const targetFolder = await folderModel.findByNameAndUserId(
          folderToViewName,
          user.userId
        );
        if (!targetFolder) {
          return res.json({
            reply: `No encontré la carpeta "${folderToViewName}".`,
            type: 'error',
          });
        }

        const subFolders = await folderModel.findByParentId(user.userId, targetFolder.id);
        const filesInFolder = await fileModel.findByFolderId(targetFolder.id);

        let content = `Contenido de "${targetFolder.nombre}":\n`;

        if (subFolders.length === 0 && filesInFolder.length === 0) {
          content = `La carpeta "${targetFolder.nombre}" está vacía.`;
        } else {
          if (subFolders.length > 0) {
            content += `\nSubcarpetas:\n` + subFolders.map((f) => `📁 ${f.nombre}`).join('\n');
          }
          if (filesInFolder.length > 0) {
            content +=
              `\n\nArchivos:\n` +
              filesInFolder
                .map(
                  (f) => `📄 ${f.nombre_original} (Estado: ${f.status || 'pending'})`
                )
                .join('\n');
          }
        }

        return res.json({ reply: content.trim() });
      }

      /* ======================
       * LISTAR CARPETAS
       * ====================== */

      case 'list_folders': {
        const userFolders = await folderModel.findByUserId(user.userId);

        if (!userFolders || userFolders.length === 0) {
          return res.json({
            reply:
              'Todavía no tienes carpetas creadas. Si quieres, dime un nombre y creamos la primera.',
          });
        }

        const list = userFolders.map((f) => `📁 ${f.nombre}`).join('\n');

        return res.json({
          reply: `Estas son tus carpetas actuales:\n\n${list}`,
        });
      }

      /* ======================
       * GENERAR PDF CON IA
       * ====================== */

      case 'generate_pdf': {
        const query = interpretation.entity;

        if (!query) {
          return res.json({
            reply: 'Perfecto, dime sobre qué tema quieres que escriba el PDF.',
          });
        }

        // Respuesta inmediata al usuario
        res.json({
          reply: `Entendido. Estoy generando tu PDF sobre "${query}". Esto puede tardar un poco.`,
        });

        // Generación asíncrona del PDF
        try {
          const pdfData = await aiService.generatePdfContent(query, user.nombre);
          if (!pdfData || !pdfData.textContent) {
            return;
          }

          const doc = new PDFDocument();
          const sanitizedQuery = query
            .split(' ')
            .slice(0, 3)
            .join('_')
            .replace(/[^a-zA-Z0-9_]/g, '');
          const pdfName = `${sanitizedQuery}_${Date.now()}.pdf`;

          const uploadsRoot = path.join(__dirname, '..', 'uploads');
          const userUploadsPath = path.join(uploadsRoot, String(user.userId));
          if (!fs.existsSync(userUploadsPath)) {
            fs.mkdirSync(userUploadsPath, { recursive: true });
          }

          const pdfAbsPath = path.join(userUploadsPath, pdfName);
          const stream = fs.createWriteStream(pdfAbsPath);

          doc.pipe(stream);

          doc.fontSize(22).text(pdfData.topic, { align: 'center' });
          doc.moveDown(0.5);
          doc.fontSize(10).text(`Solicitado por: ${pdfData.userName}`, { align: 'center' });
          doc.fontSize(10).text(`Fecha: ${pdfData.today}`, { align: 'center' });
          doc.moveDown(2);

          doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });

          doc.end();

          await new Promise((resolve) => stream.on('finish', resolve));

          const publicPdfPath = path
            .join('uploads', String(user.userId), pdfName)
            .replace(/\\/g, '/');

          const fileUrlPdf = `${RENDER_URL}/${publicPdfPath}`;
          console.log('PDF generado y disponible en:', fileUrlPdf);
        } catch (pdfError) {
          console.error('Error generando PDF asíncrono:', pdfError);
        }

        return;
      }

      /* ======================
       * ACLARACIÓN / UPLOAD
       * ====================== */

      case 'clarification_needed': {
        const textLower = (latestUserMessage || '').toLowerCase();
        const isFileRelated = /(archivo|archivos|carpeta|carpetas|pdf|documento|documentos|sube|subir|guarda|guardar|envía|enviar|mandar)/.test(
          textLower
        );

        if (isFileRelated) {
          return res.status(200).json({
            reply:
              'No estoy seguro de a qué archivo o carpeta te refieres. ¿Podrías ser un poco más específico?',
          });
        }

        // Si no es de archivos, lo tratamos como conversación normal
        const userFolders = await folderModel.findByUserId(user.userId);
        const userFiles = await fileModel.findAllByUserId(user.userId);

        const conversationalReply = await aiService.generateConversationalResponse(
          history,
          user.nombre,
          { folders: userFolders, files: userFiles }
        );

        return res.status(200).json({ reply: conversationalReply });
      }

      case 'upload_file':
        return res.status(200).json({
          reply:
            'Para subir un archivo, usa el formulario de subida de archivos en la parte superior de la carpeta.',
        });

      /* ======================
       * CONVERSACIÓN GENERAL
       * ====================== */

      case 'greeting':
      case 'unknown':
      default: {
        const userFolders = await folderModel.findByUserId(user.userId);
        const userFiles = await fileModel.findAllByUserId(user.userId);

        const conversationalReply = await aiService.generateConversationalResponse(
          history,
          user.nombre,
          { folders: userFolders, files: userFiles }
        );

        return res.status(200).json({ reply: conversationalReply });
      }
    }
  } catch (error) {
    console.error('Error al procesar el mensaje del chat:', error);
    res.status(500).json({
      error: 'Error al procesar el mensaje. Por favor, verifica el estado del servidor de IA.',
    });
  }
};

// --- HISTORIAL DE CHAT ENTRE USUARIOS ---
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
    console.error('Error en getChatHistory:', error);
    res.status(500).json({ message: 'Error en el servidor al obtener el historial.' });
  }
};