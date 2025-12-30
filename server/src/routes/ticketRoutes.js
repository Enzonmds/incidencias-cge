import express from 'express';
import { createTicket, getTickets, getTicketById, updateTicket } from '../controllers/ticketController.js';
import { addMessageToTicket } from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/auth.js'; // Need to create this

const router = express.Router();

router.use(authenticateToken); // Protect all ticket routes

router.post('/', createTicket);
router.get('/', getTickets);
router.get('/:id', getTicketById);
router.put('/:id', updateTicket);
router.post('/:id/messages', addMessageToTicket);

export default router;
