
import { Op } from 'sequelize';
import { Ticket, User, Message } from '../models/index.js';
import jwt from 'jsonwebtoken';
import { sendWhatsAppMessage } from './whatsappService.js';
import { sendTicketCreated } from './emailService.js';
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
        await sendWhatsAppMessage(from, `❌ DNI inválido. Por favor ingrese solo números.`);
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
            await sendWhatsAppMessage(from, `👋 Hola ${existingUser.name}, bienvenido nuevamente.\n\nPor favor, seleccione el tema de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *O escriba su consulta y la tendremos en cuenta.*`);
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
            await sendWhatsAppMessage(from, `🔒 Para validar su identidad, por favor inicie sesión ingresando al siguiente enlace:\n\n${link}`);
        }
    } else {
        // CASE C: User Does NOT Exist -> Profile Menu
        user.dni = dniInput;
        user.whatsapp_step = 'WAITING_SELECTION';
        await user.save();
        await sendWhatsAppMessage(from, `👤 No te encontramos registrado con ese DNI.\n\nPor favor, selecciona tu perfil:\n\n1️⃣ Personal Militar\n2️⃣ Agente Civil\n3️⃣ Entidad Externa\n4️⃣ Usuario No Registrado`);
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

    // 1. Check if it's a number selection
    const topic = topicMap[messageBody.trim()];

    if (topic) {
        // ... Standard Flow ...
        user.whatsapp_topic = topic;
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        await user.save();
        await sendWhatsAppMessage(from, `📂 Tema seleccionado: *${topic}*.\n\n⚠️ *Importante*: Al solicitar información detallada, usted consiente el uso de sus datos. Lea nuestro aviso legal aquí:\n🔗 ${LEGAL_LINK}\n\n📝 *Por favor, describa detalladamente su consulta ahora:*`);
    } else {
        // 2. RAG + Smart Categorization (Zero-Shot)

        // Sanity Check: Don't create tickets for very short messages that aren't navigation
        if (messageBody.trim().length < 5) {
            await sendWhatsAppMessage(from, `⚠️ Por favor, describa su problema con más detalle (mínimo 5 letras) para poder ayudarle.`);
            return;
        }

        await sendWhatsAppMessage(from, `🧠 Analizando su consulta...`);
        // ... rest of logic

        // A. Try RAG (Knowledge Base)
        const ragResult = await searchKnowledge(messageBody);

        if (ragResult) {
            // Found a hit in the manual!
            await sendWhatsAppMessage(from, `💡 *Encontré información que podría ayudarle:*\n\n${ragResult.content}\n\n---\n❓ *¿Esto resuleve su problema?*\nResponda *SI* para finalizar.\nResponda *NO* para crear un ticket human.`);

            // Temporary state to wait for RAG confirmation
            user.whatsapp_step = 'WAITING_RAG_CONFIRMATION';
            user.whatsapp_temp_role = ragResult.id; // Store context
            await user.save();
            return;
        }

        // B. Fallback to Ticket Creation (If no RAG match)
        const predictedQueue = await predictQueue(messageBody);

        user.whatsapp_topic = `IA_AUTO: ${predictedQueue}`;
        await user.save();

        // Create ticket immediately
        await handleTicketCreation(user, messageBody, from, predictedQueue);
    }
};

const handleRAGConfirmation = async (user, cleanMsg, from) => {
    if (['si', 's', 'sí', 'gracias', 'ok', 'resuelto'].some(w => cleanMsg.startsWith(w))) {
        await sendWhatsAppMessage(from, `🌟 ¡Excelente! Nos alegra haber podido ayudar.\n\nSi necesita algo más, escriba *Menu*.`);
        user.whatsapp_step = 'ACTIVE_SESSION'; // Or reset to DNI? Active Session lets them chat again which might trigger ticket.
        // Better: Reset to DNI or just Null state that requires 'Menu'
        user.whatsapp_step = 'WAITING_TOPIC'; // Send back to Asking Topic state but waiting for input
        await user.save();
    } else {
        // User said NO, so create ticket
        const predictedQueue = await predictQueue("Consulta general sobre " + user.name);
        user.whatsapp_topic = `IA_AUTO: ${predictedQueue}`;
        await user.save();
        await sendWhatsAppMessage(from, `Entendido, derivando a un operador...`);
        await handleTicketCreation(user, "Consulta derivada de IA (RAG Failed)", from, predictedQueue);
    }
}

const handleTicketCreation = async (user, messageBody, from, queue = null) => {
    // Priority based on User Type (Smart Assignment)
    const priority = calculatePriority(user);

    const dTicket = await Ticket.create({
        title: `Consulta WhatsApp ${user.whatsapp_topic ? `[${user.whatsapp_topic}]` : ''} (${user.whatsapp_temp_role || 'User'})`,
        description: messageBody,
        priority: priority,
        status: 'PENDIENTE_VALIDACION',
        category: 'OTHER',
        cola_atencion: queue, // Smart Routing from AI
        created_by_user_id: user.id,
        channel: 'WHATSAPP',
        dni_solicitante: user.dni || 'No provisto',
        last_user_message_at: new Date()
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

    // Email Notification
    if (user.email) {
        sendTicketCreated(user, dTicket).catch(err => console.error('Email Error:', err));
    }

    await sendWhatsAppMessage(from, `✅ Ticket #${dTicket.id} creado exitosamente.\n\nEn breve nos estaremos comunicando con usted. Si desea, puede agregar más detalles escribiendo aquí mismo.`);
};

const handleProfileSelection = async (user, messageBody, from) => {
    const selection = messageBody.trim();

    if (['1', '2'].includes(selection)) {
        user.whatsapp_temp_role = selection === '1' ? 'MILITAR_NO_VERIFICADO' : 'CIVIL_NO_VERIFICADO';
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        await sendWhatsAppMessage(from, `⚠️ *Usuario No Verificado*\n\nPara figurar en el sistema, contacte al Encargado de Informática.\n\n🔗 *Aviso Legal*: ${LEGAL_LINK}\n\n📝 *Por favor, detalle su consulta para ser atendido como invitado:*`);

    } else if (['3', '4'].includes(selection)) {
        const roles = { '3': 'ENTIDAD', '4': 'NO_REGISTRADO' };
        user.whatsapp_temp_role = roles[selection];
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        await sendWhatsAppMessage(from, `✅ Perfil registrado.\n\n🔗 *Aviso Legal*: ${LEGAL_LINK}\n\n📝 *Por favor, detalle su consulta a continuación:*`);

    } else {
        await sendWhatsAppMessage(from, `❌ Opción no válida. Responda 1, 2, 3 o 4.`);
    }
    await user.save();
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
    // Find Open Ticket
    let ticket = await Ticket.findOne({
        where: {
            created_by_user_id: user.id,
            status: ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RECHAZADO', 'PENDIENTE_VALIDACION']
        },
        order: [['createdAt', 'DESC']]
    });

    if (ticket) {
        await Message.create({
            ticket_id: ticket.id,
            sender_type: 'USER',
            sender_id: user.id,
            content: messageBody,
        });

        // Update SLA User Timestamp
        ticket.last_user_message_at = new Date();
        await ticket.save();

        if (['WAITING_USER', 'RECHAZADO'].includes(ticket.status)) {
            ticket.status = 'PENDIENTE_VALIDACION';
            await ticket.save();
            await sendWhatsAppMessage(from, `✅ Información recibida. Su caso ha sido enviado nuevamente a validación.`);
        } else {
            // Acknowledge receipt for normal thread
            await sendWhatsAppMessage(from, `📝 Mensaje agregado al Ticket #${ticket.id}`);
        }
        console.log(`✅ Appended to Ticket #${ticket.id}`);
    } else {
        // If message is media, just warn them we need a ticket first
        if (messageBody.startsWith('[') && messageBody.endsWith(']')) {
            await sendWhatsAppMessage(from, `📸 Recibí su archivo, pero no tiene un ticket abierto para adjuntarlo.\n\nInicie una consulta primero.`);
        }
        user.whatsapp_step = 'WAITING_TOPIC';
        await user.save();
        await sendWhatsAppMessage(from, `❌ No entendí su mensaje o no tiene un ticket abierto.\n\nPor favor, seleccione una opción del menú para iniciar una nueva consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *O escriba su consulta y la tendremos en cuenta.*`);
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
