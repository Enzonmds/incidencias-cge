import { Ticket, User, Message } from '../models/index.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';

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
                const from = messageObj.from; // e.g. "5491112345678"
                const messageBody = messageObj.text?.body || '';
                const name = body.entry[0].changes[0].value.contacts[0]?.profile?.name || 'Usuario WhatsApp';

                console.log(`📩 WhatsApp from ${name} (${from}): ${messageBody}`);

                // --- LOGIC START ---
                // 1. Find or Create User by Phone
                let user = await User.findOne({ where: { phone: from } });

                if (!user) {
                    // Start as Guest in MENU mode
                    user = await User.create({
                        name: name,
                        email: `guest_${from}@cge.mil.ar`,
                        password_hash: 'guest123',
                        role: 'USER',
                        phone: from,
                        whatsapp_step: 'MENU'
                    });
                }

                // --- DEBUG COMMAND: /reset ---
                if (messageBody.trim().toLowerCase() === '/reset') {
                    user.whatsapp_step = 'MENU';
                    user.whatsapp_temp_role = null;
                    await user.save();
                    await sendWhatsAppMessage(from, `🔄 Sesión reiniciada. Test mode active.`);
                    // Fall through to switch to show menu immediately
                }

                // 2. State Machine
                switch (user.whatsapp_step) {
                    case 'MENU':
                        // Show Menu
                        await sendWhatsAppMessage(from, `👋 Bienvenido a la Ticketera CGE. Por favor, seleccione su perfil:\n\n1️⃣ Personal Militar\n2️⃣ Agente Civil\n3️⃣ Entidad Externa\n4️⃣ Usuario No Registrado`);
                        user.whatsapp_step = 'WAITING_SELECTION';
                        await user.save();
                        break;

                    case 'WAITING_SELECTION':
                        const selection = messageBody.trim();
                        if (selection === '1' || selection.includes('Militar')) {
                            // Generate Magic Link
                            const token = jwt.sign(
                                { phone: from, guestId: user.id },
                                process.env.JWT_SECRET,
                                { expiresIn: '1h' }
                            );
                            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
                            const link = `${frontendUrl}/verify-whatsapp?token=${token}`;

                            await sendWhatsAppMessage(from, `🎖️ Personal Militar: Para validar su identidad y obtener prioridad ALTA, por favor ingrese al siguiente enlace:\n\n🔗 ${link}\n\nUna vez validado, podrá enviar su consulta.`);

                            user.whatsapp_step = 'WAITING_LOGIN';
                            user.role = 'USER'; // Will be updated to match AD user later
                        } else if (['2', '3', '4'].includes(selection)) {
                            // Guest flow
                            const roles = { '2': 'CIVIL', '3': 'ENTIDAD', '4': 'NO_REGISTRADO' };
                            user.whatsapp_temp_role = roles[selection];
                            user.whatsapp_step = 'GUEST_FLOW';
                            await sendWhatsAppMessage(from, `✅ Perfil registrado. Por favor, describa brevemente su consulta o incidente.`);
                        } else {
                            await sendWhatsAppMessage(from, `❌ Opción no válida. Responda 1, 2, 3 o 4.`);
                        }
                        await user.save();
                        break;

                    case 'ACTIVE_SESSION':
                    case 'GUEST_FLOW':
                        // 3. Find Open Ticket Logic (Existing)
                        let ticket = await Ticket.findOne({
                            where: {
                                created_by_user_id: user.id,
                                status: ['OPEN', 'IN_PROGRESS', 'WAITING_USER']
                            },
                            order: [['createdAt', 'DESC']]
                        });

                        if (ticket) {
                            // Append Message
                            await Message.create({
                                ticket_id: ticket.id,
                                sender_type: 'USER',
                                sender_id: user.id,
                                content: messageBody,
                            });
                            if (ticket.status === 'WAITING_USER') {
                                ticket.status = 'IN_PROGRESS';
                                await ticket.save();
                            }
                            console.log(`✅ Appended to Ticket #${ticket.id}`);
                        } else {
                            // Create New Ticket
                            // Determine Priority
                            let priority = 'LOW';
                            if (user.whatsapp_temp_role === 'CIVIL') priority = 'MEDIUM';
                            // Militar priority will be high when linked

                            ticket = await Ticket.create({
                                title: `Consulta WhatsApp (${user.whatsapp_temp_role || 'User'})`,
                                description: messageBody,
                                priority: priority,
                                status: 'OPEN',
                                created_by_user_id: user.id,
                                channel: 'WHATSAPP'
                            });

                            await Message.create({
                                ticket_id: ticket.id,
                                sender_type: 'USER',
                                sender_id: user.id,
                                content: messageBody,
                            });
                            console.log(`🆕 Ticket #${ticket.id} created`);
                            await sendWhatsAppMessage(from, `✅ Ticket #${ticket.id} creado. Un agente lo revisará.`);
                        }
                        break;

                    default:
                        // Should not happen, reset to MENU
                        user.whatsapp_step = 'MENU';
                        await user.save();
                        await sendWhatsAppMessage(from, `Reiniciando menú... Escriba 'Hola' de nuevo.`);
                        break;
                }
                // --- LOGIC END ---
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

// Helper: Send Message back to WhatsApp
const sendWhatsAppMessage = async (to, text) => {
    try {
        // FIX: Meta Sandbox for Argentina sometimes requires '54 11 15...' instead of '54 9 11...'
        // If we see '54911' (Mobile Buenos Aires), change to '541115'
        if (to.startsWith('54911')) {
            to = to.replace('54911', '541115');
        }

        await axios.post(
            `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.log(`📤 Reply sent to ${to}`);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error?.response?.data || error.message);
    }
};
