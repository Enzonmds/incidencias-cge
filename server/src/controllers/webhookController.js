
import { User } from '../models/index.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';
import { processMessage } from '../services/chatbotService.js';
import { downloadWhatsAppMedia } from '../services/whatsappMediaService.js';
import { messageQueue } from '../config/queue.js';

// 1. Webhook Verification (Handshake)
export const verifyWebhook = (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
            console.log('✅ Webhook Verified');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    } else {
        res.sendStatus(400); // Bad Request if tokens are missing
    }
};

// 2. Handle Incoming Messages (Async via Queue)
export const handleWhatsAppWebhook = async (req, res) => {
    try {
        const body = req.body;
        console.log('📨 [Webhook] Received Payload:', JSON.stringify(body, null, 2));

        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const messageObj = body.entry[0].changes[0].value.messages[0];
                const from = messageObj.from;
                const name = body.entry[0].changes[0].value.contacts?.[0]?.profile?.name || 'Usuario WhatsApp';
                const messageId = messageObj.id; // Unique WhatsApp Message ID (wamid)
                const msgType = messageObj.type;

                // LIGHTWEIGHT CONTROLLER: 
                // We extract minimal data and let the Worker handle the heavy lifting (Download/Transcribe).
                // This ensures we ack the webhook fast and rely on Queue for deduplication.

                let payload = {
                    from,
                    name,
                    timestamp: Date.now(),
                    wamid: messageId,
                    type: msgType,
                    body: '', // Set below if text
                    mediaId: null // Set below if media
                };

                if (msgType === 'text') {
                    payload.body = messageObj.text.body;
                } else if (msgType === 'audio') {
                    console.log(`🎤 Audio message received [${messageId}]. Offloading to Worker...`);
                    payload.mediaId = messageObj.audio.id;
                } else if (['image', 'document'].includes(msgType)) {
                    console.log(`📎 Media message received [${messageId}]. Offloading to Worker...`);
                    payload.mediaId = messageObj[msgType]?.id;
                } else {
                    payload.body = `[ARCHIVO: ${msgType}]`;
                }

                console.log(`📥 [Webhook] Queuing job for ${name} (${from}) - ID: ${messageId}`);

                // 🚀 ADD TO QUEUE WITH IDEMPOTENCY
                // jobId ensures that if we receive the same webhook again, Bull will ignore it.
                // WE MUST CHECK IF JOB EXISTS to avoid "Already Exists" errors filling logs or race conditions.

                const existingJob = await messageQueue.getJob(messageId);

                if (existingJob) {
                    console.warn(`⚠️ [Webhook] Duplicate Message Detected (wamid: ${messageId}). Skipping.`);
                    // We simply ignore it, sending 200 OK below.
                } else {
                    await messageQueue.add(payload, {
                        jobId: messageId,
                        removeOnComplete: {
                            age: 24 * 3600, // Keep for 24 hours
                            count: 5000     // Keep last 5000 jobs
                        },
                        removeOnFail: {
                            age: 24 * 3600,
                            count: 1000
                        }
                    });
                    console.log(`✅ [Webhook] Job Enqueued for ${name}`);
                }
            }
            res.sendStatus(200);
        } else {
            console.log('❌ [Webhook] Invalid Body Object:', body);
            res.sendStatus(404);
        }
    } catch (error) {
        console.error('❌ [Webhook] Error processing extraction:', error);
        res.sendStatus(500);
    }
};
