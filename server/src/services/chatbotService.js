
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

        // --- BUSINESS HOURS CHECK (Cost Containment) ---
        // Mon-Fri, 08:00 - 18:00 (Argentina Time)
        const now = new Date();
        const argentinaTime = new Date(now.toLocaleString("en-US", { timeZone: "America/Argentina/Buenos_Aires" }));
        const day = argentinaTime.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const hour = argentinaTime.getHours();

        // Check if Weekend (0 or 6) OR Outside 08-18
        if (day === 0 || day === 6 || hour < 8 || hour >= 18) {
            // Only send warning ONCE per session or if it's a new interaction
            // For now, we send it if we are in initial states or if 24h passed (which we shouldn't be here if closed, but logic applies)
            // User requested: "Responde INMEDIATAMENTE". To avoid spamming on every msg in a rapid flow, maybe we check if we already sent it recently?
            // For strict compliance with the request: Send it.
            // But to avoid "Double Hello", we might want to check context.
            // Let's attach it.

            console.log(`🌙 Message received out of hours (${day} @ ${hour}hs). Sending OOO warning.`);
            await sendWhatsAppMessage(from, `🌙 *Horario Fuera de Servicio*\n\nHemos recibido su consulta, pero nuestro equipo opera de Lunes a Viernes de 08:00 a 18:00hs.\nSu solicitud ha quedado en cola y será procesada a primera hora del próximo día hábil.`);
        }

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

                // NEW: Context Buffer Logic
                // If input is NOT a DNI (digits), treat it as context and save it.
                if (!cleanMsg.match(/^\d+$/)) {
                    console.log(`📝 Buffering Context for ${from}: "${cleanMsg}"`);
                    // FIX 1: Concatenate Buffer
                    user.whatsapp_buffer = user.whatsapp_buffer
                        ? user.whatsapp_buffer + '. ' + messageBody
                        : messageBody;

                    // Ensure we are in WAITING_DNI mode
                    user.whatsapp_step = 'WAITING_DNI';
                    await user.save();
                    await sendWhatsAppMessage(from, `ℹ️ He guardado tu mensaje inicial.\n\nPara poder abrir el ticket y procesarlo, primero necesito validar tu identidad.\n\n👉 *Por favor, ingresa tu DNI (sin puntos):*`);
                    return;
                }

                return await handleDniInput(user, messageBody, from);

            case 'WAITING_EMAIL':
                return await handleEmailInput(user, messageBody, from);

            // case 'WAITING_TOPIC':  <-- DEPRECATED (Auto-Classification)
            // case 'WAITING_MENU_SELECTION': <-- DEPRECATED

            case 'WAITING_DESCRIPTION':
                // Auto-Classify Description
                const predictedCategory = await predictQueue(messageBody);
                return await handleTicketCreation(user, messageBody, from, predictedCategory);

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
    const dniInput = messageBody.trim();
    const existingUser = await User.findOne({ where: { dni: dniInput } });

    if (existingUser) {
        if (existingUser.phone && existingUser.phone === from) {
            // CASE A: DNI & Phone Match -> Auto Verify
            user.role = existingUser.role || 'USER';
            user.name = existingUser.name;
            await user.save();

            // --- AUTO-CLASSIFICATION BYPASS ---
            if (user.whatsapp_buffer && user.whatsapp_buffer.length > 5) {
                // User already sent their problem in buffer
                await sendWhatsAppMessage(from, `👋 Hola ${existingUser.name}. He recibido tu mensaje: "${user.whatsapp_buffer.substring(0, 30)}..."\n\n🧠 Procesando y creando ticket automáticamente...`);

                let predictedCategory = 'Soporte General';
                try {
                    predictedCategory = await predictQueue(user.whatsapp_buffer);
                } catch (error) {
                    console.error('⚠️ AI/Network Error during prediction. Defaulting to General.', error.message);
                }

                // Call creation directly passing buffer as "messageBody" and the category
                // IMPORTANT: We use the buffer as the description
                // The buffer is cleared INSIDE handleTicketCreation immediately.
                return await handleTicketCreation(user, user.whatsapp_buffer, from, predictedCategory);
            }

            // If no buffer, ask for description
            user.whatsapp_step = 'WAITING_DESCRIPTION';
            await user.save();
            await sendWhatsAppMessage(from, `👋 Hola ${existingUser.name}, bienvenido nuevamente.\n\n📝 *Por favor, describa su inconveniente (Texto o Audio) para poder ayudarle:*`);

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
        user.whatsapp_step = 'WAITING_DESCRIPTION'; // Proceed to Description (Auto Classify)
        await user.save();

        await sendWhatsAppMessage(from, `✅ Perfil configurado correctamente.\n\n📝 *Por favor, describa su inconveniente (Texto o Audio) para poder ayudarle:*`);

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
        // IVR: Intercept flow. Instead of asking for description, ask specific triage questions or offer solutions.
        // For MVP: Simple Menu.
        user.whatsapp_step = 'WAITING_MENU_SELECTION';
        await user.save();

        await sendWhatsAppMessage(from, `📂 Tema: ${topic}\n\nAntes de continuar, ayúdanos a clasificar el problema:\n\n1️⃣ No tengo internet / Sistema lento\n2️⃣ Problema de Impresora\n3️⃣ Error de Usuario / Clave\n4️⃣ Otro / Consulta General`);
    } else {
        // If it's not a valid topic number, check if it's a description for RAG or AI prediction
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

const handleIVRSelection = async (user, messageBody, from) => {
    const selection = messageBody.trim();

    // 1. Internet -> Template
    if (selection === '1') {
        await sendWhatsAppMessage(from, `🌐 *Solución Rápida: Internet*\n\nPor favor intente:\n1. Reiniciar su modem.\n2. Verificar si el cable de red está conectado.\n\n¿Se solucionó?\n\nResponda *SI* para finalizar.\nResponda *NO* para crear el ticket.`);
        user.whatsapp_step = 'WAITING_RAG_CONFIRMATION'; // Reusing confirmation logic logic
        user.whatsapp_temp_role = 'IVR_SOLVED'; // Marker
        await user.save();
        return;
    }

    // 2. Printer -> Template
    if (selection === '2') {
        await sendWhatsAppMessage(from, `🖨️ *Solución Rápida: Impresora*\n\n1. Verifique que tenga papel y toner.\n2. Apague y prenda el equipo.\n\n¿Se solucionó?\n\nResponda *SI* para finalizar.\nResponda *NO* para crear ticket.`);
        user.whatsapp_step = 'WAITING_RAG_CONFIRMATION';
        user.whatsapp_temp_role = 'IVR_SOLVED';
        await user.save();
        return;
    }

    // 3. User/Pass -> Template
    if (selection === '3') {
        await sendWhatsAppMessage(from, `🔐 *Gestión de Usuarios*\n\nPara blanqueo de clave, ingrese a: https://autogestion.cge.mil.ar\n\n¿Ayudó esto?\n\nResponda *SI* para finalizar.\nResponda *NO* para crear ticket.`);
        user.whatsapp_step = 'WAITING_RAG_CONFIRMATION';
        user.whatsapp_temp_role = 'IVR_SOLVED';
        await user.save();
        return;
    }

    // 4. Other -> Create Ticket
    if (selection === '4') {
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        await user.save();
        await sendWhatsAppMessage(from, `📝 Entendido. Por favor describa su inconveniente detalladamente a continuación:`);
        return;
    }

    await sendWhatsAppMessage(from, `❌ Opción no válida. Por favor, seleccione una de las opciones (1, 2, 3 o 4).`);
};

const handleTicketCreation = async (user, messageBody, from, predictedQueue = null, linkedTicketId = null) => {
    try {
        let description = messageBody;
        const shortTitle = description.substring(0, 50) + (description.length > 50 ? '...' : '');

        // Auto-Classification: Use Prediction or Default
        const aiCategory = predictedQueue || 'Soporte General';

        // FIX: User requested manual triage. AI Prediction should NOT set the category directly
        // because it implies the ticket skipped coordination.
        // We set category to 'Sin Clasificar' and append AI suggestion to description.
        const finalCategory = 'Sin Clasificar';

        // Append AI Prediction to Description for Coordinator visibility
        description = `${description}\n\n[IA Sugerencia: ${aiCategory}]`;

        // --- Automation: Urgent Trigger ---
        let priority = 'MEDIUM';
        let impact = 'LOW';
        let urgency = 'LOW';

        if (description.toLowerCase().includes('urgente')) {
            priority = 'CRITICAL'; // Force Critical/High
            impact = 'HIGH';
            urgency = 'HIGH';
            console.log('🚨 URGENT TICKET DETECTED');
        } else {
            priority = calculatePriority(user);
        }

        // --- CONTEXT BUFFER MERGE ---
        // Just in case it wasn't cleared yet (though standard flow clears it before calling this technically,
        // but if called from Description state, buffer might be empty.
        // If called from DNI Bypass, we already passed buffer as description, so we should clear it.)
        if (user.whatsapp_buffer) {
            // If we are here, it means we probably used the buffer as the description already in the call
            // OR we are appending extra context.
            // To be safe and avoid duplication if we passed buffer as messageBody:
            if (user.whatsapp_buffer !== description.split('\n\n')[0]) { // Check against original part
                // Append only if different
                // description = `${description}\n\n[CONTEXTO ORIGINAL]: ${user.whatsapp_buffer}`;
            }
            user.whatsapp_buffer = null;
            await user.save();
        }


        const ticket = await Ticket.create({
            title: `[WhatsApp] ${shortTitle}`, // Removed finalCategory from title to avoid confusion
            description: description,
            priority: priority,
            impact: impact,
            urgency: urgency,
            category: finalCategory, // Set to 'Sin Clasificar'
            cola_atencion: 'COORDINACION', // Manual Triage required
            created_by_user_id: user.id,
            dni_solicitante: user.dni,
            channel: 'WHATSAPP',
            status: 'PENDIENTE_VALIDACION'
        });

        // First Message
        await Message.create({
            ticket_id: ticket.id,
            sender_type: 'USER',
            sender_id: user.id,
            content: description
        });

        // Custom Notification for Linked/Bounced Tickets
        if (linkedTicketId) {
            await sendWhatsAppMessage(from, `🔗 *Continuación de Caso*\n\nHemos abierto un nuevo ticket (*#${ticket.id}*) para continuar con su consulta anterior (Ticket #${linkedTicketId}).\n\nUn agente revisará el historial y le responderá a la brevedad.`);
        } else {
            await sendWhatsAppMessage(from, `✅ *Ticket #${ticket.id} Creado*\n\nSu solicitud ha sido registrada correctamente.\n\nUn agente se pondrá en contacto con usted a la brevedad.`);
        }

        // Reset State
        user.whatsapp_step = 'ACTIVE_SESSION';
        user.whatsapp_topic = null;
        await user.save();

        // Send Email Notification
        if (user.email) {
            sendTicketCreated(user, ticket).catch(console.error);
        }

    } catch (error) {
        console.error('Error creating ticket via bot:', error);
        const fs = await import('fs');
        const path = await import('path');
        fs.appendFileSync(path.resolve('worker.log'), `[ERROR-CHATBOT] ${error.stack}\n`);
        await sendWhatsAppMessage(from, `❌ Hubo un error al crear el ticket. Por favor intente más tarde.`);
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

        // FIX 2: Hard Reset on Timeout
        user.whatsapp_step = 'WAITING_TOPIC';
        user.whatsapp_topic = null;
        await user.save();

        await sendWhatsAppMessage(from, `👋 Por favor, seleccione el área de su consulta:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *Puede también describir su inconveniente directamente.*`);
        return;
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
    if (['1', '2', '3'].includes(cleanMsg)) {
        if (cleanMsg === '1') {
            // Consultar Mis Tickets (Listar últimos)
            const tickets = await Ticket.findAll({
                where: { created_by_user_id: user.id },
                limit: 3,
                order: [['createdAt', 'DESC']]
            });
            let msg = "📂 *Sus últimos tickets:*\n";
            tickets.forEach(t => msg += `#${t.id} - ${t.status}\n`);
            await sendWhatsAppMessage(from, msg);
            return;
        }
        if (cleanMsg === '2') {
            // Crear Nueva Consulta (Forzar Salida del Ticket Actual)
            user.whatsapp_step = 'WAITING_TOPIC';
            user.whatsapp_topic = null;
            await user.save();
            await sendWhatsAppMessage(from, `🆕 *Nueva Consulta*\n\nPor favor, seleccione el tema:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos\n4️⃣ Datos Personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres`);
            return;
        }
        if (cleanMsg === '3') {
            // Ver Temas Frecuentes (Link a Knowledge Base)
            await sendWhatsAppMessage(from, `📚 Puede consultar nuestra base de conocimientos aquí:\n${FRONTEND_URL}/faq`);
            return;
        }
    }
    // --------------------------------------------------

    // 3. Find Open Ticket (Ahora sí, si no es una opción de menú, es chat)

    // ...
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
            // SILENT APPEND: Do not disturb the user with "Message added" notifications.
            // Just log it internally.
            // await sendWhatsAppMessage(from, `📝 Mensaje agregado al Ticket #${ticket.id}`); 
        }
        console.log(`✅ Appended to Ticket #${ticket.id}`);

    } else {
        // 4. No Ticket Found -> Smart Fallback

        // --- BOUNCE LOGIC (Reply to Closed Ticket) ---
        // Check if the user has a recent closed ticket they might be replying to
        const lastTicket = await Ticket.findOne({
            where: {
                created_by_user_id: user.id,
                status: ['CERRADO', 'CERRADO_TIMEOUT', 'RESUELTO_TECNICO', 'RESOLVED', 'CLOSED', 'BAJA', 'RECHAZADO']
            },
            order: [['createdAt', 'DESC']]
        });

        if (lastTicket) {
            console.log(`🔄 Bounce Detected! User replying to Closed Ticket #${lastTicket.id}`);

            // Construct Linked Description
            const linkedDescription = `🔗 **Continuación del caso anterior #${lastTicket.id}**\n\n${messageBody}`;

            // Predict Category based on new message
            const predictedCategory = await predictQueue(messageBody);

            // Create NEW Ticket linked to old one
            return await handleTicketCreation(user, linkedDescription, from, predictedCategory, lastTicket.id);
        }
        // ---------------------------------------------

        // If message is media, warn about ticket requirement
        if (messageBody.startsWith('[') && messageBody.endsWith(']')) {
            await sendWhatsAppMessage(from, `📸 Recibí su archivo, pero no tiene un ticket abierto para adjuntarlo.\n\nInicie una consulta primero.`);
            return;
        }

        // Instead of "I didn't understand", assume they want support
        // IF message is Audio (starts with 🎤) OR Long Text -> Create Ticket Directly
        const isAudio = messageBody.trim().startsWith('🎤 "'); // From Worker
        const isLongText = cleanMsg.length > 10 && !cleanMsg.match(/^\d+$/);

        if (isAudio || isLongText) {
            console.log(`🤖 Implicit Ticket Creation Triggered for ${from}`);
            await sendWhatsAppMessage(from, `⏳ He recibido tu mensaje. Estoy generando el ticket...`);

            // Predict Category
            const predictedCategory = await predictQueue(messageBody);

            // Create Ticket
            return await handleTicketCreation(user, messageBody, from, predictedCategory);
        }

        user.whatsapp_step = 'WAITING_TOPIC';
        await user.save();

        await sendWhatsAppMessage(from, `🤔 No tienes tickets abiertos en este momento.\n\nPara iniciar una nueva consulta, por favor elige un tema:\n\n1️⃣ Haberes\n2️⃣ Viaticos\n3️⃣ Casinos | Barrios Militares\n4️⃣ Datos personales\n5️⃣ Juicios\n6️⃣ Suplementos\n7️⃣ Alquileres\n\n📝 *También puedes enviar un AUDIO o escribir tu consulta directamente aquí.*`);
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
