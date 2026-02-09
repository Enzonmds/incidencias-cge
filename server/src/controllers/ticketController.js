import { Op } from 'sequelize';
import { Ticket, User, Message } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { sendTicketCreated, sendTicketAssigned, sendTicketResolved } from '../services/emailService.js';
import { calculatePriority, calculateMatrixPriority } from '../utils/priorityUtils.js';

export const createTicket = async (req, res) => {
    try {
        const { title, description, priority, category, created_by_user_id, dni_solicitante, telefono_contacto, impact, urgency } = req.body;

        // Strict Validation for Users
        if (req.user?.role === 'USER') {
            if (!dni_solicitante || !telefono_contacto) {
                return res.status(400).json({ message: 'DNI y Teléfono son obligatorios.' });
            }
        }

        // Calculate Priority
        let finalPriority = 'MEDIUM';
        if (impact && urgency) {
            // Matrix Priority (Admin/Agent specified)
            finalPriority = calculateMatrixPriority(impact, urgency);
        } else if (req.user.role === 'ADMIN' && priority) {
            // Admin Override
            finalPriority = priority;
        } else {
            // Auto-Calculate based on Role
            finalPriority = calculatePriority(req.user);
        }

        const ticket = await Ticket.create({
            title,
            description,
            priority: finalPriority,
            impact: impact || 'LOW',
            urgency: urgency || 'LOW',
            category: category || 'OTHER',
            dni_solicitante,
            telefono_contacto,
            created_by_user_id: created_by_user_id || req.user?.id,
            status: 'PENDIENTE_VALIDACION'
        });

        // Email Notification: Created
        if (req.user?.email) {
            sendTicketCreated(req.user, ticket).catch(err => console.error('Email Error:', err));
        }

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTickets = async (req, res) => {
    try {
        const { status, assigned_agent_id, queue, operational_view } = req.query;
        const whereClause = {};

        // Triage / Operational View Logic
        if (operational_view === 'true' && ['ADMIN', 'HUMAN_ATTENTION', 'SUBDIRECTOR'].includes(req.user.role)) {
            whereClause[Op.or] = [
                { status: 'PENDIENTE_VALIDACION' },
                { cola_atencion: 'COORDINACION' },
                { cola_atencion: 'OTHER' },
                { category: 'OTHER' },
                { priority: 'CRITICAL' }
            ];
        } else {
            // Role Based Filtering (Standard View)
            if (req.user.role === 'USER') {
                whereClause[Op.or] = [
                    { created_by_user_id: req.user.id },
                    { email: req.user.email },
                    { solicitante_email: req.user.email }
                ];
            } else if (req.user.role === 'TECHNICAL_SUPPORT') {
                const agentQueue = req.user.department || 'GENERAL';
                whereClause[Op.or] = [
                    { assigned_agent_id: req.user.id },
                    { cola_atencion: agentQueue, assigned_agent_id: null }
                ];
            }

            // Query Params (Overrides)
            if (status) whereClause.status = status;
            if (assigned_agent_id) whereClause.assigned_agent_id = assigned_agent_id;
            if (queue) whereClause.cola_atencion = queue;
        }

        const tickets = await Ticket.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'creator', attributes: ['name', 'email', 'phone'] },
                { model: User, as: 'assignee', attributes: ['name', 'email'] }
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
        const messageWhere = {};
        if (req.user?.role === 'USER') {
            messageWhere.is_internal = false;
        }

        const ticket = await Ticket.findByPk(id, {
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] },
                {
                    model: Message,
                    as: 'messages',
                    where: messageWhere,
                    required: false, // Important: Still return ticket even if no messages match
                    include: [{ model: User, as: 'sender', attributes: ['id', 'name'] }]
                }
            ],
            order: [
                [{ model: Message, as: 'messages' }, 'createdAt', 'ASC']
            ]
        });

        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        // SECURITY: Check ownership for End Users
        if (req.user?.role === 'USER' && ticket.created_by_user_id !== req.user.id) {
            return res.status(403).json({ message: 'No tiene permiso para ver este ticket.' });
        }

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

        // 2. STATE GUARDS
        if (status && status !== ticket.status) {
            const oldStatus = ticket.status;

            // Guard: PENDIENTE/EN_COLA -> CERRADO (Forbidden)
            if (status === 'CERRADO' && oldStatus !== 'RESUELTO_TECNICO' && req.user.role !== 'ADMIN') {
                return res.status(400).json({ message: 'No se puede cerrar un ticket que no ha sido resuelto.' });
            }

            // Guard: -> RESUELTO_TECNICO (Requires Assignment)
            if (status === 'RESUELTO_TECNICO' && !ticket.assigned_agent_id && !assigned_agent_id) {
                return res.status(400).json({ message: 'Debe asignarse el ticket antes de resolverlo.' });
            }

            ticket.status = status;
        }
        if (category) ticket.category = category;

        // --- SECTOR TRANSFER (DERIVATION) ---
        if (cola_atencion && cola_atencion !== ticket.cola_atencion) {
            const oldSector = ticket.cola_atencion;
            ticket.cola_atencion = cola_atencion;

            // Unassign current agent
            const previousAgentName = ticket.assignee?.name || 'Agente';
            ticket.assigned_agent_id = null;
            ticket.status = 'EN_COLA_DEPARTAMENTAL'; // Reset status to queue

            // System Log
            const reasonText = req.body.derivationReason ? ` Motivo: ${req.body.derivationReason}` : '';
            await Message.create({
                ticket_id: ticket.id,
                sender_type: 'SYSTEM',
                content: `🔄 TICKET DERIVADO: De ${oldSector} a ${cola_atencion} por ${req.user.name}.${reasonText}`
            });

            // Notify User
            if (ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                sendWhatsAppMessage(ticket.creator.phone, `ℹ️ *Actualización*: Su ticket ha sido derivado al área de *${cola_atencion}* para su correcta atención.`).catch(console.error);
            }
        }

        // Priority Update Logic
        if (req.body.impact || req.body.urgency) {
            ticket.impact = req.body.impact || ticket.impact;
            ticket.urgency = req.body.urgency || ticket.urgency;
            ticket.priority = calculateMatrixPriority(ticket.impact, ticket.urgency);
        } else if (priority) {
            ticket.priority = priority;
        }

        // SLA Tracking: Assignment
        if (assigned_agent_id && assigned_agent_id !== previousAgentId) {
            ticket.assigned_agent_id = assigned_agent_id;
            ticket.assigned_at = new Date();
        }

        // SLA Tracking: Agent Response
        if (assigned_agent_id && (status || req.body.rejectionReason)) {
            ticket.last_agent_response_at = new Date();
        }

        await ticket.save();

        // Notification Logic: If Agent Assigned (and changed)
        if (assigned_agent_id && assigned_agent_id !== previousAgentId) {
            try {
                const agent = await User.findByPk(assigned_agent_id);
                // WhatsApp to User
                if (agent && ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                    await sendWhatsAppMessage(ticket.creator.phone, `👋 Hola, soy ${agent.name} del soporte técnico. He tomado su consulta #${ticket.id}. En breve le escribiré por este medio.`);
                }
                // Email to Agent
                if (agent && agent.email) {
                    sendTicketAssigned(agent, ticket).catch(err => console.error('Email assignment error:', err));
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
                // WhatsApp
                if (ticket.channel === 'WHATSAPP' && ticket.creator?.phone) {
                    await sendWhatsAppMessage(
                        ticket.creator.phone,
                        `✅ *Caso Resuelto*\n\nHola, el agente ${agent.name} ha marcado su ticket #${ticket.id} como resuelto.\n\n¿Está conforme con la solución?\n\nResponda *SI* para cerrar el caso y calificar la atención.\nResponda *NO* si aún tiene dudas.`
                    );
                }
                // Email
                if (ticket.creator?.email) {
                    sendTicketResolved(ticket.creator, ticket).catch(err => console.error('Email resolution error:', err));
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
