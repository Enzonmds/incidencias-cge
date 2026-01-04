
import { Message, Ticket, User } from '../models/index.js';
import axios from 'axios';

export const addMessageToTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        const ticket = await Ticket.findByPk(id, {
            include: [{ model: User, as: 'creator' }]
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        const message = await Message.create({
            ticket_id: id,
            sender_type: req.user.role === 'USER' ? 'USER' : 'AGENT',
            sender_id: userId,
            content
        });

        // --- WhatsApp Outgoing Logic ---
        // If message is from Agent AND ticket is WhatsApp -> Reply to User
        if (req.user.role !== 'USER' && ticket.channel === 'WHATSAPP') {
            let userPhone = ticket.creator?.phone;
            if (userPhone) {
                // FIX: Meta Sandbox for Argentina sometimes requires '54 11 15...' instead of '54 9 11...'
                // If we see '54911' (Mobile Buenos Aires), change to '541115'
                if (userPhone.startsWith('54911')) {
                    userPhone = userPhone.replace('54911', '541115');
                }

                try {
                    console.log(`📤 Sending WhatsApp reply to ${userPhone}`);
                    await axios.post(
                        `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
                        {
                            messaging_product: 'whatsapp',
                            to: userPhone,
                            text: { body: `[Ticket #${ticket.id}] Agente: ${content}` },
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );
                } catch (waError) {
                    console.error('WhatsApp Send Error:', waError?.response?.data || waError.message);
                }
            }
        }

        res.status(201).json(message);
    } catch (error) {
        console.error('Add Message Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
