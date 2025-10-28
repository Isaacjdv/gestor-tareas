const cron = require('node-cron');
const twilio = require('twilio');
const reminderModel = require('../models/reminderModel');
const aiService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const RENDER_PUBLIC_URL = process.env.RENDER_EXTERNAL_URL;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

exports.startScheduler = () => {
    console.log('⏰ Programador de tareas iniciado. Verificando cada minuto.');

    cron.schedule('* * * * *', async () => {
        console.log('🔍 Buscando tareas programadas...');
        
        try {
            const pendingReminders = await reminderModel.findPending();
            if (pendingReminders.length === 0) {
                console.log('No hay tareas pendientes en este momento.');
                return;
            }

            console.log(`Encontrados ${pendingReminders.length} recordatorios pendientes.`);
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

            for (const reminder of pendingReminders) {
                try {
                    let messageBody = reminder.message;
                    let mediaUrl = null;
                    let taskType = reminder.task_type || 'simple';

                    if (taskType === 'investigation') {
                        console.log(`Generando PDF para: ${reminder.message}`);
                        
                        const pdfData = await aiService.generatePdfContent(reminder.message, reminder.user_name);
                        
                        if (pdfData && pdfData.textContent) {
                            const doc = new PDFDocument();
                            const pdfName = `${reminder.message.split(' ').slice(0, 3).join('_')}_${Date.now()}.pdf`;
                            
                            const userUploadsPath = path.join(__dirname, '..', 'uploads', `${reminder.usuario_id}`);
                            if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
                            const pdfPath = path.join('uploads', `${reminder.usuario_id}`, pdfName);
                            
                            const stream = fs.createWriteStream(pdfPath);
                            doc.pipe(stream);
                            
                            doc.fontSize(22).text(pdfData.topic.charAt(0).toUpperCase() + pdfData.topic.slice(1), { align: 'center' });
                            doc.moveDown(0.5);
                            doc.fontSize(10).text(`Solicitado por: ${pdfData.userName}`, { align: 'center' });
                            doc.fontSize(10).text(`Fecha: ${pdfData.today}`, { align: 'center' });
                            doc.moveDown(2);

                            if (pdfData.imageUrl) {
                                try {
                                    const imageResponse = await axios.get(pdfData.imageUrl, { responseType: 'arraybuffer' });
                                    const imageBuffer = Buffer.from(imageResponse.data, 'binary');
                                    doc.image(imageBuffer, { fit: [500, 250], align: 'center' }).moveDown(2);
                                } catch (imgError) {
                                    console.error("No se pudo añadir la imagen al PDF:", imgError.message);
                                }
                            }
                            
                            doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });
                            doc.end();

                            await new Promise(resolve => stream.on('finish', resolve));

                            mediaUrl = `${RENDER_PUBLIC_URL}/${pdfPath.replace(/\\/g, '/')}`;
                            messageBody = `¡Hola! Aquí tienes el PDF que me pediste sobre "${reminder.message}":`;
                        } else {
                            messageBody = `Hola, iba a generar tu informe sobre "${reminder.message}", pero no pude obtener el contenido de la IA.`;
                        }
                    }

                    await client.messages.create({
                        from: process.env.TWILIO_WHATSAPP_NUMBER,
                        to: `whatsapp:${reminder.recipient_whatsapp_number}`,
                        body: messageBody,
                        mediaUrl: mediaUrl ? [mediaUrl] : undefined,
                    });
                    
                    await reminderModel.updateStatus(reminder.id, 'sent');
                    console.log(`Recordatorio #${reminder.id} enviado a ${reminder.recipient_whatsapp_number}`);

                } catch (sendError) {
                    console.error(`Error al enviar el recordatorio #${reminder.id}:`, sendError);
                    await reminderModel.updateStatus(reminder.id, 'error');
                }
            }
        } catch (error) {
            console.error("Error en el ciclo del programador de tareas:", error);
        }
    });
};