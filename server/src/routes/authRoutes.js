import express from 'express';
import { login, verifyWhatsApp } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/verify-whatsapp', verifyWhatsApp);

export default router;
