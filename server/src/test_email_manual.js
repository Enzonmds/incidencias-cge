import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
import { sendTicketCreated } from './services/emailService.js';

const test = async () => {
    console.log('📧 Testing Email to enzonmds@gmail.com...');
    console.log('🛠 Config: ', {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        // pass: '***'
    });

    try {
        await sendTicketCreated(
            { name: 'Enzo Test', email: 'enzonmds@gmail.com' },
            { id: 9999, title: 'Prueba de Sistema de Tickets', priority: 'HIGH', status: 'PENDIENTE_VALIDACION' }
        );
        console.log('✅ Email sent successfully.');
    } catch (error) {
        console.error('❌ Failed to send email:', error);
    }
};

test();
