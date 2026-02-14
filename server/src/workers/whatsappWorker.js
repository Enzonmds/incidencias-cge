
import { messageQueue } from '../config/queue.js';
import { processMessage } from '../services/chatbotService.js';
import { User } from '../models/index.js';

export const startWorker = () => {
    console.log('👷 Worker started. Listening for messages...');

    messageQueue.process(async (job) => {
        const { from, name, wamid, type, mediaId } = job.data;
        let { body } = job.data; // Mutable

        const fs = await import('fs');
        const path = await import('path');
        const logFile = path.resolve('worker.log');
        const log = (msg) => fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`);

        console.log(`👷 Job Processing: ${wamid} [Type: ${type}]`);
        log(`Job Processing: ${wamid} [Type: ${type}]`);

        try {
            // 0. Handle Media Download (Heavy Lifting)
            if (type === 'audio' && mediaId) {
                console.log(`🎤 Downloading Audio for ${wamid}...`);
                const { downloadWhatsAppMedia } = await import('../services/whatsappMediaService.js');
                const mediaResult = await downloadWhatsAppMedia(mediaId, 'audio');

                if (mediaResult) {
                    const { transcribeAudio } = await import('../services/openaiService.js');
                    const transcription = await transcribeAudio(mediaResult.filePath);
                    body = `🎤 "${transcription}"`;
                } else {
                    body = `[ERROR_AUDIO]: Falló descarga.`;
                }
            } else if (['image', 'document'].includes(type) && mediaId) {
                console.log(`📎 Downloading Media for ${wamid}...`);
                const { downloadWhatsAppMedia } = await import('../services/whatsappMediaService.js');
                const mediaResult = await downloadWhatsAppMedia(mediaId, type);

                if (mediaResult) {
                    body = `[MEDIA_URL]: ${mediaResult.url}`;
                } else {
                    body = `[ERROR_MEDIA]: Falló descarga.`;
                }
            }

            console.log(`📝 Processed Body: "${body}"`);

            // 1. User Logic (Atomic Create/Find)
            let user;
            try {
                // Try to find first
                user = await User.findOne({ where: { phone: from } });

                if (!user) {
                    try {
                        // Attempt create
                        user = await User.create({
                            phone: from,
                            name: name || 'Usuario de WhatsApp',
                            role: 'GUEST',
                            whatsapp_step: 'MENU',
                            email: `${from}@cge.mil.ar.temp` // Placeholder
                        });
                        console.log(`✨ New User Created: ${user.phone}`);
                    } catch (createError) {
                        // Handle Race Condition (Unique Constraint Violation)
                        if (createError.name === 'SequelizeUniqueConstraintError') {
                            console.log('⚠️ Race condition detected. Fetching existing user...');
                            user = await User.findOne({ where: { phone: from } });
                        } else {
                            throw createError; // Re-throw other errors
                        }
                    }
                }
            } catch (dbError) {
                console.error('❌ Database Error in Worker:', dbError);
                throw dbError; // Retry job
            }

            // CRITICAL: Ensure we have a user before proceeding
            if (!user || !user.id) {
                console.error(`❌ FATAL: Could not resolve user for ${from}. Aborting.`);
                return; // Stop processing
            }

            await processMessage(user, body, from);
            console.log(`Job completed for ${from}`);

        } catch (error) {
            console.error('Job failed:', error);
            const fs = await import('fs');
            const path = await import('path');
            fs.appendFileSync(path.resolve('worker.log'), `[ERROR] ${error.stack}\n`);
            throw error; // Let Bull handle retries
        }
    });
};
