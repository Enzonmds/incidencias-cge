import { Ticket, User, Message } from '../models/index.js';

export const createTicket = async (req, res) => {
    try {
        const { title, description, priority, created_by_user_id } = req.body;
        // In a real app, created_by_user_id might come from the logged in user (req.user.id)
        // For now we allow passing it to simulate creation by different users or via bot

        const ticket = await Ticket.create({
            title,
            description,
            priority,
            created_by_user_id: created_by_user_id || req.user?.id, // Fallback to auth user
            status: 'OPEN'
        });

        res.status(201).json(ticket);
    } catch (error) {
        console.error('Create Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

export const getTickets = async (req, res) => {
    try {
        const { status, assigned_agent_id } = req.query;
        const where = {};
        if (status) where.status = status;
        if (assigned_agent_id) where.assigned_agent_id = assigned_agent_id;

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
                { model: Message, as: 'messages', include: [{ model: User, attributes: ['id', 'name'] }] }
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
        const { status, priority, assigned_agent_id } = req.body;

        const ticket = await Ticket.findByPk(id);
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

        if (status) ticket.status = status;
        if (priority) ticket.priority = priority;
        if (assigned_agent_id) ticket.assigned_agent_id = assigned_agent_id;

        await ticket.save();
        res.json(ticket);
    } catch (error) {
        console.error('Update Ticket Error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
