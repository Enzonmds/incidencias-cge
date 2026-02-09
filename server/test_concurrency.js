import axios from 'axios';

// Ajusta la URL a tu entorno local
const WEBHOOK_URL = 'http://localhost:3001/api/webhooks/whatsapp';

const payload = {
    object: 'whatsapp_business_account',
    entry: [{
        changes: [{
            value: {
                messages: [{
                    from: '5491199999999', // Un número de prueba
                    id: 'wamid.test.FIXED_ID_123', // Fixed ID for Idempotency Test
                    text: { body: 'Prueba de Concurrencia' },
                    type: 'text',
                    timestamp: Date.now()
                }],
                metadata: { display_phone_number: '5491199999999' }
            }
        }]
    }]
};

async function attack() {
    console.log('🚀 Lanzando 2 peticiones SIMULTÁNEAS...');

    // Promise.all fuerza que salgan disparadas casi al mismo nanosegundo
    const requests = [
        axios.post(WEBHOOK_URL, payload).catch(e => e.response?.status || e.code),
        axios.post(WEBHOOK_URL, payload).catch(e => e.response?.status || e.code)
    ];

    const results = await Promise.all(requests);

    console.log('🏁 Resultados:', results.map(r => r.status || r));
}

attack();