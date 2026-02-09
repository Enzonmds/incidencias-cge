
import sequelize from './src/config/db.js';
import { Ticket, User } from './src/models/index.js'; // Ensure this matches actual structure
// If it fails, check imports. src/models/index.js exports { User, Ticket }.
import dotenv from 'dotenv';

dotenv.config();

const createTestTicket = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Find a user to be the creator (e.g., admin or a random user)
        const creator = await User.findOne({ where: { role: 'USER' } });
        if (!creator) {
            console.error('No USER role found to create ticket.');
            process.exit(1);
        }

        const ticket = await Ticket.create({
            title: '[TEST] Ticket de Prueba Agente',
            description: 'Ticket generado automáticamente para probar flujo de Agente (Tomar/Derivar).',
            priority: 'HIGH',
            impact: 'HIGH',
            urgency: 'HIGH',
            status: 'EN_COLA_DEPARTAMENTAL', // Ready to be taken
            cola_atencion: 'SISTEMAS',
            category: 'HARDWARE',
            created_by_user_id: creator.id,
            dni_solicitante: creator.dni || '12345678',
            channel: 'WEB'
        });

        console.log(`✅ Ticket created: ID ${ticket.id}`);
        process.exit(0);

    } catch (error) {
        console.error('Error creating ticket:', error);
        process.exit(1);
    }
};

createTestTicket();
