
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}/api/webhooks/whatsapp`; // Corrected path
const PHONE = '5491100000001'; // Test phone

const sendMsg = async (text) => {
    console.log(`\n👤 USER SAYS: "${text}"`);
    try {
        await axios.post(BASE_URL, {
            object: 'whatsapp_business_account',
            entry: [{
                changes: [{
                    value: {
                        messages: [{
                            from: PHONE,
                            id: 'wamid.test.' + Date.now(),
                            timestamp: Date.now() / 1000,
                            text: { body: text },
                            type: 'text'
                        }],
                        metadata: {
                            display_phone_number: PHONE,
                            phone_number_id: 'test-id'
                        },
                        contacts: [{ profile: { name: 'Test User' }, wa_id: PHONE }]
                    }
                }]
            }]
        });
        // Wait a bit for server to process and log response
        await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
        console.error('Error sending message:', e.message);
    }
};

const runSimulation = async () => {
    console.log('🚀 STARTING WHATSAPP SIMULATION');
    console.log('Target:', BASE_URL);

    // 1. Greeting
    await sendMsg('Hola');

    // 2. DNI
    await sendMsg('12345678'); // Assuming this DNI exists or triggers something

    // 3. Topic Selection (e.g. "1" for Haberes, triggers IVR?) 
    // Need to select a topic that triggers menu. In my code '1' -> Topic 'Haberes'.
    // Then code sets WAITING_MENU_SELECTION.
    await sendMsg('1');

    // 4. IVR Selection - "2" (Impresora - Solution Template)
    await sendMsg('2');

    // 5. User says "NO" (It didn't work) -> Should create ticket
    await sendMsg('NO');

    console.log('✅ SIMULATION COMPLETE');
};

runSimulation();
