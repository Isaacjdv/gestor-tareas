const cron = require('node-cron');
const twilio = require('twilio');
const reminderModel = require('../models/reminderModel');
const aiService = require('../services/aiService');
const PDFDocument = require('pdfkit');
const fs = require('fs');

// Render establece automáticamente la URL pública del servicio en esta variable
const RENDER_PUBLIC_URL = process.env.RENDER_EXTERNAL_URL;

/**
 * Inicia el programador de tareas que se ejecuta cada minuto.
 */
exports.startScheduler = () => {
    console.log('⏰ Programador de tareas iniciado. Verificando cada minuto.');

    // Se ejecuta cada minuto ('* * * * *')
    cron.schedule('* * * * *', async () => {
        console.log('🔍 Buscando tareas programadas...');
        
        try {
            // Busca recordatorios pendientes en la base de datos
            const pendingReminders = await reminderModel.findPending();

            if (pendingReminders.length === 0) {
                console.log('No hay tareas pendientes en este momento.');
                return;
            }

            console.log(`Encontrados ${pendingReminders.length} recordatorios pendientes.`);
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

            // Procesa cada recordatorio encontrado
            for (const reminder of pendingReminders) {
                try {
                    let messageBody = reminder.message;
                    let mediaUrl = null;
                    let taskType = reminder.task_type || 'simple';

                    // Si el recordatorio es una investigación, genera el PDF
                    if (taskType === 'investigation') {
                        console.log(`Generando PDF para: ${reminder.message}`);
                        
                        // 1. Generar contenido extenso con la IA
                        const content = await aiService.generatePdfContent(reminder.message, reminder.user_name);
                        
                        // 2. Crear el PDF
                        const doc = new PDFDocument();
                        const pdfName = `${reminder.message.split(' ').slice(0, 3).join('_')}_${Date.now()}.pdf`;
                        const pdfPath = `uploads/${pdfName}`;
                        
                        const stream = fs.createWriteStream(pdfPath);
                        doc.pipe(stream);
                        doc.fontSize(12).text(content, { align: 'justify' });
                        doc.end();

                        await new Promise(resolve => stream.on('finish', resolve));

                        // 3. Crear la URL de descarga usando la URL pública de Render
                        mediaUrl = `${RENDER_PUBLIC_URL}/${pdfPath}`;
                        messageBody = `¡Hola! Aquí tienes el PDF que me pediste sobre "${reminder.message}":`;
                    }

                    // Envía el mensaje de WhatsApp
                    await client.messages.create({
                        from: process.env.TWILIO_WHATSAPP_NUMBER,
                        to: `whatsapp:${reminder.whatsapp_number}`,
                        body: messageBody,
                        mediaUrl: mediaUrl,
                    });
                    
                    // Actualiza el estado del recordatorio a 'sent'
                    await reminderModel.updateStatus(reminder.id, 'sent');
                    console.log(`Recordatorio #${reminder.id} enviado a ${reminder.whatsapp_number}`);

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