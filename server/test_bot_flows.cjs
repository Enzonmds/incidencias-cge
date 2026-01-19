
const axios = require('axios');

const API_URL = 'http://localhost:3001/api/webhooks/whatsapp';
const PHONE = '5491199998888'; // Test User

const sendWebhook = async (type, bodyText = '', mediaType = 'text') => {
    console.log(`\n--- Sending [${type}] ---`);
    const payload = {
        object: 'whatsapp_business_account',
        entry: [{
            changes: [{
                value: {
                    contacts: [{ profile: { name: 'Test User' }, wa_id: PHONE }],
                    messages: [{
                        from: PHONE,
                        id: 'wamid.test.' + Date.now(),
                        timestamp: Math.floor(Date.now() / 1000),
                        type: mediaType,
                        [mediaType]: mediaType === 'text' ? { body: bodyText } : { id: 'media_id_123' }
                    }]
                }
            }]
        }]
    };

    try {
        await axios.post(API_URL, payload);
        console.log('✅ Request Sent');
    } catch (err) {
        console.error('❌ Error sending webhook:', err.message);
    }
};

const runTests = async () => {
    // 1. GREETING
    await sendWebhook('Greeting', 'Hola, buenas tardes');

    await new Promise(r => setTimeout(r, 2000));

    // 2. MEDIA HANDLING
    await sendWebhook('Image Message', '', 'image');

    await new Promise(r => setTimeout(r, 2000));

    // 3. FLEXIBLE RESOLUTION (Simulated context needs to be right, but we can verify the Intent detection logic isn't crashing)
    // We'll just send "Si, muchas gracias" to see if it's handled gracefully even if not in a resolution state
    await sendWebhook('Resolution Intent', 'Si, muchas gracias, excelente servicio');
};

runTests();
