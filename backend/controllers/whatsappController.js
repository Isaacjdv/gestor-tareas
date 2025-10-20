const twilio = require('twilio');
const userModel = require('../models/userModel');
const folderModel = require('../models/folderModel');
const fileModel = require('../models/fileModel');
const reminderModel = require('../models/reminderModel');
const aiService = require('../services/aiService');
const transcriptionService = require('../services/transcriptionService');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');
const { addSeconds, addMinutes, addHours } = require('date-fns');

// --- HELPER FUNCTION ---
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
    
    const RENDER_URL = process.env.RENDER_EXTERNAL_URL || "https://gestor-tareas-backend-11hi.onrender.com";

    try {
        const user = await userModel.findByWhatsapp(from);
        if (!user) {
            twiml.message('Your number is not registered.');
        } else {
            // --- AUDIO HANDLING ---
            if (numMedia > 0 && mediaType.startsWith('audio/')) {
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
                    twiml.message("Sorry, I couldn't understand the audio. Please try speaking more clearly or send a text message.");
                    res.writeHead(200, { 'Content-Type': 'text/xml' });
                    return res.end(twiml.toString());
                }
                
                incomingMsg = transcribedText;
            }

            // --- SESSION-BASED LOGIC ---
            const session = userSessions[from];
            if (session) {
                if (session.pendingAction === 'upload_file') {
                    const destFolder = incomingMsg;
                    const folder = await folderModel.findByNameAndUserId(destFolder, user.id);
                    if (!folder) {
                        twiml.message(`I couldn't find the folder "${destFolder}".`);
                    } else {
                        const response = await axios({
                            method: 'get', url: session.mediaUrl, responseType: 'stream',
                            auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN }
                        });
                        
                        const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
                        if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                        
                        const fileType = session.mediaType.split('/')[0];
                        const baseName = fileType === 'application' ? 'document' : (fileType === 'image' ? 'image' : fileType);
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
                        twiml.message(`Done! I've saved the file as "${newFilename}" in the "${destFolder}" folder.`);
                    }
                    delete userSessions[from];
                } else if (session.pendingAction === 'save_generated_file') {
                    const interpretation = await aiService.interpretMessage(incomingMsg);
                    if (interpretation.intent === 'confirm_save_yes') {
                        const folderName = interpretation.entity;
                        if (!folderName) {
                            twiml.message("Understood. Which folder should I save it in?");
                        } else {
                            const folder = await folderModel.findByNameAndUserId(folderName, user.id);
                            if (!folder) {
                                twiml.message(`I couldn't find the folder "${folderName}".`);
                            } else {
                                await fileModel.create({
                                    nombre_original: session.originalName, path_archivo: session.filePath,
                                    tipo_mime: 'application/pdf', carpeta_id: folder.id, usuario_id: user.id
                                });
                                twiml.message(`Done! I've saved "${session.originalName}" in the "${folderName}" folder.`);
                            }
                            delete userSessions[from];
                        }
                    } else {
                        fs.unlinkSync(session.filePath);
                        twiml.message("Okay, I haven't saved it.");
                        delete userSessions[from];
                    }
                }
            } else {
                // --- HYBRID FLOW (NO PENDING SESSION) ---
                const interpretation = await aiService.interpretMessage(incomingMsg || "User attached a file");
                console.log('AI Interpretation:', interpretation);

                switch (interpretation.intent) {
                    case 'create_folder':
                        const { entity: newFolderName, parent_entity: parentFolderName } = interpretation;
                        if (!newFolderName) { twiml.message("What should I name the new folder?"); break; }
                        let parentId = null;
                        if (parentFolderName) {
                            const parentFolder = await folderModel.findByNameAndUserId(parentFolderName, user.id);
                            if (!parentFolder) { twiml.message(`I couldn't find the parent folder "${parentFolderName}".`); break; }
                            parentId = parentFolder.id;
                        }
                        await folderModel.create(newFolderName, user.id, parentId);
                        const location = parentFolderName ? ` inside "${parentFolderName}"` : '';
                        twiml.message(`Folder "${newFolderName}" created${location}.`);
                        break;

                    case 'edit_folder':
                        const { entity: oldName, new_entity: newName } = interpretation;
                        if (!oldName || !newName) { twiml.message("What folder should I rename, and what's the new name?"); break; }
                        const folderToEdit = await folderModel.findByNameAndUserId(oldName, user.id);
                        if (!folderToEdit) { twiml.message(`I couldn't find the folder "${oldName}".`); }
                        else { await folderModel.update(folderToEdit.id, newName); twiml.message(`Folder renamed to "${newName}".`); }
                        break;

                    case 'delete_folder':
                        const folderToDeleteName = interpretation.entity;
                        if (!folderToDeleteName) { twiml.message("Which folder should I delete?"); break; }
                        const folderToDelete = await folderModel.findByNameAndUserId(folderToDeleteName, user.id);
                        if (!folderToDelete) { twiml.message(`I couldn't find the folder "${folderToDeleteName}".`); }
                        else { await folderModel.remove(folderToDelete.id); twiml.message(`Folder "${folderToDeleteName}" deleted.`); }
                        break;
                    
                    case 'upload_file':
                         const destFolder = interpretation.entity || interpretation.parent_entity;
                         if (!mediaUrl) { twiml.message("Please attach a file and tell me where to save it."); }
                         else if (!destFolder) {
                             userSessions[from] = { pendingAction: 'upload_file', mediaUrl, mediaType };
                             twiml.message("Understood. Which folder should I save this file in?");
                         } else {
                            const folder = await folderModel.findByNameAndUserId(destFolder, user.id);
                            if (!folder) { twiml.message(`I couldn't find the folder "${destFolder}".`);}
                            else {
                                const response = await axios({
                                    method: 'get', url: mediaUrl, responseType: 'stream',
                                    auth: { username: process.env.TWILIO_ACCOUNT_SID, password: process.env.TWILIO_AUTH_TOKEN }
                                });
                                
                                const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
                                if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                                
                                const fileType = mediaType.split('/')[0];
                                const baseName = fileType === 'application' ? 'document' : (fileType === 'image' ? 'image' : fileType);
                                const count = await fileModel.countByTypeInFolder(folder.id, fileType);
                                const extension = getExtensionFromMimeType(mediaType);
                                const newFilename = `${baseName}_${count + 1}${extension}`;
                                const savePath = path.join('uploads', `${user.id}`, newFilename);

                                const writer = fs.createWriteStream(savePath);
                                response.data.pipe(writer);
                                await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });

                                await fileModel.create({
                                    nombre_original: newFilename, path_archivo: savePath, tipo_mime: mediaType,
                                    carpeta_id: folder.id, usuario_id: user.id
                                });
                                twiml.message(`Done! I've saved the file as "${newFilename}" in "${destFolder}".`);
                            }
                         }
                         break;

                    case 'list_folders':
                        const rootFolders = await folderModel.findByParentId(user.id, null);
                        if (rootFolders.length === 0) {
                            twiml.message("You don't have any main folders.");
                        } else {
                            const folderList = rootFolders.map(f => `📁 ${f.nombre}`).join('\n');
                            twiml.message(`Of course, ${user.nombre}. Here are your main folders:\n\n${folderList}`);
                        }
                        break;
                    
                    case 'view_folder':
                        const folderEntity = interpretation.entity;
                        if (!folderEntity) { twiml.message("Which folder would you like to see?"); break; }
                        const targetFolder = await folderModel.findByNameAndUserId(folderEntity, user.id);
                        if (!targetFolder) { twiml.message(`I couldn't find the folder "${folderEntity}".`); }
                        else {
                            const subFolders = await folderModel.findByParentId(user.id, targetFolder.id);
                            const files = await fileModel.findByFolderId(targetFolder.id);
                            let content = `*Contents of "${targetFolder.nombre}":*\n`;
                            if (subFolders.length === 0 && files.length === 0) {
                                content = `The folder "${targetFolder.nombre}" is empty.`;
                            } else {
                                if (subFolders.length > 0) {
                                    content += `\n*Subfolders:*\n` + subFolders.map(f => `📁 ${f.nombre}`).join('\n');
                                }
                                if (files.length > 0) {
                                    content += `\n\n*Files:*\n` + files.map(f => `📄 ${f.nombre_original}`).join('\n');
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
                            if (!fileEntity) { twiml.message("Which file do you need?"); break; }
                            fileToSend = await fileModel.findByNameAndUserId(fileEntity, user.id);
                        }
                        if (!fileToSend) {
                            twiml.message(`I couldn't find the file you asked for.`);
                        } else {
                            const fileUrl = `${RENDER_URL}/${fileToSend.path_archivo.replace(/\\/g, '/')}`;
                            console.log("Attempting to send file from URL:", fileUrl);
                            
                            const message = twiml.message();
                            message.media(fileUrl);
                        }
                        break;
                    
                    case 'generate_pdf':
                        const query = interpretation.entity;
                        if (!query) { twiml.message("Sure, what topic should the PDF be about?"); break; }
                        
                        twiml.message(`Understood, I'm generating your document about "${query}". This might take a moment...`);
                        
                        const pdfData = await aiService.generatePdfContent(query, user.nombre);

                        if (!pdfData || !pdfData.textContent) {
                            twiml.message("Sorry, I couldn't generate the content for your PDF right now.");
                            break;
                        }

                        const doc = new PDFDocument();
                        const sanitizedQuery = query.split(' ').slice(0,3).join('_').replace(/[^a-zA-Z0-9_]/g, '');
                        const pdfName = `${sanitizedQuery}_${Date.now()}.pdf`;
                        
                        const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
                        if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                        
                        const pdfPath = path.join('uploads', `${user.id}`, pdfName);
                        
                        const stream = fs.createWriteStream(pdfPath);
                        doc.pipe(stream);

                        if (pdfData.imageUrl) {
                            try {
                                const imageResponse = await axios.get(pdfData.imageUrl, { responseType: 'arraybuffer' });
                                const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                                doc.image(imageBuffer, { fit: [500, 250], align: 'center' }).moveDown(2);
                            } catch (imgError) {
                                console.error("Could not add image to PDF:", imgError.message);
                            }
                        }
                        
                        doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });
                        doc.end();

                        await new Promise(resolve => stream.on('finish', resolve));

                        const publicPdfPath = pdfPath.replace(/\\/g, '/');
                        const fileUrlPdf = `${RENDER_URL}/${publicPdfPath}`;
                        
                        userSessions[from] = { pendingAction: 'save_generated_file', filePath: pdfPath, originalName: pdfName };

                        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
                        
                        try {
                            await client.messages.create({
                                from: process.env.TWILIO_WHATSAPP_NUMBER,
                                body: `Here is your document about "${query}"! 📄`,
                                mediaUrl: [fileUrlPdf],
                                to: `whatsapp:${from}`
                            });
                            await client.messages.create({
                                from: process.env.TWILIO_WHATSAPP_NUMBER,
                                body: "Would you like to save this file to one of your folders?",
                                to: `whatsapp:${from}`
                            });
                        } catch (e) {
                            console.error("Error sending PDF or follow-up with Twilio Client API:", e);
                            await client.messages.create({
                                from: process.env.TWILIO_WHATSAPP_NUMBER,
                                body: "Sorry, I couldn't send you the PDF right now, but it has been generated. Try asking for it again in a minute, or check if it was saved automatically.",
                                to: `whatsapp:${from}`
                            });
                        }
                        break;

                    case 'set_reminder':
                        const { entity: reminderMsg, time: reminderTime, contact: reminderContact } = interpretation;
                        if (!reminderMsg || !reminderTime) {
                            twiml.message("I didn't quite get that. Please tell me what to remember and when (e.g., 'remind me to call mom in 10 mins').");
                            break;
                        }

                        let triggerAt = new Date();
                        
                        const match = reminderTime.match(/\d+/);
                        const timeValue = match ? parseInt(match[0]) : 0;
                        
                        if (timeValue === 0) {
                             twiml.message(`Sorry, I couldn't understand the time amount in "${reminderTime}".`);
                             break;
                        }

                        if (reminderTime.includes("second")) {
                             triggerAt = addSeconds(triggerAt, timeValue);
                        } else if (reminderTime.includes("minute")) {
                             triggerAt = addMinutes(triggerAt, timeValue);
                        } else if (reminderTime.includes("hour")) {
                             triggerAt = addHours(triggerAt, timeValue);
                        } else {
                            twiml.message(`I can only schedule reminders in seconds, minutes, or hours.`);
                            break;
                        }

                        let recipientNumber = user.whatsapp_number;
                        let confirmationMessage = `Got it! I'll remind you "${reminderMsg}" at the right time.`;

                        if (reminderContact && !['me', 'myself', 'i'].includes(reminderContact.toLowerCase())) {
                            const recipientUser = await userModel.findByName(reminderContact);
                            if (!recipientUser) {
                                twiml.message(`I couldn't find a user named "${reminderContact}".`);
                                break;
                            }
                            recipientNumber = recipientUser.whatsapp_number;
                            confirmationMessage = `Of course! I'll remind ${recipientUser.nombre} about "${reminderMsg}".`;
                        }
                        
                        const isInvestigation = reminderMsg.toLowerCase().includes('research') || reminderMsg.toLowerCase().includes('make a report on');
                        const taskType = isInvestigation ? 'investigation' : 'simple';

                        await reminderModel.create(user.id, reminderMsg, triggerAt, recipientNumber, user.nombre, taskType);
                        twiml.message(confirmationMessage);
                        break;

                    case 'clarification_needed':
                        twiml.message("I'm not sure which file or folder you're referring to. Could you be a bit more specific, please?");
                        break;

                    // --- CONVERSATIONAL INTENTS ---
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
        console.error("Critical error in WhatsApp webhook:", error);
        twiml.message('Sorry, an internal error occurred while processing your message.');
        res.writeHead(200, { 'Content-Type': 'text/xml' });
        res.end(twiml.toString());
    }
};