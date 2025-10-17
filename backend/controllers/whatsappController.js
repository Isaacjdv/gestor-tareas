const twilio = require('twilio');
const userModel = require('../models/userModel');
const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const aiService = require('../services/aiService');
const transcriptionService = require('../services/transcriptionService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// --- FUNCIÓN AUXILIAR ---
// Convierte un tipo MIME a una extensión de archivo
function getExtensionFromMimeType(mimeType) {
    if (!mimeType) return '';
    const parts = mimeType.split('/');
    let extension = `.${parts[parts.length - 1]}`;
    if (extension === '.jpeg') return '.jpg';
    if (extension === '.quicktime') return '.mov';
    if (extension.startsWith('.ogg')) return '.ogg';
    return extension;
}

let userSessions = {};

exports.receiveMessage = async (req, res) => {
    const twiml = new twilio.twiml.MessagingResponse();
    let incomingMsg = req.body.Body || '';
    const from = req.body.From.replace('whatsapp:', '');

    const numMedia = parseInt(req.body.NumMedia) || 0;
    const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;
    const mediaType = numMedia > 0 ? req.body.MediaContentType0 : null;

    try {
        const user = await userModel.findByWhatsapp(from);
        if (!user) {
            twiml.message('Tu número no está registrado.');
        } else {
            // --- MANEJO DE AUDIOS ---
            if (numMedia > 0 && mediaType.startsWith('audio/')) {
                console.log("Detectado mensaje de audio. Transcribiendo...");
                const audioResponse = await axios({
                    method: 'get', url: mediaUrl, responseType: 'stream',
                    auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN }
                });
                const tempAudioPath = `uploads/temp_audio_${Date.now()}.ogg`;
                const writer = fs.createWriteStream(tempAudioPath);
                audioResponse.data.pipe(writer);
                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
                
                const transcribedText = await transcriptionService.transcribeAudio(tempAudioPath);
                fs.unlinkSync(tempAudioPath);
                
                if (!transcribedText || transcribedText.trim() === '') {
                    twiml.message("Lo siento, no pude entender el audio. Por favor, intenta hablar más claro o envía un mensaje de texto.");
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    return res.end(twiml.toString());
                }
                
                console.log("Texto transcrito:", transcribedText);
                incomingMsg = transcribedText;
            }

            // --- LÓGICA DE MEMORIA PARA CONVERSACIONES PENDIENTES ---
            const session = userSessions[from];
            if (session) {
                if (session.pendingAction === 'upload_file') {
                    const destFolder = incomingMsg;
                    const folder = await folderModel.findByNameAndUserId(destFolder, user.id);
                    if (!folder) {
                        twiml.message(`No encontré la carpeta "${destFolder}".`);
                    } else {
                        const response = await axios({
                            method: 'get', url: session.mediaUrl, responseType: 'stream',
                            auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN }
                        });

                        const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
                        if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                        
                        const fileType = session.mediaType.split('/')[0];
                        const baseName = fileType === 'application' ? 'documento' : (fileType === 'image' ? 'imagen' : fileType);
                        const count = await fileModel.countByTypeInFolder(folder.id, fileType);
                        const extension = getExtensionFromMimeType(session.mediaType);
                        const newFilename = `${baseName}_${count + 1}${extension}`;
                        const savePath = path.join('uploads', `${user.id}`, newFilename);

                        const writer = fs.createWriteStream(savePath);
                        response.data.pipe(writer);
                        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

                        await fileModel.create({
                            nombre_original: newFilename, path_archivo: savePath, tipo_mime: session.mediaType,
                            carpeta_id: folder.id, usuario_id: user.id
                        });
                        twiml.message(`¡Hecho! Guardé el archivo como "${newFilename}" en la carpeta "${destFolder}".`);
                    }
                    delete userSessions[from];
                } else if (session.pendingAction === 'save_generated_file') {
                    const interpretation = await aiService.interpretMessage(incomingMsg);
                    if (interpretation.intent === 'confirm_save_yes') {
                        const folderName = interpretation.entity;
                        if (!folderName) {
                            twiml.message("Entendido. ¿En qué carpeta lo guardo?");
                        } else {
                            const folder = await folderModel.findByNameAndUserId(folderName, user.id);
                            if (!folder) {
                                twiml.message(`No encontré la carpeta "${folderName}".`);
                            } else {
                                await fileModel.create({
                                    nombre_original: session.originalName, path_archivo: session.filePath,
                                    tipo_mime: 'application/pdf', carpeta_id: folder.id, usuario_id: user.id
                                });
                                twiml.message(`¡Listo! Guardé "${session.originalName}" en la carpeta "${folderName}".`);
                            }
                            delete userSessions[from];
                        }
                    } else {
                        fs.unlinkSync(session.filePath);
                        twiml.message("De acuerdo, no lo he guardado.");
                        delete userSessions[from];
                    }
                }
            } else {
                // --- FLUJO HÍBRIDO (SIN SESIÓN PENDIENTE) ---
                const interpretation = await aiService.interpretMessage(incomingMsg || "El usuario adjuntó un archivo");
                console.log('Interpretación de la IA:', interpretation);

                switch (interpretation.intent) {
                    // --- ACCIONES DE EJECUCIÓN DIRECTA ---
                    case 'create_folder':
                        const { entity: newFolderName, parent_entity: parentFolderName } = interpretation;
                        if (!newFolderName) { twiml.message("Dime el nombre de la carpeta a crear."); break; }
                        let parentId = null;
                        if (parentFolderName) {
                            const parentFolder = await folderModel.findByNameAndUserId(parentFolderName, user.id);
                            if (!parentFolder) { twiml.message(`No encontré la carpeta padre "${parentFolderName}".`); break; }
                            parentId = parentFolder.id;
                        }
                        await folderModel.create(newFolderName, user.id, parentId);
                        const location = parentFolderName ? ` dentro de "${parentFolderName}"` : '';
                        twiml.message(`Carpeta "${newFolderName}" creada${location}.`);
                        break;

                    case 'edit_folder':
                        const { entity: oldName, new_entity: newName } = interpretation;
                        if (!oldName || !newName) { twiml.message("Dime qué carpeta renombrar y el nuevo nombre (ej: renombra X a Y)."); break; }
                        const folderToEdit = await folderModel.findByNameAndUserId(oldName, user.id);
                        if (!folderToEdit) { twiml.message(`No encontré la carpeta "${oldName}".`); }
                        else { await folderModel.update(folderToEdit.id, newName); twiml.message(`Carpeta renombrada a "${newName}".`); }
                        break;

                    case 'delete_folder':
                        const folderToDeleteName = interpretation.entity;
                        if (!folderToDeleteName) { twiml.message("Dime qué carpeta eliminar."); break; }
                        const folderToDelete = await folderModel.findByNameAndUserId(folderToDeleteName, user.id);
                        if (!folderToDelete) { twiml.message(`No encontré la carpeta "${folderToDeleteName}".`); }
                        else { await folderModel.remove(folderToDelete.id); twiml.message(`Carpeta "${folderToDeleteName}" eliminada.`); }
                        break;
                    
                    case 'upload_file':
                         const destFolder = interpretation.entity || interpretation.parent_entity;
                         if (!mediaUrl) { twiml.message("Adjunta un archivo y dime dónde guardarlo."); }
                         else if (!destFolder) {
                             userSessions[from] = { pendingAction: 'upload_file', mediaUrl, mediaType };
                             twiml.message("Entendido. ¿En qué carpeta lo guardo?");
                         } else {
                            const folder = await folderModel.findByNameAndUserId(destFolder, user.id);
                            if (!folder) { twiml.message(`No encontré la carpeta "${destFolder}".`);}
                            else {
                                const response = await axios({
                                    method: 'get', url: mediaUrl, responseType: 'stream',
                                    auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN }
                                });
                                
                                const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
                                if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                                
                                const fileType = mediaType.split('/')[0];
                                const baseName = fileType === 'application' ? 'documento' : (fileType === 'image' ? 'imagen' : fileType);
                                const count = await fileModel.countByTypeInFolder(folder.id, fileType);
                                const extension = getExtensionFromMimeType(mediaType);
                                const newFilename = `${baseName}_${count + 1}${extension}`;
                                const savePath = path.join('uploads', `${user.id}`, newFilename);

                                const writer = fs.createWriteStream(savePath);
                                response.data.pipe(writer);
                                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

                                await fileModel.create({
                                    nombre_original: newFilename,
                                    path_archivo: savePath, tipo_mime: mediaType,
                                    carpeta_id: folder.id, usuario_id: user.id
                                });
                                twiml.message(`¡Listo! Guardé el archivo como "${newFilename}" en "${destFolder}".`);
                            }
                         }
                         break;

                    case 'list_folders':
                        const rootFolders = await folderModel.findByParentId(user.id, null);
                        if (rootFolders.length === 0) {
                            twiml.message('No tienes carpetas principales.');
                        } else {
                            const folderList = rootFolders.map(f => `📁 ${f.nombre}`).join('\n');
                            twiml.message(`Claro, ${user.nombre}. Estas son tus carpetas principales:\n\n${folderList}`);
                        }
                        break;
                    
                    case 'view_folder':
                        const folderEntity = interpretation.entity;
                        if (!folderEntity) { twiml.message("Dime el nombre de la carpeta que quieres ver."); break; }
                        const targetFolder = await folderModel.findByNameAndUserId(folderEntity, user.id);
                        if (!targetFolder) { twiml.message(`No encontré la carpeta "${folderEntity}".`); }
                        else {
                            const subFolders = await folderModel.findByParentId(user.id, targetFolder.id);
                            const files = await fileModel.findByFolderId(targetFolder.id);
                            let content = `*Contenido de "${targetFolder.nombre}":*\n`;
                            if (subFolders.length === 0 && files.length === 0) {
                                content = `La carpeta "${targetFolder.nombre}" está vacía.`;
                            } else {
                                if (subFolders.length > 0) {
                                    content += `\n*Subcarpetas:*\n` + subFolders.map(f => `📁 ${f.nombre}`).join('\n');
                                }
                                if (files.length > 0) {
                                    content += `\n\n*Archivos:*\n` + files.map(f => `📄 ${f.nombre_original}`).join('\n');
                                }
                            }
                            twiml.message(content.trim());
                        }
                        break;

                    case 'send_file':
                    case 'send_latest_file':
                        let fileToSend;
                        if (interpretation.intent === 'send_latest_file') {
                            fileToSend = await fileModel.findLatestByUserId(user.id);
                        } else {
                            const fileEntity = interpretation.entity;
                            if (!fileEntity) { twiml.message("Dime el nombre del archivo que necesitas."); break; }
                            fileToSend = await fileModel.findByNameAndUserId(fileEntity, user.id);
                        }
                        if (!fileToSend) {
                            twiml.message(`No encontré el archivo que pediste.`);
                        } else {
                            const renderUrl = "https://gestor-tareas-backend-11hi.onrender.com";
                            const fileUrl = `${renderUrl}/${fileToSend.path_archivo.replace(/\\/g, '/')}`;
                            console.log("Intentando enviar archivo desde la URL:", fileUrl);
                            
                            const message = twiml.message();
                            message.media(fileUrl);
                        }
                        break;
                    
                    case 'generate_pdf':
                        const query = interpretation.entity;
                        if (!query) { twiml.message("Claro, dime sobre qué quieres que escriba en el PDF."); break; }
                        
                        twiml.message(`Entendido, estoy generando tu documento sobre "${query}". Un momento...`);
                        
                        const content = await aiService.generateConversationalResponse(query, user.nombre, { folders:[], files:[] });

                        const doc = new PDFDocument();
                        const pdfName = `${query.split(' ').slice(0,3).join('_')}_${Date.now()}.pdf`;
                        const pdfPath = `uploads/${pdfName}`;
                        
                        const stream = fs.createWriteStream(pdfPath);
                        doc.pipe(stream);
                        doc.fontSize(20).text(query.charAt(0).toUpperCase() + query.slice(1), { align: 'center' });
                        doc.moveDown(1.5);
                        doc.fontSize(12).text(content, { align: 'justify' });
                        doc.end();

                        await new Promise(resolve => stream.on('finish', resolve));

                        const renderUrlPdf = "https://gestor-tareas-backend-11hi.onrender.com";
                        const fileUrlPdf = `${renderUrlPdf}/${pdfPath}`;
                        const messagePdf = twiml.message('Aquí tienes tu documento:');
                        messagePdf.media(fileUrlPdf);
                        
                        userSessions[from] = { pendingAction: 'save_generated_file', filePath: pdfPath, originalName: pdfName };
                        
                        setTimeout(async () => {
                            try {
                                const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                                await client.messages.create({
                                   from: process.env.TWILIO_WHATSAPP_NUMBER,
                                   body: "¿Quieres que guarde este archivo en alguna de tus carpetas?",
                                   to: `whatsapp:${from}`
                                });
                            } catch (e) { console.error("Error al enviar mensaje de seguimiento:", e); }
                        }, 1500);
                        break;
                    
                    case 'clarification_needed':
                        twiml.message("No estoy seguro de a qué archivo o carpeta te refieres. ¿Podrías ser un poco más específico, por favor?");
                        break;

                    // --- INTENCIONES CONVERSACIONALES ---
                    case 'greeting':
                    case 'get_summary':
                    case 'unknown':
                    default:
                        const userFolders = await folderModel.findByUserId(user.id);
                        const userFiles = await fileModel.findAllByUserId(user.id);
                        const conversationalReply = await aiService.generateConversationalResponse(incomingMsg, user.nombre, { folders: userFolders, files: userFiles });
                        twiml.message(conversationalReply);
                        break;
                }
            }
        }
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    } catch (error) {
        console.error("Error crítico en el webhook de WhatsApp:", error);
        twiml.message('Lo siento, ocurrió un error interno al procesar tu mensaje.');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    }
};