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
    const { message } = req.body;
    const user = req.user; // req.user es inyectado por authMiddleware
    const from = user.whatsapp_number; // Usamos el número para la sesión

    try {
        const interpretation = await aiService.interpretMessage(message);
        
        // Si la petición es para generar un PDF
        if (interpretation.intent === 'generate_pdf') {
            const query = interpretation.entity;
            if (!query) {
                return res.json({ reply: "Claro, dime sobre qué quieres que escriba en el PDF." });
            }

            const pdfData = await aiService.generatePdfContent(query, user.nombre);
            if (!pdfData || !pdfData.textContent) {
                return res.json({ reply: "Lo siento, no pude generar el contenido para tu PDF." });
            }

            const doc = new PDFDocument();
            const pdfName = `${query.split(' ').slice(0,3).join('_')}_${Date.now()}.pdf`;
            const userUploadsPath = path.join(__dirname, '..', 'uploads', `${user.id}`);
            if (!fs.existsSync(userUploadsPath)) fs.mkdirSync(userUploadsPath, { recursive: true });
            const pdfPath = path.join('uploads', `${user.id}`, pdfName);
            const stream = fs.createWriteStream(pdfPath);
            doc.pipe(stream);
            
            // --- ESTRUCTURA DEL PDF ---
            doc.fontSize(22).text(pdfData.structure.titulo, { align: 'center' });
            doc.moveDown(0.5);
            doc.fontSize(10).text(`Solicitado por: ${pdfData.userName}`, { align: 'center' });
            doc.fontSize(10).text(`Fecha: ${pdfData.today}`, { align: 'center' });
            doc.moveDown(2);

            // Loop para Texto e Imágenes
            doc.fontSize(12).text(pdfData.textContent, { align: 'justify' });
            
            doc.end();
            await new Promise(resolve => stream.on('finish', resolve));
            
            const publicPdfPath = pdfPath.replace(/\\/g, '/');
            const fileUrlPdf = `${RENDER_URL}/${publicPdfPath}`;
            
            // Devolvemos la URL del PDF al chat del dashboard
            return res.json({ reply: `¡Listo! 📄 Aquí tienes tu documento sobre "${query}": ${fileUrlPdf}` });
        }

        // Si es una conversación normal
        const userFolders = await folderModel.findByUserId(user.id);
        const userFiles = await fileModel.findAllByUserId(user.id);
        const conversationalReply = await aiService.generateConversationalResponse(message, user.nombre, { folders: userFolders, files: userFiles });
        
        res.status(200).json({ reply: conversationalReply });
    } catch (error) {
        res.status(500).json({ error: 'Error al procesar el mensaje.' });
    }
};