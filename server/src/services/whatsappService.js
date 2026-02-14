import axios from 'axios';

export const sendWhatsAppMessage = async (to, text) => {
    try {
        if (!to) {
            console.error('Error sending WhatsApp message: No recipient phone number provided.');
            return;
        }

        // CORRECTED: Do NOT modify the 'to' number.
        // The API expects the exact wa_id received in the webhook.
        // Previous logic for 54911 -> 541115 was causing failures in production.
        // if (to.startsWith('54911')) { to = to.replace('54911', '541115'); } <-- REMOVED

        await axios.post(
            `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
            {
                messaging_product: 'whatsapp',
                to: to,
                text: { body: text },
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json',
                },
            }
        );
        console.error(`[WHATSAPP] Sending to ${to}: "${text}"`);
        console.log(`📤 WhatsApp sent to ${to}`);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error?.response?.data || error.message);
    }
};
