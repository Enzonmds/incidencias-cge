import { Ticket, User, Message } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

export const createTicket = async (req, res) => {
    try {
        const { title, description, priority, category, created_by_user_id, dni_solicitante, telefono_contacto } = req.body;

        // Strict Validation for Users
        if (req.user?.role === 'USER') { // Implicit check, assuming middleware populates req.user
            if (!dni_solicitante || !telefono_contacto) {
                return res.status(400).json({ message: 'DNI y Teléfono son obligatorios.' });
            }
        }

        const ticket = await Ticket.create({
            title,
            description,
            priority: priority || 'MEDIUM',
            category: category || 'OTHER', // Default, AH updates this
            dni_solicitante,
            telefono_contacto,
            created_by_user_id: created_by_user_id || req.user?.id,
            status: 'PENDIENTE_VALIDACION'
        });

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTickets = async (req, res) => {
    try {
        const { status, assigned_agent_id, cola_atencion } = req.query;
        const where = {};
        if (status) where.status = status;
        if (assigned_agent_id) where.assigned_agent_id = assigned_agent_id;
        if (cola_atencion) where.cola_atencion = cola_atencion;

        const tickets = await Ticket.findAll({
            where,
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email', 'phone'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Message, as: 'messages' }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json(tickets);
    } catch (error) {
        console.error('Get Tickets Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTicketById = async (req, res) => {
    try {
        const { id } = req.params;
        const ticket = await Ticket.findByPk(id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                { model: Message, as: 'messages', include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }] }
            ],
            order: [
                [{ model: Message, as: 'messages' }, 'createdAt', 'ASC']
            ]
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        res.json(ticket);
    } catch (error) {
        console.error('Get Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const updateTicket = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, priority, assigned_agent_id, category, cola_atencion } = req.body;

        const ticket = await Ticket.findByPk(id, {
            include: [{ model: User, as: 'creator' }]
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // Enforce Departmental Isolation for Agents
        if (req.user.role === 'TECHNICAL_SUPPORT' && assigned_agent_id) {
            if (ticket.cola_atencion !== req.user.department) {
                return res.status(403).json({ message: `No tienes permisos para tickets de ${ticket.cola_atencion}` });
            }
        }

        // Detect Assignment Change
        const previousAgentId = ticket.assigned_agent_id;

        if (status === 'RECHAZADO' && !req.body.rejectionReason) {
            return res.status(400).json({ message: 'Debe proporcionar un motivo de rechazo/observación.' });
        }

        if (status) ticket.status = status;
        if (priority) ticket.priority = priority;
        if (category) ticket.category = category;
        if (cola_atencion) ticket.cola_atencion = cola_atencion;
        if (assigned_agent_id) ticket.assigned_agent_id = assigned_agent_id;

        await ticket.save();

        // Notification Logic: If Agent Assigned (and changed)
        // Notification Logic: If Agent Assigned (and changed)
        if (assigned_agent_id && assigned_agent_id !== previousAgentId) {
            try {
                const agent = await User.findByPk(assigned_agent_id);
                if (agent && ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                    await sendWhatsAppMessage(ticket.creator.phone, `👋 Hola, soy ${agent.name} del soporte técnico. He tomado su consulta #${ticket.id}. En breve le escribiré por este medio.`);
                }
            } catch (notifyError) {
                console.error('Error notifying user of assignment:', notifyError);
            }
        }

        // Notification Logic: If Rejected (Observed)
        if (status === 'RECHAZADO' && req.body.rejectionReason) {
            try {
                const agent = req.user; // Authenticated user performing the action
                if (ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                    await sendWhatsAppMessage(
                        ticket.creator.phone,
                        `⚠️ *Solicitud Observada*\n\nHola, el agente ${agent.name} solicita más datos para avanzar con su ticket #${ticket.id}.\n\n📝 *Motivo*: ${req.body.rejectionReason}\n\n👉 *Por favor, responda a este mensaje con la información solicitada para reabrir el caso.*`
                    );
                }

                // Add System/Agent Message to Ticket History
                await Message.create({
                    ticket_id: ticket.id,
                    sender_type: 'AGENT',
                    sender_id: agent.id,
                    content: `[RECHAZO/OBSERVACIÓN]: ${req.body.rejectionReason}`
                });

            } catch (notifyError) {
                console.error('Error notifying user of rejection:', notifyError);
            }
        }

        // Notification Logic: If Resolved by Tech (Request Confirmation)
        if (status === 'RESUELTO_TECNICO') {
            try {
                const agent = req.user;
                if (ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                    await sendWhatsAppMessage(
                        ticket.creator.phone,
                        `✅ *Caso Resuelto*\n\nHola, el agente ${agent.name} ha marcado su ticket #${ticket.id} como resuelto.\n\n¿Está conforme con la solución?\n\nResponda *SI* para cerrar el caso y calificar la atención.\nResponda *NO* si aún tiene dudas.`
                    );
                }
            } catch (notifyError) {
                console.error('Error notifying user of resolution:', notifyError);
            }
        }

        res.json(ticket);
    } catch (error) {
        console.error('Update Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
