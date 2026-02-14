import cron from 'node-cron';
import { Op } from 'sequelize';
import { Ticket, User, Message } from '../models/index.js';
import { sendWhatsAppMessage } from './whatsappService.js';

// Schedule: Run every 10 minutes
// Cron expression: */10 * * * *
export const initCronJobs = () => {
    console.log('🕒 Initializing Cron Jobs...');

    cron.schedule('*/10 * * * *', async () => {
        try {
            console.log('🔄 Running Cron: Check 23h WhatsApp Session Limit...');
            await checkAndCloseExpiredTickets();
        } catch (error) {
            console.error('❌ Cron Job Error:', error);
        }
    });
};

export const checkAndCloseExpiredTickets = async () => {
    console.log('🔍 Executing checkAndCloseExpiredTickets [VERSION 2 - NO CHANNEL FILTER]');
    // Threshold: 23 hours ago
    const thresholdDate = new Date(Date.now() - 23 * 60 * 60 * 1000);

    // Find Open/In-Progress Tickets where the last USER message was before threshold
    // effectively meaning the session is about to expire or expired.
    // We want to close them BEFORE the 24h limit to send a final free message.

    // Strategy:
    // 1. Get candidate tickets (Status NOT closed)
    // 2. For each, check last user message time.
    // 3. If last_user_msg < 23h ago (meaning > 23h has passed), Close & Notify.

    const activeTickets = await Ticket.findAll({
        where: {
            status: {
                [Op.notIn]: ['CERRADO', 'CERRADO_TIMEOUT', 'RESOLVED', 'RECHAZADO', 'RESUELTO_TECNICO']
            }
        },
        include: [
            {
                model: User,
                as: 'creator',
                where: {
                    phone: { [Op.ne]: null } // Only process tickets from users with a phone (WhatsApp)
                }
            }
        ]
    });

    for (const ticket of activeTickets) {
        // Find last message from USER for this ticket
        const lastUserMsg = await Message.findOne({
            where: {
                ticket_id: ticket.id,
                sender_type: 'USER'
            },
            order: [['createdAt', 'DESC']]
        });

        if (lastUserMsg && lastUserMsg.createdAt < thresholdDate) {
            console.log(`⚠️ Ticket #${ticket.id} expired. Last User Msg: ${lastUserMsg.createdAt}`);

            // Close Ticket
            ticket.status = 'CERRADO_TIMEOUT';
            await ticket.save();

            // Notify User (Final Free Message)
            if (ticket.creator && ticket.creator.phone) {
                await sendWhatsAppMessage(ticket.creator.phone,
                    `⏳ *Cierre por Protocolo de Seguridad*\n\nSu ticket ha sido cerrado automáticamente al cumplirse el límite de 24hs de sesión activa sin resolución final.\n\n📅 *Nuestros Horarios:* Lunes a Viernes de 08:00 a 14:00hs.\n\nSi su problema persiste, por favor responda a este mensaje para abrir un nuevo caso.`
                );
            }
        }
    }
};
