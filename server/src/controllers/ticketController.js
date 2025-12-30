import { Ticket, User, Message } from '../models/index.js';

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
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
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

        const ticket = await Ticket.findByPk(id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (status) ticket.status = status;
        if (priority) ticket.priority = priority;
        if (category) ticket.category = category;
        if (cola_atencion) ticket.cola_atencion = cola_atencion;
        if (assigned_agent_id) ticket.assigned_agent_id = assigned_agent_id;

        await ticket.save();
        res.json(ticket);
    } catch (error) {
        console.error('Update Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
