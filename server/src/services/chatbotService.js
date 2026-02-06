
import { Op } from 'sequelize';
import { Ticket, User, Message } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { sendWhatsAppMessage } from './whatsappService.js';
import { sendTicketCreated, sendEmail } from './emailService.js';

// ... (imports remain)

// ...

const handleEmailInput = async (user, messageBody, from) => {
    const email = messageBody.trim().toLowerCase();

    // Basic Email Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        await sendWhatsAppMessage(from, `❌ El formato del correo electrónico no es válido. Por favor, verifique e intente nuevamente (ejemplo: usuario@dominio.com).`);
        return;
    }

    // Check if email already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
        await sendWhatsAppMessage(from, `⚠️ Esta dirección de correo ya se encuentra registrada en nuestro sistema bajo el nombre "${existingUser.name}".\n\nSi usted es esta persona, escriba *Menu* para reiniciar e ingrese su DNI nuevamente, o contacte a la División Sistemas si requiere asistencia.`);
        return;
    }

    // Save Email and Send Invitation
    user.email = email;
    // Set to WAITING_SELECTION to continue profile setup
    user.whatsapp_step = 'WAITING_SELECTION';
    await user.save();

    // Generate Invite
    const inviteToken = jwt.sign(
        { id: user.id, email: user.email, purpose: 'invite' },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
    const frontendUrl = process.env.FRONTEND_URL || 'https://consultas.cge.mil.ar';
    const setupLink = `${frontendUrl}/setup-password?token=${inviteToken}`;

    const emailSubject = 'Bienvenido a Mesa de Ayuda CGE - Completar Registro';
    const emailHtml = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #004d99;">Bienvenido al Sistema de Incidencias CGE</h2>
            <p>Hemos recibido su registro a través de nuestro Asistente Virtual.</p>
            <p>Para finalizar su alta y acceder al portal web, por favor defina su contraseña haciendo clic en el siguiente enlace:</p>
            <p style="text-align: center; margin: 30px 0;">
                <a href="${setupLink}" style="padding: 12px 25px; background-color: #004d99; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">Establecer Contraseña</a>
            </p>
            <p>Un cordial saludo,<br><strong>División Sistemas Informáticos</strong></p>
        </div>
    `;

    // Send Email Async
    sendEmail({ to: email, subject: emailSubject, html: emailHtml }).catch(console.error);

    await sendWhatsAppMessage(from, `✅ Correo registrado correctamente.\n\nHemos enviado un enlace a su casilla *${email}* para que pueda generar su contraseña y acceder también vía Web.\n\nContinuemos por aquí: Por favor, seleccione su perfil:\n\n1️⃣ Personal Militar\n2️⃣ Agente Civil\n3️⃣ Entidad Externa\n4️⃣ Usuario No Registrado`);
};
import { predictQueue } from './aiService.js';
import { calculatePriority } from '../utils/priorityUtils.js';
import { searchKnowledge } from './knowledgeService.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://consultas.cge.mil.ar';
const LEGAL_LINK = `${FRONTEND_URL}/legal`;

export const processMessage = async (user, messageBody, from) => {
    try {
        const cleanMsg = messageBody.trim().toLowerCase();

        // 0. Ignore empty or media-only triggers handled elsewhere
        if (!cleanMsg) return;

        // 1. GLOBAL COMMANDS
        if (['/reset', 'salir', 'menu', 'exit', 'chau', 'adios', 'bye', 'cancelar'].includes(cleanMsg)) {
            return await handleReset(user, from);
        }

        // 2. STATE MACHINE
        switch (user.whatsapp_step) {
            case 'MENU':
            case 'WAITING_DNI':
                // Check for greetings if they haven't started DNI flow properly
                if (['hola', 'buenas', 'ayuda'].some(w => cleanMsg.startsWith(w))) {
                    await sendWhatsAppMessage(from, `👋 Hola! Soy el Asistente Virtual de CGE.\n\n📝 *Solo procesamos mensajes de texto.*\n🚫 *No se aceptan audios ni llamadas.*\n\nPara iniciar, por favor ingrese su número de DNI (sin puntos):`);
                    return;
                }
                return await handleDniInput(user, messageBody, from);

            case 'WAITING_EMAIL':
                return await handleEmailInput(user, messageBody, from);

            case 'WAITING_TOPIC':
                return await handleTopicSelection(user, messageBody, from);

            case 'WAITING_DESCRIPTION':
                return await handleTicketCreation(user, messageBody, from);

            case 'WAITING_SELECTION':
                return await handleProfileSelection(user, messageBody, from);

            case 'WAITING_LOGIN':
                return await handleLoginPending(user, from);

            case 'ACTIVE_SESSION':
            case 'GUEST_FLOW':
                // Check if there is a resolved ticket pending confirmation first
                const handledResolution = await handleResolutionConfirmation(user, messageBody, from);
                if (handledResolution) return;

                // Otherwise, handle normal conversation (append to open ticket)
                return await handleActiveSession(user, messageBody, from);

            case 'WAITING_RATING':
                return await handleRating(user, messageBody, from);

            case 'WAITING_RAG_CONFIRMATION':
                return await handleRAGConfirmation(user, cleanMsg, from);

            default:
                // Fallback
                user.whatsapp_step = 'WAITING_DNI';
                await user.save();
                await sendWhatsAppMessage(from, `Reiniciando... Por favor ingrese su DNI.`);
        }
    } catch (error) {
        console.error('Chatbot Service Error:', error);
        await sendWhatsAppMessage(from, `⚠️ Ocurrió un error interno. Por favor intente más tarde.`);
    }
};

// --- Handlers ---

const handleReset = async (user, from) => {
    user.whatsapp_step = 'WAITING_DNI';
    user.whatsapp_temp_role = null;
    await user.save();
    await sendWhatsAppMessage(from, `🔄 *Reinicio del Sistema*\n\n👋 Hola de nuevo. Para comenzar, ingrese su DNI (sin puntos):`);
};

const handleDniInput = async (user, messageBody, from) => {
    const dniInput = messageBody.replace(/\D/g, ''); // Remove non-digits
    if (dniInput.length < 6) {
        await sendWhatsAppMessage(from, `❌ DNI no válido. Por favor, ingrese únicamente números.`);
        return;
    }

    const existingUser = await User.findOne({ where: { dni: dniInput } });
    console.log(`🔍 Lookup DNI: ${dniInput}. Found: ${existingUser ? 'YES' : 'NO'}`);

    if (existingUser) {
        if (existingUser.phone && existingUser.phone === from) {
            // CASE A: DNI & Phone Match -> Auto Verify
            user.whatsapp_step = 'WAITING_TOPIC';
            user.role = existingUser.role || 'USER';
            user.name = existingUser.name;
            await user.save();
            await sendWhatsAppMessage(from, `👋 Hola ${existingUser.name}, bienvenido nuevamente al Servicio de Ayuda CGE.\n\nPor favor, seleccione el área de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *Puede también describir su inconveniente directamente.*`);
        } else {
            // CASE B: DNI Exists, Phone Mismatch -> Magic Link
            console.log('🔒 Authentication required. Sending Magic Link...');
            user.whatsapp_temp_role = `TARGET:${existingUser.id}`;
            user.whatsapp_step = 'WAITING_LOGIN';
            await user.save();

            const token = jwt.sign(
                { phone: from, guestId: user.id, targetUserId: existingUser.id },
                process.env.JWT_SECRET,
                { expiresIn: '1h' }
            );
            const link = `${FRONTEND_URL}/verify-whatsapp?token=${token}`;
            await sendWhatsAppMessage(from, `🔒 Por motivos de seguridad, necesitamos validar su identidad.\n\nPor favor, ingrese al siguiente enlace para vincular este dispositivo:\n\n${link}`);
        }
    } else {
        // CASE C: User Does NOT Exist -> Ask for Email
        user.dni = dniInput;
        user.whatsapp_step = 'WAITING_EMAIL';
        await user.save();
        await sendWhatsAppMessage(from, `ℹ️ No hemos encontrado un registro asociado a ese DNI.\n\n📧 *Para iniciar su alta en el sistema, por favor indíquenos su dirección de correo electrónico institucional (o personal):*`);
    }
};

// ... handleEmailInput is handled in previous chunk ...

const handleProfileSelection = async (user, messageBody, from) => {
    const selection = messageBody.trim();
    let profileName = '';

    if (selection === '1') profileName = 'PERSONAL_MILITAR';
    if (selection === '2') profileName = 'AGENTE_CIVIL';
    if (selection === '3') profileName = 'ENTIDAD_EXTERNA';
    if (selection === '4') profileName = 'INVITADO';

    if (profileName) {
        user.whatsapp_temp_role = profileName;
        user.role = 'USER'; // Promote to User so they can operate
        user.whatsapp_step = 'WAITING_TOPIC'; // Proceed to Topic Selection directly
        await user.save();

        await sendWhatsAppMessage(from, `✅ Perfil configurado correctamente.\n\nA continuación, seleccione el tema de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *O describa su problema a continuación:*`);

    } else {
        await sendWhatsAppMessage(from, `❌ Opción no válida. Por favor responda con el número de su opción (1, 2, 3 o 4).`);
    }
};

const handleTopicSelection = async (user, messageBody, from) => {
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
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        await user.save();
        await sendWhatsAppMessage(from, `📂 Tema seleccionado: *${topic}*.\n\n⚠️ *Importante*: Al solicitar información detallada, usted consiente el uso de sus datos. Lea nuestro aviso legal aquí:\n🔗 ${LEGAL_LINK}\n\n📝 *Por favor, describa detalladamente su consulta ahora:*`);
    } else {
        if (messageBody.trim().length < 5) {
            await sendWhatsAppMessage(from, `⚠️ Por favor, describa su problema con más detalle (mínimo 5 letras) para poder ayudarle.`);
            return;
        }

        await sendWhatsAppMessage(from, `🧠 Analizando su consulta...`);

        const ragResult = await searchKnowledge(messageBody);

        if (ragResult) {
            await sendWhatsAppMessage(from, `💡 *Encontré información que podría ayudarle:*\n\n${ragResult.content}\n\n---\n❓ *¿Esto resuleve su problema?*\nResponda *SI* para finalizar.\nResponda *NO* para crear un ticket human.`);
            user.whatsapp_step = 'WAITING_RAG_CONFIRMATION';
            user.whatsapp_temp_role = ragResult.id;
            await user.save();
            return;
        }

        const predictedQueue = await predictQueue(messageBody);
        user.whatsapp_topic = `IA_AUTO: ${predictedQueue}`;
        await user.save();
        await handleTicketCreation(user, messageBody, from, predictedQueue);
    }
};

const handleLoginPending = async (user, from) => {
    const targetId = user.whatsapp_temp_role && user.whatsapp_temp_role.startsWith('TARGET:')
        ? user.whatsapp_temp_role.split(':')[1]
        : null;

    const reToken = jwt.sign(
        { phone: from, guestId: user.id, targetUserId: targetId },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    const reLink = `${FRONTEND_URL}/verify-whatsapp?token=${reToken}`;
    await sendWhatsAppMessage(from, `⏳ *Identidad pendiente de validación*\n\nEstamos esperando que inicies sesión para vincular tu cuenta.\n\n🔗 *Enlace de validación (Nuevo)*:\n${reLink}\n\n(Haz click y elige "Ingresar y Verificar")`);
};

const handleResolutionConfirmation = async (user, messageBody, from) => {
    let resolvedTicket = await Ticket.findOne({
        where: {
            created_by_user_id: user.id,
            status: 'RESUELTO_TECNICO'
        }
    });

    if (!resolvedTicket) return false;

    const response = messageBody.trim().toLowerCase();
    const positiveIntents = ['si', 's', 'sí', 'gracias', 'resuelto', 'ok', 'excelente', 'listo', 'funciona', 'ya esta'];
    const negativeIntents = ['no', 'n', 'mal', 'sigue igual', 'error', 'falla'];

    if (positiveIntents.some(w => response.startsWith(w) || response.includes(w))) {
        resolvedTicket.status = 'CERRADO';
        await resolvedTicket.save();

        await sendWhatsAppMessage(from, `🌟 ¡Nos alegra haber podido ayudar!\n\nPor favor, califique la atención del 1 al 5:\n\n1️⃣ Mala\n2️⃣ Regular\n3️⃣ Buena\n4️⃣ Muy Buena\n5️⃣ Excelente`);

        user.whatsapp_step = 'WAITING_RATING';
        user.whatsapp_temp_role = resolvedTicket.id.toString();
        await user.save();
        return true;

    } else if (negativeIntents.some(w => response.startsWith(w))) {
        resolvedTicket.status = 'IN_PROGRESS';
        await resolvedTicket.save();

        await Message.create({
            ticket_id: resolvedTicket.id,
            sender_type: 'USER',
            sender_id: user.id,
            content: `[RECHAZO DE SOLUCIÓN]: El usuario indicó que NO está resuelto.`,
        });
        await sendWhatsAppMessage(from, `⚠️ Entendido. Su caso ha sido reabierto y un agente volverá a revisarlo pronto.\n\nPuede agregar más detalles si lo desea.`);
        return true;

    } else {
        await sendWhatsAppMessage(from, `🤖 No entendí su respuesta.\n\n¿Se solucionó su problema?\n\nResponda *SI* para cerrar el caso.\nResponda *NO* para que un agente lo contacte nuevamente.`);
        return true;
    }
};

const handleActiveSession = async (user, messageBody, from) => {
    const cleanMsg = messageBody.trim().toLowerCase();
    const GREETINGS = ['hola', 'buen dia', 'buenos dias', 'buenas', 'hi', 'start', 'empezar', 'menu'];

    // 1. Session Timeout Check (e.g., 2 hours)
    const lastInteraction = new Date(user.updatedAt).getTime();
    const now = new Date().getTime();
    const HOURS_2 = 2 * 60 * 60 * 1000;

    if (now - lastInteraction > HOURS_2) {
        // If message is NOT just a greeting, explain we are restarting context
        if (!GREETINGS.some(g => cleanMsg.startsWith(g))) {
            await sendWhatsAppMessage(from, `⏳ *Sesión expirada*\n\nHan pasado más de 2 horas desde tu última actividad. Vamos a empezar de nuevo.`);
        }
    }

    // 2. Explicit Greeting Handler
    if (GREETINGS.some(g => cleanMsg.startsWith(g) || cleanMsg === 'menu')) {
        await sendWhatsAppMessage(from, `👋 ¡Hola de nuevo ${user.name}!\n\n¿En qué puedo ayudarte hoy?\n\n1️⃣ Consultar Mis Tickets\n2️⃣ Crear Nueva Consulta\n3️⃣ Ver Temas Frecuentes`);

        // Reset state slightly to ensure they pick an option if they want
        // But keep ACTIVE_SESSION so we don't block them. Actually, wait for topic is better if they want to create.
        return;
        // Note: We don't change state here to allow them to "Create New" by just typing context if they want, 
        // or we could force them to waiting topic. Let's keep it fluid.
    }

    // 3. Find Open Ticket
    let ticket = await Ticket.findOne({
        where: {
            created_by_user_id: user.id,
            status: ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RECHAZADO', 'PENDIENTE_VALIDACION']
        },
        order: [['createdAt', 'DESC']]
    });

    if (ticket) {
        // ... (Existing logic for appending to ticket) ...
        await Message.create({
            ticket_id: ticket.id,
            sender_type: 'USER',
            sender_id: user.id,
            content: messageBody,
        });

        ticket.last_user_message_at = new Date();
        await ticket.save();

        if (['WAITING_USER', 'RECHAZADO'].includes(ticket.status)) {
            ticket.status = 'PENDIENTE_VALIDACION';
            await ticket.save();
            await sendWhatsAppMessage(from, `✅ Información recibida. Su caso #${ticket.id} ha sido reactivado para validación.`);
        } else {
            await sendWhatsAppMessage(from, `📝 Mensaje agregado al Ticket #${ticket.id}`);
        }
        console.log(`✅ Appended to Ticket #${ticket.id}`);

    } else {
        // 4. No Ticket Found -> Smart Fallback
        // If message is media, warn about ticket requirement
        if (messageBody.startsWith('[') && messageBody.endsWith(']')) {
            await sendWhatsAppMessage(from, `📸 Recibí su archivo, pero no tiene un ticket abierto para adjuntarlo.\n\nInicie una consulta primero.`);
            return;
        }

        // Instead of "I didn't understand", assume they want support
        if (cleanMsg.length > 5 && !cleanMsg.match(/^\d+$/)) {
            // Maybe they are describing a problem directly? Let's try to capture it.
            // We can treat this as "Implicit Description" and ask to confirm topic.
            // For now, let's just show the menu but friendlier.
        }

        user.whatsapp_step = 'WAITING_TOPIC';
        await user.save();

        await sendWhatsAppMessage(from, `🤔 No tienes tickets abiertos en este momento.\n\nPara iniciar una nueva consulta, por favor elige un tema:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *También puedes escribir tu consulta directamente aquí.*`);
    }
};

const handleRating = async (user, messageBody, from) => {
    const rating = messageBody.trim().replace(/\D/g, '');

    if (['1', '2', '3', '4', '5'].includes(rating)) {
        const ticketId = user.whatsapp_temp_role;
        try {
            const ticket = await Ticket.findByPk(ticketId);
            if (ticket) {
                ticket.rating_score = parseInt(rating);
                await ticket.save();
                console.log(`⭐ User Rated Ticket #${ticket.id}: ${rating}/5`);
            }
        } catch (e) {
            console.error('Error saving rating:', e);
        }

        await sendWhatsAppMessage(from, `🙌 ¡Gracias por su calificación! Hasta luego.`);

        user.whatsapp_step = 'ACTIVE_SESSION';
        user.whatsapp_temp_role = null;
        await user.save();
    } else {
        await sendWhatsAppMessage(from, `⚠️ Opción no válida.\n\nPor favor, califique la atención respondiendo solo con un número del 1 al 5:\n\n1️⃣ Mala\n2️⃣ Regular\n3️⃣ Buena\n4️⃣ Muy Buena\n5️⃣ Excelente`);
    }
};
