const axios = require('axios');

const API_URL = 'http://localhost:3001/api';

const payload = {
    "object": "whatsapp_business_account",
    "entry": [
        {
            "changes": [
                {
                    "value": {
                        "messages": [
                            {
                                "from": "5491112345678",
                                "id": "wamid.test." + Date.now(),
                                "text": {
                                    "body": "Hola, esto es una prueba automática de creación de ticket."
                                },
                                "type": "text",
                                "timestamp": Math.floor(Date.now() / 1000).toString()
                            }
                        ],
                        "contacts": [
                            {
                                "profile": {
                                    "name": "Test Script User"
                                },
                                "wa_id": "5491112345678"
                            }
                        ]
                    }
                }
            ]
        }
    ]
};

async function run() {
    try {
        console.log('1. Sending Webhook...');
        // Correct endpoint (PLURAL webhooks)
        await axios.post(`${API_URL}/webhooks/whatsapp`, payload);
        console.log('✅ Webhook Sent. Status:', 200);

        console.log('2. Waiting for Worker (5s)...');
        await new Promise(r => setTimeout(r, 5000));

        console.log('3. Logging in/Fetching Tickets...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'admin@cge.mil.ar',
            password: '123456'
        });
        const token = loginRes.data.token;
        console.log('✅ Logged in.');

        const ticketRes = await axios.get(`${API_URL}/tickets?limit=5`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const tickets = ticketRes.data.tickets || ticketRes.data;
        console.log('Tickets found:', tickets.length);
        tickets.forEach(t => console.log(`${t.id}: ${t.title} (${t.status})`));

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) console.error('Response:', error.response.data);
    }
}

run();
