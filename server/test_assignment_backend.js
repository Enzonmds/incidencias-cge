
import axios from 'axios';
import jwt from 'jsonwebtoken';

const API_URL = 'http://localhost:3000/api'; // Internal port

async function runTest() {
    try {
        console.log('1. Logging in as Sistemas...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: 'sistemas@cge.mil.ar',
            password: '123456'
        });

        const token = loginRes.data.token;
        const decoded = jwt.decode(token);
        console.log('Login Success. Decoded Token:', decoded);

        if (!decoded.department) {
            console.error('CRITICAL: Token missing department claim!');
        }

        console.log('2. Creating Test Ticket by User...');
        // Login as User first to create? Or just use seed ticket #27 if it exists.
        // Let's rely on #27 if it exists, or create new.
        // We'll just try to assign #27 first.

        const ticketId = 27;
        console.log(`3. Attempting to Assign Ticket #${ticketId} to Self (ID: ${decoded.id})...`);

        try {
            const assignRes = await axios.put(`${API_URL}/tickets/${ticketId}`, {
                assigned_agent_id: decoded.id,
                status: 'EN_PROCESO'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('Assignment Response Status:', assignRes.status);
            console.log('Assignment Response Data (Partial):', {
                id: assignRes.data.id,
                status: assignRes.data.status,
                assigned_agent_id: assignRes.data.assigned_agent_id,
                assignee: assignRes.data.assignee
            });

            if (assignRes.data.assigned_agent_id == decoded.id) {
                console.log('✅ SUCCESS: Ticket assigned correctly.');
            } else {
                console.error('❌ FAILURE: Ticket NOT assigned.');
            }

        } catch (err) {
            console.error('❌ Assignment Failed:', err.response ? err.response.data : err.message);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTest();
