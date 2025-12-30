import { Ticket, User, Message } from '../models/index.js';

export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const { From, Body } = req.body; // Standard Twilio parameters
        // 'From' format: 'whatsapp:+56912345678'

        const phoneNumber = From.replace('whatsapp:', '');
        const messageContent = Body;

        console.log(`📩 WhatsApp received from ${phoneNumber}: ${messageContent}`);

        // 1. Find User by Phone
        let user = await User.findOne({ where: { phone: phoneNumber } });

        // If user doesn't exist, we could create a temp one or ignore. 
        // For MVP, if not registered, we treat as Guest (or auto-register if desired)
        // Here we'll assume we only support registered users or create a basic one.
        if (!user) {
            // Auto-register guest for demo purposes
            user = await User.create({
                name: 'Usuario WhatsApp',
                email: `guest_${phoneNumber}@cge.mil.ar`,
                password_hash: 'guest123', // Dummy
                role: 'USER',
                phone: phoneNumber
            });
        }

        // 2. Find Open Ticket for User
        let ticket = await Ticket.findOne({
            where: {
                created_by_user_id: user.id,
                status: ['OPEN', 'IN_PROGRESS', 'WAITING_USER']
            },
            order: [['createdAt', 'DESC']]
        });

        if (ticket) {
            // Append to existing conversation
            await Message.create({
                ticket_id: ticket.id,
                sender_type: 'USER',
                sender_id: user.id,
                content: messageContent,
            });

            // If ticket was waiting for user, move back to In Progress
            if (ticket.status === 'WAITING_USER') {
                ticket.status = 'IN_PROGRESS';
                await ticket.save();
            }

            console.log(`✅ Message added to Ticket #${ticket.id}`);
            // Here we would reply back (via Twilio API) acknowledging receipt if desired
        } else {
            // Create New Ticket
            ticket = await Ticket.create({
                title: 'Nuevo Reclamo via WhatsApp',
                description: messageContent, // First message is description
                priority: 'MEDIUM',
                status: 'OPEN',
                created_by_user_id: user.id
            });

            await Message.create({
                ticket_id: ticket.id,
                sender_type: 'USER',
                sender_id: user.id,
                content: messageContent,
            });

            console.log(`🆕 Ticket #${ticket.id} created from WhatsApp`);

            // Mock Reply (in real world, call Twilio Client)
            // sendTwilioMessage(phoneNumber, 'Ticket creado #${ticket.id}');
        }

        // Always respond 200 OK to Twilio
        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('Webhook Error:', error);
        res.status(500).send('Error');
    }
};
