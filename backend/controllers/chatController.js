const userModel = require('../models/userModel');
const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const aiService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "https://gestor-tareas-backend-11hi.onrender.com";

exports.handleChatMessage = async (req, res) => {
    // [MODIFICACIÓN] Ahora recibimos el historial completo del frontend
    const { history } = req.body;
    const user = req.user; 
    
    // El último mensaje es el mensaje de usuario que necesita ser interpretado
    const latestUserMessage = history.length > 0 ? history[history.length - 1].content : "";

    try {
        const interpretation = await aiService.interpretMessage(latestUserMessage);
        
        // --- LÓGICA DE EJECUCIÓN DE COMANDOS ---
        switch (interpretation.intent) {
            case 'create_folder':
                const { entity: newFolderName, parent_entity: parentFolderName } = interpretation;
                if (!newFolderName) { return res.json({ reply: "Dime el nombre de la carpeta a crear." }); }
                let parentId = null;
                if (parentFolderName) {
                    const parentFolder = await folderModel.findByNameAndUserId(parentFolderName, user.userId);
                    if (!parentFolder) { return res.json({ reply: `No encontré la carpeta padre "${parentFolderName}".` }); }
                    parentId = parentFolder.id;
                }
                await folderModel.create(newFolderName, user.userId, parentId);
                const location = parentFolderName ? ` dentro de "${parentFolderName}"` : '';
                return res.json({ reply: `¡Listo! Carpeta "${newFolderName}" creada${location}.` });
            
            case 'edit_folder':
                const { entity: oldName, new_entity: newName } = interpretation;
                if (!oldName || !newName) { return res.json({ reply: "Dime qué carpeta renombrar y el nuevo nombre (ej: renombra X a Y)." }); }
                const folderToEdit = await folderModel.findByNameAndUserId(oldName, user.userId);
                if (!folderToEdit) { return res.json({ reply: `No encontré la carpeta "${oldName}".` }); }
                await folderModel.update(folderToEdit.id, newName);
                return res.json({ reply: `Carpeta renombrada a "${newName}".` });
            
            case 'delete_folder':
                const folderToDeleteName = interpretation.entity;
                if (!folderToDeleteName) { return res.json({ reply: "Dime qué carpeta eliminar." }); }
                const folderToDelete = await folderModel.findByNameAndUserId(folderToDeleteName, user.userId);
                if (!folderToDelete) { return res.json({ reply: `No encontré la carpeta "${folderToDeleteName}".` }); }
                await folderModel.remove(folderToDelete.id);
                return res.json({ reply: `Carpeta "${folderToDeleteName}" eliminada (incluyendo su contenido).` });

            case 'view_folder':
                const folderToViewName = interpretation.entity;
                if (!folderToViewName) { return res.json({ reply: "Dime el nombre de la carpeta que quieres ver." }); }
                const targetFolder = await folderModel.findByNameAndUserId(folderToViewName, user.userId);
                if (!targetFolder) { return res.json({ reply: `No encontré la carpeta "${folderToViewName}".` }); }

                const subFolders = await folderModel.findByParentId(user.userId, targetFolder.id);
                const filesInFolder = await fileModel.findByFolderId(targetFolder.id);
                
                let content = `*Contenido de "${targetFolder.nombre}":*\n`;
                if (subFolders.length === 0 && filesInFolder.length === 0) {
                    content = `La carpeta "${targetFolder.nombre}" está vacía.`;
                } else {
                    if (subFolders.length > 0) {
                        content += `\n*Subcarpetas:*\n` + subFolders.map(f => `📁 ${f.nombre}`).join('\n');
                    }
                    if (filesInFolder.length > 0) {
                        content += `\n\n*Archivos:*\n` + filesInFolder.map(f => `📄 ${f.nombre_original} (Estado: ${f.status || 'pending'})`).join('\n');
                    }
                }
                return res.json({ reply: content.trim() });
            
            // Si la petición es para generar un PDF
            case 'generate_pdf': {
                const query = interpretation.entity;
                if (!query) {
                    return res.json({ reply: "Claro, dime sobre qué quieres que escriba en el PDF." });
                }

                const pdfData = await aiService.generatePdfContent(query, user.nombre);
                if (!pdfData || !pdfData.textContent) {
                    return res.json({ reply: "Lo siento, no pude generar el contenido para tu PDF." });
                }

                const doc = new PDFDocument();
                const sanitizedQuery = query.split(' ').slice(0,3).join('_').replace(/[^a-zA-Z0-9_]/g, '');
                const pdfName = `${sanitizedQuery}_${Date.now()}.pdf`;
                const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.userId}`); // Usar user.userId
                if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                const pdfPath = path.join('uploads', `${user.userId}`, pdfName); // Usar user.userId
                const stream = fs.createWriteStream(pdfPath);
                doc.pipe(stream);
                
                // --- ESTRUCTURA DEL PDF ---
                doc.fontSize(22).text(pdfData.topic, { align: 'center' });
                doc.moveDown(0.5);
                doc.fontSize(10).text(`Solicitado por: ${pdfData.userName}`, { align: 'center' });
                doc.fontSize(10).text(`Fecha: ${pdfData.today}`, { align: 'center' });
                doc.moveDown(2);

                doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });
                
                doc.end();
                await new Promise(resolve => stream.on('finish', resolve));
                
                const publicPdfPath = pdfPath.replace(/\\/g, '/');
                const fileUrlPdf = `${RENDER_URL}/${publicPdfPath}`;
                
                return res.json({ reply: `¡Listo! 📄 Aquí tienes tu documento sobre "${query}": ${fileUrlPdf}` });
            }

            case 'clarification_needed':
                return res.status(200).json({ reply: "No estoy seguro de a qué archivo o carpeta te refieres. ¿Podrías ser un poco más específico, por favor?" });
            
            case 'upload_file': // En el dashboard no gestionamos subidas por texto, pedimos manual
                return res.status(200).json({ reply: "Para subir un archivo, por favor usa el formulario en la parte superior de la carpeta." });

            // Si no es un comando directo, pasamos a la conversación normal
            case 'list_folders':
            case 'unknown':
            case 'greeting':
            default:
                // Obtener información del usuario para dar contexto a la IA
                const userFolders = await folderModel.findByUserId(user.userId);
                const userFiles = await fileModel.findAllByUserId(user.userId);

                // [MODIFICACIÓN CLAVE] Pasamos el historial completo para mantener la memoria
                const conversationalReply = await aiService.generateConversationalResponse(
                    history, // Pasamos el historial COMPLETO
                    user.nombre, 
                    { folders: userFolders, files: userFiles }
                );
                
                return res.status(200).json({ reply: conversationalReply });
        }
    } catch (error) {
        console.error("Error al procesar el mensaje del chat:", error);
        res.status(500).json({ error: 'Error al procesar el mensaje. Por favor, verifica el estado del servidor de IA.' });
    }
};
