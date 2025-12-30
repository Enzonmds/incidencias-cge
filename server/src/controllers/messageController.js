import { Ticket, Message, User } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

export const addMessageToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const senderId = req.user.id; // From Auth Middleware

        const ticket = await Ticket.findByPk(id, { include: ['creator'] });
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Create Message
        const message = await Message.create({
            ticket_id: id,
            sender_type: 'AGENT',
            sender_id: senderId,
            content
        });

        // Notify User via WhatsApp if ticket was created by a user with phone
        if (ticket.creator && ticket.creator.phone) {
            await sendWhatsAppMessage(ticket.creator.phone, `[Incidencia #${id}] Respuesta: ${content}`);
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Add Message Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
