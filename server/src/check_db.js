
import { Ticket } from './models/index.js';
import sequelize from './config/db.js';

const check = async () => {
    try {
        await sequelize.authenticate();
        const count = await Ticket.count();
        console.log(`🎟️ TOTAL TICKETS IN DB: ${count}`);

        if (count > 0) {
            const sample = await Ticket.findOne();
            console.log('Sample Ticket:', sample.toJSON());
        }
    } catch (error) {
        console.error('DB Check Failed:', error);
    } finally {
        process.exit();
    }
};

check();
