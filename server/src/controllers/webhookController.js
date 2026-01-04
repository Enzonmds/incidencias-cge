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

                // Construct Legal Link
                const frontendUrl = process.env.FRONTEND_URL || 'https://consultas.cge.mil.ar';
                const legalLink = `${frontendUrl}/legal`;

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
                    // Send Welcome + Legal + DNI Request
                    await sendWhatsAppMessage(from, `👋 Hola! Soy el Asistente Virtual de CGE.\n\n⚠️ Antes de continuar, por favor lea nuestro Aviso Legal:\n🔗 ${legalLink}\n\nPara iniciar, por favor ingrese su número de DNI (sin puntos):`);
                    return res.sendStatus(200);
                }

                // --- DEBUG COMMAND: /reset ---
                if (messageBody.trim().toLowerCase() === '/reset') {
                    user.whatsapp_step = 'WAITING_DNI';
                    user.whatsapp_temp_role = null;
                    user.dni = null; // Clear DNI binding if it was only partial
                    await user.save();
                    await sendWhatsAppMessage(from, `🔄 Sesión reiniciada.\n\nPor favor ingrese su número de DNI (sin puntos):`);
                    return res.sendStatus(200);
                }

                // 2. State Machine
                switch (user.whatsapp_step) {
                    case 'MENU': // Legacy / Fallback
                    case 'WAITING_DNI':
                        const dniInput = messageBody.replace(/\D/g, ''); // Remove non-digits
                        if (dniInput.length < 6) {
                            await sendWhatsAppMessage(from, `❌ DNI inválido. Por favor ingrese solo números.`);
                            break;
                        }

                        // Check if DNI exists in DB (Real User)
                        const existingUser = await User.findOne({ where: { dni: dniInput } });

                        if (existingUser) {
                            // CASE A: User Exists -> Auth Logic
                            // Generate Magic Link for THAT user (we use current guest session to facilitate the link)
                            const token = jwt.sign(
                                { phone: from, guestId: user.id, targetUserId: existingUser.id },
                                process.env.JWT_SECRET,
                                { expiresIn: '1h' }
                            );
                            const link = `${frontendUrl}/verify-whatsapp?token=${token}`;

                            await sendWhatsAppMessage(from, `✅ Hola ${existingUser.name}. Te encontramos en el sistema.\n\n🔐 Por seguridad, por favor valida tu identidad en este enlace:\n🔗 ${link}`);

                            user.whatsapp_step = 'WAITING_LOGIN';
                            await user.save();

                        } else {
                            // CASE B: User Does NOT Exist -> Profile Menu
                            user.dni = dniInput; // temporarily store DNI (optional, or just proceed)
                            user.whatsapp_step = 'WAITING_SELECTION';
                            await user.save();

                            await sendWhatsAppMessage(from, `👤 No te encontramos registrado con ese DNI.\n\nPor favor, selecciona tu perfil:\n\n1️⃣ Personal Militar\n2️⃣ Agente Civil\n3️⃣ Entidad Externa\n4️⃣ Usuario No Registrado`);
                        }
                        break;

                    case 'WAITING_SELECTION':
                        const selection = messageBody.trim();
                        if (selection === '1' || selection.includes('Militar')) {
                            // If they selected Militar but weren't found by DNI, maybe they need to register or we treat as Guest Militar?
                            // Flow says: "comprobará si es o no usuario... si no es usuario le preguntará... militar"
                            // So we treat as Guest Militar (unverified) or ask them to register?
                            // Let's treat as Guest High Priority for now, or ask to contact admin if strict.
                            // Assuming Guest Flow for now.
                            user.whatsapp_temp_role = 'MILITAR_NO_VERIFICADO';
                            user.whatsapp_step = 'GUEST_FLOW';
                            await sendWhatsAppMessage(from, `🎖️ Entendido. Por favor describa su consulta.`);
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

                    case 'WAITING_LOGIN':
                        await sendWhatsAppMessage(from, `⏳ Estamos esperando que valides tu identidad en el enlace enviado.`);
                        break;

                    case 'ACTIVE_SESSION':
                    // ... (Existing Active Session Logic) same as before but maybe greeting check
                    // If logic below handles ticket creation, we just fall through or copy logic.
                    // Merging logic below:
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
                            if (user.whatsapp_step === 'ACTIVE_SESSION') {
                                priority = 'HIGH';
                            } else if (user.whatsapp_temp_role === 'CIVIL') {
                                priority = 'MEDIUM';
                            }
                            // Entidad / No Registrado -> LOW

                            ticket = await Ticket.create({
                                title: `Consulta WhatsApp (${user.whatsapp_temp_role || 'User'})`,
                                description: messageBody,
                                priority: priority,
                                status: 'OPEN',
                                created_by_user_id: user.id,
                                channel: 'WHATSAPP',
                                dni_solicitante: user.dni || 'No provisto' // Ensure we capture DNI if available
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
                        user.whatsapp_step = 'WAITING_DNI';
                        await user.save();
                        await sendWhatsAppMessage(from, `Reiniciando... Por favor ingrese su DNI.`);
                        break;
                }
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
