
import { User } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { processMessage } from '../services/chatbotService.js';
import { downloadWhatsAppMedia } from '../services/whatsappMediaService.js';

// 1. Webhook Verification (Handshake)
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ Webhook Verified');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request if tokens are missing
    }
};

// 2. Handle Incoming Messages
export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const body = req.body;

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObj = body.entry[0].changes[0].value.messages[0];
                const from = messageObj.from;
                const name = body.entry[0].changes[0].value.contacts[0]?.profile?.name || 'Usuario WhatsApp';
                const msgType = messageObj.type;

                let messageBody = '';

                if (msgType === 'text') {
                    messageBody = messageObj.text.body;
                } else if (['image', 'document'].includes(msgType)) {
                    // Download Media (Images & Docs only)
                    const mediaId = messageObj[msgType]?.id;
                    const mediaResult = await downloadWhatsAppMedia(mediaId, msgType);

                    if (mediaResult) {
                        messageBody = `[MEDIA_URL]: ${mediaResult.url}`;
                        console.log(`📎 Media Downloaded: ${mediaResult.filename}`);
                    } else {
                        messageBody = `[ERROR_DESCARGA_MEDIA: ${msgType}]`;
                    }
                } else if (msgType === 'audio') {
                    // Reject Audio
                    console.log(`🔇 Audio rejected from ${from}`);
                    await sendWhatsAppMessage(from, `🚫 *Sistema de Texto Exclusivamente*\n\nPor favor, *no envíe audios ni realice llamadas*.\n\nEscriba su consulta para que la Inteligencia Artificial pueda procesarla. Gracias.`);
                    return res.sendStatus(200); // Stop processing
                } else {
                    messageBody = `[ARCHIVO: ${msgType}]`;
                }

                console.log(`📩 WhatsApp from ${name} (${from}) [${msgType}]: ${messageBody} `);

                // 1. Find or Create User by Phone
                let user = await User.findOne({ where: { phone: from } });

                if (!user) {
                    // Start as Guest in WAITING_DNI mode
                    user = await User.create({
                        name: name,
                        email: `guest_${from}@cge.mil.ar`,
                        password_hash: 'guest123',
                        role: 'USER',
                        phone: from,
                        whatsapp_step: 'WAITING_DNI' // First Step
                    });
                    // Construct Legal Link
                    const frontendUrl = process.env.FRONTEND_URL || 'https://consultas.cge.mil.ar';
                    const legalLink = `${frontendUrl}/legal`;

                    // Send Welcome + Legal + DNI Request
                    await sendWhatsAppMessage(from, `👋 Hola! Soy el Asistente Virtual de CGE.\n\n⚠️ Antes de continuar, por favor lea nuestro Aviso Legal:\n🔗 ${legalLink}\n\nPara iniciar, por favor ingrese su número de DNI (sin puntos):`);
                    return res.sendStatus(200);
                }

                // 2. Delegate to Service
                await processMessage(user, messageBody, from);
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('Webhook Error:', error);
        res.sendStatus(500);
    }
};
