
import { Message, Ticket, User } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

export const addMessageToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { content, is_internal } = req.body;
        const userId = req.user.id;

        const ticket = await Ticket.findByPk(id, {
            include: [{ model: User, as: 'creator' }]
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Enforce Assignment for Agents
        if (req.user.role !== 'USER' && !ticket.assigned_agent_id) {
            return res.status(403).json({ message: 'Debe asignarse el ticket antes de poder responder.' });
        }

        const message = await Message.create({
            ticket_id: id,
            sender_type: req.user.role === 'USER' ? 'USER' : 'AGENT',
            sender_id: userId,
            content,
            is_internal: is_internal || false
        });

        // --- WhatsApp Outgoing Logic ---
        // If message is from Agent AND ticket is WhatsApp -> Reply to User
        if (req.user.role !== 'USER') {
            // SLA: Update Agent Response Timestamp
            ticket.last_agent_response_at = new Date();
            await ticket.save();

            // SECURITY FIX: Do NOT send WhatsApp if it is an Internal Note
            if (!is_internal && ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                await sendWhatsAppMessage(ticket.creator.phone, content);
            } else if (is_internal) {
                console.log('🔒 Internal Note saved. WhatsApp notification blocked.');
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Add Message Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
