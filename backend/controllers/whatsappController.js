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

// --- FUNCIÓN AUXILIAR ---
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
  // Obtener 'io' (servidor de Socket.io) desde el request (inyectado por middleware)
  const io = req.io;

  const twiml = new twilio.twiml.MessagingResponse();
  let incomingMsg = req.body.Body || '';
  const from = (req.body.From || '').replace('whatsapp:', '');

  const numMedia = parseInt(req.body.NumMedia, 10) || 0;
  const mediaUrl = numMedia > 0 ? req.body.MediaUrl0 : null;
  const mediaType = numMedia > 0 ? req.body.MediaContentType0 : null;

  const RENDER_URL =
    process.env.RENDER_EXTERNAL_URL ||
    'https://gestor-tareas-backend-11hi.onrender.com';

  try {
    const user = await userModel.findByWhatsapp(from);
    if (!user) {
      twiml.message('Tu número no está registrado.');
    } else {
      // --- MANEJO DE AUDIOS ---
      if (numMedia > 0 && mediaType && mediaType.startsWith('audio/')) {
        console.log('Detectado mensaje de audio. Transcribiendo...');
        const audioResponse = await axios({
          method: 'get',
          url: mediaUrl,
          responseType: 'stream',
          auth: {
            username: process.env.TWILIO_ACCOUNT_SID,
            password: process.env.TWILIO_AUTH_TOKEN,
          },
        });
        const tempAudioPath = `uploads/temp_audio_${Date.now()}.ogg`;
        const writer = fs.createWriteStream(tempAudioPath);
        audioResponse.data.pipe(writer);
        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        const transcribedText = await transcriptionService.transcribeAudio(
          tempAudioPath
        );
        fs.unlinkSync(tempAudioPath);

        if (!transcribedText || transcribedText.trim() === '') {
          twiml.message(
            'Lo siento, no pude entender el audio. Por favor, intenta hablar más claro.'
          );
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          return res.end(twiml.toString());
        }

        console.log('Texto transcrito:', transcribedText);
        incomingMsg = transcribedText;
      }

      // --- LÓGICA DE MEMORIA PARA CONVERSACIONES PENDIENTES ---
      const session = userSessions[from];
      if (session) {
        if (session.pendingAction === 'upload_file') {
          const destFolderName = incomingMsg;
          const folder = await folderModel.findByNameAndUserId(
            destFolderName,
            user.id
          );
          if (!folder) {
            twiml.message(`No encontré la carpeta "${destFolderName}".`);
          } else {
            const response = await axios({
              method: 'get',
              url: session.mediaUrl,
              responseType: 'stream',
              auth: {
                username: process.env.TWILIO_ACCOUNT_SID,
                password: process.env.TWILIO_AUTH_TOKEN,
              },
            });

            const userUploadsPath = path.join(
              __dirname,
              '..',
              'uploads',
              `${user.id}`
            );
            if (!fs.existsSync(userUploadsPath))
              fs.mkdirSync(userUploadsPath, { recursive: true });

            const fileType = (session.mediaType || '').split('/')[0] || 'file';
            const baseName =
              fileType === 'application'
                ? 'documento'
                : fileType === 'image'
                ? 'imagen'
                : fileType;
            const count = await fileModel.countByTypeInFolder(
              folder.id,
              fileType
            );
            const extension = getExtensionFromMimeType(session.mediaType);
            const newFilename = `${baseName}_${count + 1}${extension}`;
            const savePath = path.join('uploads', `${user.id}`, newFilename);

            const writer = fs.createWriteStream(savePath);
            response.data.pipe(writer);
            await new Promise((resolve, reject) => {
              writer.on('finish', resolve);
              writer.on('error', reject);
            });

            await fileModel.create({
              nombre_original: newFilename,
              path_archivo: savePath,
              tipo_mime: session.mediaType,
              carpeta_id: folder.id,
              usuario_id: user.id,
            });
            twiml.message(
              `¡Hecho! Guardé el archivo como "${newFilename}" en la carpeta "${destFolderName}".`
            );

            // Notificar al Dashboard que los archivos cambiaron
            io.to(user.id.toString()).emit('files_updated');
          }
          delete userSessions[from];
        } else if (session.pendingAction === 'save_generated_file') {
          const interpretation = await aiService.interpretMessage(incomingMsg);
          if (interpretation.intent === 'confirm_save_yes') {
            const folderName = interpretation.entity;
            if (!folderName) {
              twiml.message('Entendido. ¿En qué carpeta lo guardo?');
            } else {
              const folder = await folderModel.findByNameAndUserId(
                folderName,
                user.id
              );
              if (!folder) {
                twiml.message(`No encontré la carpeta "${folderName}".`);
              } else {
                await fileModel.create({
                  nombre_original: session.originalName,
                  path_archivo: session.filePath,
                  tipo_mime: 'application/pdf',
                  carpeta_id: folder.id,
                  usuario_id: user.id,
                });
                twiml.message(
                  `¡Listo! Guardé "${session.originalName}" en la carpeta "${folderName}".`
                );

                // Notificar al Dashboard que los archivos cambiaron
                io.to(user.id.toString()).emit('files_updated');
              }
              delete userSessions[from];
            }
          } else {
            fs.unlinkSync(session.filePath);
            twiml.message('De acuerdo, no lo he guardado.');
            delete userSessions[from];
          }
        }
      } else {
        // --- FLUJO HÍBRIDO (SIN SESIÓN PENDIENTE) ---
        const interpretation = await aiService.interpretMessage(
          incomingMsg || 'El usuario adjuntó un archivo'
        );
        console.log('Interpretación de la IA:', interpretation);

        switch (interpretation.intent) {
          case 'create_folder': {
            const { entity: newFolderName, parent_entity: parentFolderName } =
              interpretation;
            if (!newFolderName) {
              twiml.message('Dime el nombre de la carpeta a crear.');
              break;
            }
            let parentId = null;
            if (parentFolderName) {
              const parentFolder = await folderModel.findByNameAndUserId(
                parentFolderName,
                user.id
              );
              if (!parentFolder) {
                twiml.message(
                  `No encontré la carpeta padre "${parentFolderName}".`
                );
                break;
              }
              parentId = parentFolder.id;
            }
            await folderModel.create(newFolderName, user.id, parentId);
            const location = parentFolderName
              ? ` dentro de "${parentFolderName}"`
              : '';
            twiml.message(`Carpeta "${newFolderName}" creada${location}.`);

            // Notificar al Dashboard que las carpetas cambiaron
            io.to(user.id.toString()).emit('folders_updated');
            break;
          }

          case 'edit_folder': {
            const { entity: oldName, new_entity: newName } = interpretation;
            if (!oldName || !newName) {
              twiml.message(
                'Dime qué carpeta renombrar y el nuevo nombre (ej: renombra X a Y).'
              );
              break;
            }
            const folderToEdit = await folderModel.findByNameAndUserId(
              oldName,
              user.id
            );
            if (!folderToEdit) {
              twiml.message(`No encontré la carpeta "${oldName}".`);
            } else {
              await folderModel.update(folderToEdit.id, newName);
              twiml.message(`Carpeta renombrada a "${newName}".`);
              io.to(user.id.toString()).emit('folders_updated');
            }
            break;
          }

          case 'delete_folder': {
            const folderToDeleteName = interpretation.entity;
            if (!folderToDeleteName) {
              twiml.message('Dime qué carpeta eliminar.');
              break;
            }
            const folderToDelete = await folderModel.findByNameAndUserId(
              folderToDeleteName,
              user.id
            );
            if (!folderToDelete) {
              twiml.message(`No encontré la carpeta "${folderToDeleteName}".`);
            } else {
              await folderModel.remove(folderToDelete.id);
              twiml.message(`Carpeta "${folderToDeleteName}" eliminada.`);
              io.to(user.id.toString()).emit('folders_updated');
            }
            break;
          }

          case 'upload_file': {
            const destFolder =
              interpretation.entity || interpretation.parent_entity;
            if (!mediaUrl) {
              twiml.message('Adjunta un archivo y dime dónde guardarlo.');
            } else if (!destFolder) {
              userSessions[from] = {
                pendingAction: 'upload_file',
                mediaUrl,
                mediaType,
              };
              twiml.message('Entendido. ¿En qué carpeta lo guardo?');
            } else {
              const folder = await folderModel.findByNameAndUserId(
                destFolder,
                user.id
              );
              if (!folder) {
                twiml.message(`No encontré la carpeta "${destFolder}".`);
              } else {
                const response = await axios({
                  method: 'get',
                  url: mediaUrl,
                  responseType: 'stream',
                  auth: {
                    username: process.env.TWILIO_ACCOUNT_SID,
                    password: process.env.TWILIO_AUTH_TOKEN,
                  },
                });

                const userUploadsPath = path.join(
                  __dirname,
                  '..',
                  'uploads',
                  `${user.id}`
                );
                if (!fs.existsSync(userUploadsPath))
                  fs.mkdirSync(userUploadsPath, { recursive: true });

                const fileType = (mediaType || '').split('/')[0] || 'file';
                const baseName =
                  fileType === 'application'
                    ? 'documento'
                    : fileType === 'image'
                    ? 'imagen'
                    : fileType;
                const count = await fileModel.countByTypeInFolder(
                  folder.id,
                  fileType
                );
                const extension = getExtensionFromMimeType(mediaType);
                const newFilename = `${baseName}_${count + 1}${extension}`;
                const savePath = path.join('uploads', `${user.id}`, newFilename);

                const writer = fs.createWriteStream(savePath);
                response.data.pipe(writer);
                await new Promise((resolve, reject) => {
                  writer.on('finish', resolve);
                  writer.on('error', reject);
                });

                await fileModel.create({
                  nombre_original: newFilename,
                  path_archivo: savePath,
                  tipo_mime: mediaType,
                  carpeta_id: folder.id,
                  usuario_id: user.id,
                });
                twiml.message(
                  `¡Listo! Guardé el archivo como "${newFilename}" en "${destFolder}".`
                );

                io.to(user.id.toString()).emit('files_updated');
              }
            }
            break;
          }

          case 'list_folders': {
            const rootFolders = await folderModel.findByParentId(user.id, null);
            if (!rootFolders || rootFolders.length === 0) {
              twiml.message('No tienes carpetas principales.');
            } else {
              const folderList = rootFolders
                .map((f) => `📁 ${f.nombre}`)
                .join('\n');
              twiml.message(
                `Claro, ${user.nombre}. Estas son tus carpetas principales:\n\n${folderList}`
              );
            }
            break;
          }

          case 'view_folder': {
            const folderEntity = interpretation.entity;
            if (!folderEntity) {
              twiml.message('Dime el nombre de la carpeta que quieres ver.');
              break;
            }
            const targetFolder = await folderModel.findByNameAndUserId(
              folderEntity,
              user.id
            );
            if (!targetFolder) {
              twiml.message(`No encontré la carpeta "${folderEntity}".`);
            } else {
              const subFolders = await folderModel.findByParentId(
                user.id,
                targetFolder.id
              );
              const files = await fileModel.findByFolderId(targetFolder.id);
              let content = `*Contenido de "${targetFolder.nombre}":*\n`;
              if ((subFolders?.length || 0) === 0 && (files?.length || 0) === 0) {
                content = `La carpeta "${targetFolder.nombre}" está vacía.`;
              } else {
                if (subFolders && subFolders.length > 0) {
                  content +=
                    `\n*Subcarpetas:*\n` +
                    subFolders.map((f) => `📁 ${f.nombre}`).join('\n');
                }
                if (files && files.length > 0) {
                  content +=
                    `\n\n*Archivos:*\n` +
                    files.map((f) => `📄 ${f.nombre_original}`).join('\n');
                }
              }
              twiml.message(content.trim());
            }
            break;
          }

          case 'send_file':
          case 'send_latest_file': {
            let fileToSend;
            if (interpretation.intent === 'send_latest_file') {
              fileToSend = await fileModel.findLatestByUserId(user.id);
            } else {
              const fileEntity = interpretation.entity;
              if (!fileEntity) {
                twiml.message('Dime el nombre del archivo que necesitas.');
                break;
              }
              fileToSend = await fileModel.findByNameAndUserId(
                fileEntity,
                user.id
              );
            }
            if (!fileToSend) {
              twiml.message('No encontré el archivo que pediste.');
            } else {
              twiml.message(
                `Un momento, estoy buscando tu archivo: *${fileToSend.nombre_original}*...`
              );
              const fileUrl = `${RENDER_URL}/${fileToSend.path_archivo.replace(
                /\\/g,
                '/'
              )}`;
              console.log('Intentando enviar archivo asíncronamente desde:', fileUrl);

              const client = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
              );
              try {
                await axios.get(fileUrl); // "Despertar" servidor si está en frío
              } catch (_wakeUpError) {
                console.log('Servidor despertado o ya estaba despierto.');
              }

              try {
                await client.messages.create({
                  from: process.env.TWILIO_WHATSAPP_NUMBER,
                  mediaUrl: [fileUrl],
                  to: `whatsapp:${from}`,
                });
              } catch (e) {
                console.error('Error al enviar media con Twilio Client API:', e);
                await client.messages.create({
                  from: process.env.TWILIO_WHATSAPP_NUMBER,
                  body:
                    'Lo siento, tuve un problema al enviar el archivo. Es posible que sea demasiado grande o que el servidor esté tardando en responder.',
                  to: `whatsapp:${from}`,
                });
              }
            }
            break;
          }

          case 'generate_pdf': {
            const query = interpretation.entity;
            if (!query) {
              twiml.message('Claro, dime sobre qué quieres que escriba en el PDF.');
              break;
            }

            twiml.message(
              `Entendido, estoy generando tu documento sobre "${query}". Esto puede tardar unos segundos...`
            );

            const pdfData = await aiService.generatePdfContent(
              query,
              user.nombre
            );

            if (!pdfData || !pdfData.textContent) {
              twiml.message(
                'Lo siento, no pude generar el contenido para tu PDF en este momento.'
              );
              break;
            }

            const doc = new PDFDocument();
            const sanitizedQuery = query
              .split(' ')
              .slice(0, 3)
              .join('_')
              .replace(/[^a-zA-Z0-9_]/g, '');
            const pdfName = `${sanitizedQuery}_${Date.now()}.pdf`;

            const userUploadsPath = path.join(
              __dirname,
              '..',
              'uploads',
              `${user.id}`
            );
            if (!fs.existsSync(userUploadsPath))
              fs.mkdirSync(userUploadsPath, { recursive: true });

            const pdfPath = path.join('uploads', `${user.id}`, pdfName);

            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);

            doc
              .fontSize(22)
              .text(
                pdfData.topic.charAt(0).toUpperCase() + pdfData.topic.slice(1),
                { align: 'center' }
              );
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Solicitado por: ${pdfData.userName}`, {
              align: 'center',
            });
            doc.fontSize(10).text(`Fecha: ${pdfData.today}`, {
              align: 'center',
            });
            doc.moveDown(2);

            if (pdfData.imageUrl) {
              try {
                const imageResponse = await axios.get(pdfData.imageUrl, {
                  responseType: 'arraybuffer',
                });
                const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                doc.image(imageBuffer, { fit: [500, 250], align: 'center' }).moveDown(2);
              } catch (imgError) {
                console.error(
                  'No se pudo añadir la imagen al PDF:',
                  imgError.message
                );
              }
            }

            doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });
            doc.end();

            await new Promise((resolve) => stream.on('finish', resolve));

            const publicPdfPath = pdfPath.replace(/\\/g, '/');
            const fileUrlPdf = `${RENDER_URL}/${publicPdfPath}`;

            userSessions[from] = {
              pendingAction: 'save_generated_file',
              filePath: pdfPath,
              originalName: pdfName,
            };

            const clientPdf = twilio(
              process.env.TWILIO_ACCOUNT_SID,
              process.env.TWILIO_AUTH_TOKEN
            );

            try {
              // "Calentar" el PDF
              await axios.get(fileUrlPdf);
            } catch (_wakeUpError) {
              console.log('PDF despertado.');
            }

            try {
              await clientPdf.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                body: `¡Aquí tienes tu documento sobre "${query}"! 📄`,
                mediaUrl: [fileUrlPdf],
                to: `whatsapp:${from}`,
              });
              await clientPdf.messages.create({
                from: process.env.TWILIO_WHATSAPP_NUMBER,
                body: '¿Te gustaría guardar este archivo en alguna de tus carpetas?',
                to: `whatsapp:${from}`,
              });
            } catch (e) {
              console.error(
                'Error al enviar PDF o seguimiento con Twilio Client API:',
                e
              );
            }
            break;
          }

          case 'set_reminder': {
            const {
              entity: reminderMsg,
              time: reminderTime,
              contact: reminderContact,
            } = interpretation;

            if (!reminderMsg || !reminderTime) {
              twiml.message(
                'No entendí bien. Dime qué recordar y cuándo (ej: recuérdame llamar a mamá en 10 mins).'
              );
              break;
            }

            let triggerAt = new Date();
            const match = reminderTime.match(/\d+/);
            const timeValue = match ? parseInt(match[0], 10) : 0;

            if (timeValue === 0) {
              twiml.message(
                `No pude entender la cantidad de tiempo en "${reminderTime}".`
              );
              break;
            }

            const lt = reminderTime.toLowerCase();
            if (lt.includes('segundo')) {
              triggerAt = addSeconds(triggerAt, timeValue);
            } else if (lt.includes('minuto')) {
              triggerAt = addMinutes(triggerAt, timeValue);
            } else if (lt.includes('hora')) {
              triggerAt = addHours(triggerAt, timeValue);
            } else {
              twiml.message('Solo puedo programar en segundos, minutos u horas.');
              break;
            }

            let recipientNumber = user.whatsapp_number;
            let confirmationMessage = `¡Entendido! Te recordaré "${reminderMsg}" en el momento justo.`;

            if (
              reminderContact &&
              !['yo', 'mi', 'mí'].includes(reminderContact.toLowerCase())
            ) {
              const recipientUser = await userModel.findByName(reminderContact);
              if (!recipientUser) {
                twiml.message(
                  `No encontré a un usuario llamado "${reminderContact}".`
                );
                break;
              }
              recipientNumber = recipientUser.whatsapp_number;
              confirmationMessage = `¡Claro! Le recordaré a ${recipientUser.nombre} sobre "${reminderMsg}".`;
            }

            const lowerMsg = reminderMsg.toLowerCase();
            const isInvestigation =
              lowerMsg.includes('investigar') ||
              lowerMsg.includes('hacer un informe');
            const taskType = isInvestigation ? 'investigation' : 'simple';

            await reminderModel.create(
              user.id,
              reminderMsg,
              triggerAt,
              recipientNumber,
              user.nombre,
              taskType
            );
            twiml.message(confirmationMessage);
            break;
          }

          case 'clarification_needed': {
            twiml.message(
              'No estoy seguro de a qué archivo o carpeta te refieres. ¿Podrías ser un poco más específico, por favor?'
            );
            break;
          }

          // --- INTENCIONES CONVERSACIONALES ---
          case 'greeting':
          case 'get_summary':
          case 'unknown':
          default: {
            const userFolders = await folderModel.findByUserId(user.id);
            const userFiles = await fileModel.findAllByUserId(user.id);
            const conversationalReply =
              await aiService.generateConversationalResponse(
                incomingMsg,
                user.nombre,
                { folders: userFolders, files: userFiles }
              );
            twiml.message(conversationalReply);
            break;
          }
        }
      }
    }

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  } catch (error) {
    console.error('Error crítico en el webhook de WhatsApp:', error);
    twiml.message('Lo siento, ocurrió un error interno al procesar tu mensaje.');
    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
  }
};
