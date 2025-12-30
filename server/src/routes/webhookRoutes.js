import express from 'express';
import { handleWhatsAppWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Twilio sends POST requests
router.post('/whatsapp', express.urlencoded({ extended: false }), handleWhatsAppWebhook);

export default router;
