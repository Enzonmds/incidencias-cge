import nodemailer from 'nodemailer';

// Configure Transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: process.env.SMTP_PORT || 587,
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'ethereal_user',
        pass: process.env.SMTP_PASS || 'ethereal_pass',
    },
    tls: {
        rejectUnauthorized: false // Allow self-signed certificates (Fix for CGE server)
    }
});

// Verify connection configuration
transporter.verify(function (error, success) {
    if (error) {
        console.log('❌ SMTP Error:', error);
    } else {
        console.log('✅ SMTP Server is ready to take our messages');
    }
});

const sendEmail = async ({ to, subject, html }) => {
    try {
        if (!to || !to.includes('@')) {
            console.log(`⚠️ Email skipped. Invalid recipient: ${to}`);
            return;
        }

        let recipients = to;

        // SAFE MODE: Redirect all emails to config user to avoid 550 Errors in Dev/Test
        if (process.env.SAFE_EMAIL_REDIRECT === 'true') {
            const debugRecipient = process.env.SMTP_USER;
            console.log(`🛡️ SAFE MODE: Redirecting email for [${to}] to [${debugRecipient}]`);
            subject = `[REDIRECTED from ${to}] ${subject}`;
            recipients = debugRecipient;
        }

        const info = await transporter.sendMail({
            from: `"CONSULTAS CGE" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@cge.mil.ar'}>`,
            to: recipients,
            subject,
            html,
        });

        console.log(`📧 Email sent: ${info.messageId} to ${recipients}`);
        // Preview only available when sending through an Ethereal account
        if (nodemailer.getTestMessageUrl(info)) {
            console.log('🔗 Preview URL: ' + nodemailer.getTestMessageUrl(info));
        }
    } catch (error) {
        // Suppress noisy 550 errors (User unknown) but log them concisely
        if (error.responseCode === 550) {
            console.error(`❌ SMTP Error 550: Recipient [${to}] rejected by server. (User unknown)`);
        } else {
            console.error('❌ Error sending email:', error.message);
        }
    }
};

export const sendTicketCreated = async (user, ticket) => {
    const subject = `[TEST] [CGE] Ticket #${ticket.id} Creado - ${ticket.title}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #004d99;">Hola ${user.name},</h2>
            <p>Tu ticket ha sido creado exitosamente.</p>
            <hr>
            <p><strong>ID:</strong> #${ticket.id}</p>
            <p><strong>Título:</strong> ${ticket.title}</p>
            <p><strong>Prioridad:</strong> ${ticket.priority}</p>
            <p><strong>Estado:</strong> ${ticket.status}</p>
            <hr>
            <p>Un agente revisará tu caso a la brevedad.</p>
            <p style="font-size: 12px; color: #888;">Este es un mensaje automático, por favor no responder.<br>
            <strong>División Sistemas Informáticos - CGE</strong></p>
        </div>
    `;
    await sendEmail({ to: user.email, subject, html });
};

export const sendTicketAssigned = async (agent, ticket) => {
    const subject = `[TEST] [CGE] Nuevo Ticket Asignado #${ticket.id}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #004d99;">Hola ${agent.name},</h2>
            <p>Se te ha asignado un nuevo ticket.</p>
            <hr>
            <p><strong>ID:</strong> #${ticket.id}</p>
            <p><strong>Título:</strong> ${ticket.title}</p>
            <p><strong>Prioridad:</strong> ${ticket.priority}</p>
            <p><a href="${process.env.FRONTEND_URL}/tickets/${ticket.id}">Ver Ticket</a></p>
            <hr>
            <p style="font-size: 12px; color: #888;"><strong>División Sistemas Informáticos - CGE</strong></p>
        </div>
    `;
    await sendEmail({ to: agent.email, subject, html });
};

export const sendTicketResolved = async (user, ticket) => {
    const subject = `[TEST] [CGE] Ticket #${ticket.id} Resuelto`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #004d99;">Hola ${user.name},</h2>
            <p>Tu ticket ha sido marcado como <strong>RESUELTO</strong>.</p>
            <hr>
            <p>Si la solución no es satisfactoria, por favor responde a este correo o contacta soporte.</p>
            <p>Gracias por usar el sistema de consultas CGE.</p>
            <p style="font-size: 12px; color: #888;"><strong>División Sistemas Informáticos - CGE</strong></p>
        </div>
    `;
    await sendEmail({ to: user.email, subject, html });
};

export const sendSLABreachNotification = async (ticket, type, stage) => {
    // Type: 'UNASSIGNED' or 'NO_RESPONSE'
    // Stage: 1 (Warning -> Mesa), 2 (Breach -> Subdirector)

    const MESA_EMAIL = process.env.MESA_EMAIL || 'mesa@cge.mil.ar'; // Placeholder
    const SUBDIRECTOR_EMAIL = process.env.SUBDIRECTOR_EMAIL || 'subdirector@cge.mil.ar'; // Placeholder

    let to = MESA_EMAIL;
    let cc = '';
    let subjectPrefix = '⚠️ [ALERTA SLA]';
    let recipientName = 'Coordinación (Mesa de Entradas)';

    if (stage === 2) {
        to = SUBDIRECTOR_EMAIL;
        cc = MESA_EMAIL;
        subjectPrefix = '🚨 [SLA BREACH - ESCALAMIENTO]';
        recipientName = 'Sr. Subdirector';
    }

    const subject = `${subjectPrefix} Ticket #${ticket.id} - ${type}`;

    let issueDescription = '';
    if (type === 'UNASSIGNED') {
        issueDescription = `El ticket lleva más de ${stage === 1 ? '5' : '10'} minutos sin ser asignado.`;
    } else if (type === 'NO_RESPONSE') {
        issueDescription = `El agente asignado (${ticket.assignee?.name || 'Desconocido'}) ha demorado más de ${stage === 1 ? '10' : '20'} minutos en responder.`;
    }

    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; border: 2px solid ${stage === 2 ? 'red' : 'orange'};">
            <h2 style="color: ${stage === 2 ? 'red' : 'orange'};">${subjectPrefix}</h2>
            <p>Hola ${recipientName},</p>
            <p>Se ha detectado un incumplimiento de los niveles de servicio:</p>
            <ul>
                <li><strong>Ticket:</strong> #${ticket.id}</li>
                <li><strong>Problema:</strong> ${issueDescription}</li>
                <li><strong>Solicitante:</strong> ${ticket.creator?.name || 'N/A'}</li>
                <li><strong>Responsable:</strong> ${ticket.assignee?.name || 'Nadie'}</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL}/tickets/${ticket.id}">Ver Ticket</a></p>
            <hr>
            <p style="font-size: 12px; color: #888;"><strong>Monitor de SLA - Ticketera CGE</strong></p>
        </div>
    `;

    await sendEmail({ to, subject, html }); // Nodemailer handles CC if added to 'to' string or via specific cc field.
    // For simplicity in this helper, I'll just append CC to 'to' if needed or use a robust object if I refactor sendEmail.
    // Given existing sendEmail takes {to, subject, html}, I will strictly stick to 'to'.
    // If I really want CC I should update sendEmail, but for now sending to both as specific calls or comma separated.
    // Let's use comma separated for 'to'.
    if (cc) to += `, ${cc}`;
    await sendEmail({ to, subject, html });
};
