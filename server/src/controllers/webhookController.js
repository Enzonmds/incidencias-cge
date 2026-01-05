import { Op } from 'sequelize';
import { Ticket, User, Message } from '../models/index.js';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

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
                    // user.dni = null; // CRITICAL FIX: Do NOT wipe DNI. It deletes real user identity.
                    await user.save();

                    await sendWhatsAppMessage(from, `👋 Hola de nuevo!.\n\n⚠️ Antes de continuar, lea nuestro Aviso Legal:\n🔗 ${legalLink}\n\nPara iniciar, por favor ingrese su número de DNI (sin puntos):`);
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
                        const allUsersDebug = await User.findAll({ attributes: ['dni'] });
                        console.log('🔎 DEBUG DB VISIBILITY - All DNIS:', allUsersDebug.map(u => u.dni));

                        const existingUser = await User.findOne({ where: { dni: dniInput } });
                        console.log(`🔍 Lookup DNI: ${dniInput}. Found: ${existingUser ? 'YES' : 'NO'}`);

                        if (existingUser) {
                            if (existingUser.phone && existingUser.phone === from) {
                                // CASE A: DNI & Phone Match -> Auto Verify
                                user.whatsapp_step = 'WAITING_TOPIC'; // Go to Menu
                                user.role = existingUser.role || 'USER'; // Sync Role
                                user.name = existingUser.name;
                                await user.save();
                                await sendWhatsAppMessage(from, `👋 Hola ${existingUser.name}, bienvenido nuevamente.\n\nPor favor, seleccione el tema de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres`);
                            } else {
                                // CASE B: DNI Exists, but Phone Mismatch/New -> Magic Link
                                console.log('🔒 Authentication required. Sending Magic Link...');

                                // Store Target ID temporarily to persist context
                                user.whatsapp_temp_role = `TARGET:${existingUser.id}`;
                                user.whatsapp_step = 'WAITING_LOGIN';
                                await user.save();

                                // Generate Magic Link
                                const token = jwt.sign(
                                    { phone: from, guestId: user.id, targetUserId: existingUser.id },
                                    process.env.JWT_SECRET,
                                    { expiresIn: '1h' }
                                );
                                const link = `${frontendUrl}/verify-whatsapp?token=${token}`;

                                // Generic Message (Privacy)
                                await sendWhatsAppMessage(from, `🔒 Para validar su identidad, por favor inicie sesión ingresando al siguiente enlace:\n\n${link}`);
                            }

                        } else {
                            // CASE C: User Does NOT Exist -> Profile Menu
                            user.dni = dniInput; // temporarily store DNI (optional, or just proceed)
                            user.whatsapp_step = 'WAITING_SELECTION';
                            await user.save();
                            await sendWhatsAppMessage(from, `👤 No te encontramos registrado con ese DNI.\n\nPor favor, selecciona tu perfil:\n\n1️⃣ Personal Militar\n2️⃣ Agente Civil\n3️⃣ Entidad Externa\n4️⃣ Usuario No Registrado`);
                        }
                        break;

                    case 'WAITING_TOPIC': // User selects topic
                        const topicMap = {
                            '1': 'Haberes',
                            '2': 'Viaticos',
                            '3': 'Casinos | Barrios Militares',
                            '4': 'Datos personales',
                            '5': 'Juicios',
                            '6': 'Suplementos',
                            '7': 'Alquileres'
                        };
                        const topic = topicMap[messageBody.trim()];

                        if (topic) {
                            user.whatsapp_topic = topic;
                            user.whatsapp_step = 'WAITING_DESCRIPTION'; // Next Step: Description
                            await user.save();
                            await sendWhatsAppMessage(from, `📂 Tema seleccionado: *${topic}*.\n\n⚠️ *Importante*: Al solicitar información detallada, usted consiente el uso de sus datos. Lea nuestro aviso legal aquí:\n🔗 ${legalLink}\n\n📝 *Por favor, describa detalladamente su consulta ahora:*`);
                        } else {
                            await sendWhatsAppMessage(from, `❌ Opción no válida. Por favor, elija una opción del 1 al 7.`);
                        }
                        break;

                    case 'WAITING_DESCRIPTION': // User enters description -> Create Ticket
                        // Create New Ticket
                        // Determine Priority
                        let priority = 'LOW';
                        if (user.role !== 'USER') priority = 'HIGH'; // Admin/Agent priority
                        else if (user.whatsapp_temp_role === 'CIVIL') priority = 'MEDIUM';

                        // Default Ticket Creation - FORCE TRIAGE (Mesa de Entradas)
                        const dTicket = await Ticket.create({
                            title: `Consulta WhatsApp ${user.whatsapp_topic ? `[Intención: ${user.whatsapp_topic}]` : ''} (${user.whatsapp_temp_role || 'User'})`,
                            description: messageBody,
                            priority: priority,
                            status: 'PENDIENTE_VALIDACION', // Force Triage Validation
                            category: 'OTHER', // Reset category to force manual classification
                            created_by_user_id: user.id,
                            channel: 'WHATSAPP',
                            dni_solicitante: user.dni || 'No provisto'
                        });

                        await Message.create({
                            ticket_id: dTicket.id,
                            sender_type: 'USER',
                            sender_id: user.id,
                            content: messageBody,
                        });

                        user.whatsapp_step = 'ACTIVE_SESSION';
                        await user.save();

                        console.log(`🆕 Ticket #${dTicket.id} created`);
                        await sendWhatsAppMessage(from, `✅ Ticket #${dTicket.id} creado exitosamente.\n\nEn breve nos estaremos comunicando con usted. Si desea, puede agregar más detalles escribiendo aquí mismo.`);
                        break;

                    case 'WAITING_SELECTION':
                        const selection = messageBody.trim();

                        if (['1', '2'].includes(selection)) {
                            user.whatsapp_temp_role = selection === '1' ? 'MILITAR_NO_VERIFICADO' : 'CIVIL_NO_VERIFICADO';
                            // Direct to description for guests, but warn about Legal
                            user.whatsapp_step = 'WAITING_DESCRIPTION';

                            await sendWhatsAppMessage(from, `⚠️ *Usuario No Verificado*\n\nPara figurar en el sistema, contacte al Encargado de Informática.\n\n🔗 *Aviso Legal*: ${legalLink}\n\n📝 *Por favor, detalle su consulta para ser atendido como invitado:*`);

                        } else if (['3', '4'].includes(selection)) {
                            const roles = { '3': 'ENTIDAD', '4': 'NO_REGISTRADO' };
                            user.whatsapp_temp_role = roles[selection];
                            user.whatsapp_step = 'WAITING_DESCRIPTION'; // Unify

                            await sendWhatsAppMessage(from, `✅ Perfil registrado.\n\n🔗 *Aviso Legal*: ${legalLink}\n\n📝 *Por favor, detalle su consulta a continuación:*`);

                        } else {
                            await sendWhatsAppMessage(from, `❌ Opción no válida. Responda 1, 2, 3 o 4.`);
                        }
                        await user.save();
                        break;

                    case 'WAITING_LOGIN':
                        // Regenerate Magic Link in case they lost it
                        const targetId = user.whatsapp_temp_role && user.whatsapp_temp_role.startsWith('TARGET:')
                            ? user.whatsapp_temp_role.split(':')[1]
                            : null;

                        const reToken = jwt.sign(
                            { phone: from, guestId: user.id, targetUserId: targetId },
                            process.env.JWT_SECRET,
                            { expiresIn: '1h' }
                        );
                        const reLink = `${frontendUrl}/verify-whatsapp?token=${reToken}`;
                        await sendWhatsAppMessage(from, `⏳ *Identidad pendiente de validación*\n\nEstamos esperando que inicies sesión para vincular tu cuenta.\n\n🔗 *Enlace de validación (Nuevo)*:\n${reLink}\n\n(Haz click y elige "Ingresar y Verificar")`);
                        break;

                    case 'ACTIVE_SESSION':
                    case 'GUEST_FLOW':
                        // 2.5 Check for Resolution Confirmation (High Priority)
                        let resolvedTicket = await Ticket.findOne({
                            where: {
                                created_by_user_id: user.id,
                                status: 'RESUELTO_TECNICO'
                            }
                        });

                        if (resolvedTicket) {
                            const response = messageBody.trim().toUpperCase();
                            if (response === 'SI' || response === 'SÍ') {
                                // User Confirms Resolution > CLOSE Ticket
                                resolvedTicket.status = 'CERRADO'; // Final state
                                await resolvedTicket.save();

                                // Ask for Rating (Optional)
                                const ratingLink = `${process.env.FRONTEND_URL}/rate/${resolvedTicket.id}`; // Concept
                                await sendWhatsAppMessage(from, `🌟 ¡Muchas gracias! Nos alegra haber podido ayudar.\n\nPor favor, califique la atención recibida respondiendo con un número del 1 al 5:\n\n1️⃣ Mala\n2️⃣ Regular\n3️⃣ Buena\n4️⃣ Muy Buena\n5️⃣ Excelente`);

                                user.whatsapp_step = 'WAITING_RATING';
                                user.whatsapp_temp_role = resolvedTicket.id.toString(); // Store ticket ID for rating
                                await user.save();
                                return res.sendStatus(200); // Stop processing

                            } else if (response === 'NO') {
                                // User Rejects Resolution > REOPEN
                                resolvedTicket.status = 'IN_PROGRESS';
                                await resolvedTicket.save();

                                await Message.create({
                                    ticket_id: resolvedTicket.id,
                                    sender_type: 'USER',
                                    sender_id: user.id,
                                    content: `[RECHAZO DE SOLUCIÓN]: El usuario indicó que NO está resuelto.`,
                                });
                                await sendWhatsAppMessage(from, `⚠️ Entendido. Su caso ha sido reabierto y un agente volverá a revisarlo pronto.\n\nPuede agregar más detalles si lo desea.`);
                                return res.sendStatus(200); // Stop processing

                            } else {
                                // Invalid Response
                                await sendWhatsAppMessage(from, `🤖 No entendí su respuesta.\n\n¿Se solucionó su problema?\n\nResponda *SI* para cerrar el caso.\nResponda *NO* para que un agente lo contacte nuevamente.`);
                                return res.sendStatus(200); // Stop processing
                            }
                        }

                        // 3. Find Open Ticket Logic (Existing)
                        let ticket = await Ticket.findOne({
                            where: {
                                created_by_user_id: user.id,
                                status: ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RECHAZADO', 'PENDIENTE_VALIDACION']
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

                            // Re-open if it was waiting or rejected
                            if (['WAITING_USER', 'RECHAZADO'].includes(ticket.status)) {
                                ticket.status = 'PENDIENTE_VALIDACION'; // Send back to Triage
                                await ticket.save();
                                await sendWhatsAppMessage(from, `✅ Información recibida. Su caso ha sido enviado nuevamente a validación.`);
                            }
                            console.log(`✅ Appended to Ticket #${ticket.id}`);
                        } else {
                            // NO Active Ticket -> SHOW MENU (Strict Mode)
                            // Do not create generic tickets.

                            user.whatsapp_step = 'WAITING_TOPIC';
                            await user.save();

                            await sendWhatsAppMessage(from, `❌ No entendí su mensaje o no tiene un ticket abierto.\n\nPor favor, seleccione una opción del menú para iniciar una nueva consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres`);
                        }
                        break;

                    case 'WAITING_RATING':
                        const rating = messageBody.trim().replace(/\D/g, '');

                        if (['1', '2', '3', '4', '5'].includes(rating)) {
                            // Just capture anything, say thanks, reset.
                            await sendWhatsAppMessage(from, `🙌 ¡Gracias por su calificación! Hasta luego.`);

                            // Log rating (dummy implementation)
                            console.log(`⭐ User Rated Ticket #${user.whatsapp_temp_role}: ${rating}/5`);

                            user.whatsapp_step = 'ACTIVE_SESSION'; // Reset
                            user.whatsapp_temp_role = null;
                            await user.save();
                        } else {
                            // Invalid Input -> Remind Options
                            await sendWhatsAppMessage(from, `⚠️ Opción no válida.\n\nPor favor, califique la atención respondiendo solo con un número del 1 al 5:\n\n1️⃣ Mala\n2️⃣ Regular\n3️⃣ Buena\n4️⃣ Muy Buena\n5️⃣ Excelente`);
                            // Do NOT change step, wait for retry
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
