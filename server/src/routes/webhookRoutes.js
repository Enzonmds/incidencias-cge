import express from 'express';
import { handleWhatsAppWebhook, verifyWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Meta sends GET for verification and POST for messages
router.get('/whatsapp', verifyWebhook);
router.post('/whatsapp', handleWhatsAppWebhook);

export default router;
