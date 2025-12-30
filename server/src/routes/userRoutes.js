import express from 'express';
import { getUsers, createUser } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/', getUsers);
router.post('/', createUser); // Only Admin should potentially access this, but keeping open for Agent for now

export default router;
