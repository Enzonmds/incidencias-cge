import express from 'express';
import { login, verifyWhatsApp, setupPassword } from '../controllers/authController.js';

const router = express.Router();

router.post('/login', login);
router.post('/verify-whatsapp', verifyWhatsApp);
router.post('/setup-password', setupPassword); // Public Endpoint

export default router;
