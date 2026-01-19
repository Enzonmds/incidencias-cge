import axios from 'axios';

export const sendWhatsAppMessage = async (to, text) => {
    try {
        if (!to) {
            console.error('Error sending WhatsApp message: No recipient phone number provided.');
            return;
        }

        // FIX: Meta Sandbox for Argentina sometimes requires '54 11 15...' instead of '54 9 11...'
        // If we see '54911' (Mobile Buenos Aires), change to '541115'
        // This is a specific sandbox fix. In production with real template messages this might vary, but we keep it for now.
        if (to.startsWith('54911')) {
            to = to.replace('54911', '541115');
        }

        await axios.post(
            `https://graph.facebook.com/v17.0/${process.env.PHONE_NUMBER_ID}/messages`,
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
        console.log(`📤 WhatsApp sent to ${to}`);
    } catch (error) {
        console.error('Error sending WhatsApp message:', error?.response?.data || error.message);
    }
};
