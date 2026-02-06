import express from 'express';
import { getUsers, createUser, getAdUsers, updateUser, resetPassword, deleteUser } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken); // Protect all routes

router.get('/ad', getAdUsers); // Specific route first
router.get('/', getUsers);
router.post('/', createUser); // Only Admin should potentially access this, but keeping open for Agent for now
router.put('/:id', updateUser);
router.post('/:id/reset-password', resetPassword);
router.delete('/:id', deleteUser);

export default router;
