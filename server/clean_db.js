
import { User, Ticket, Message } from './src/models/index.js';
import sequelize from './src/config/db.js';
import { Op } from 'sequelize';

const cleanDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log('🗑️ Deleting all Messages...');
        await Message.destroy({ where: {}, truncate: true, cascade: true });

        console.log('🗑️ Deleting all Tickets...');
        await Ticket.destroy({ where: {}, truncate: true, cascade: true });

        console.log('🗑️ Deleting Users (Except Admin)...');
        // Delete everyone EXCEPT admin@cge.mil.ar
        // Using Op.ne (Not Equal)
        const result = await User.destroy({
            where: {
                email: { [Op.ne]: 'admin@cge.mil.ar' }
            }
        });

        console.log(`✅ Deleted ${result} users.`);
        console.log('✨ Database Cleaned. Admin preserved.');

    } catch (error) {
        console.error('❌ Error during cleanup:', error);
    } finally {
        await sequelize.close();
    }
};

cleanDatabase();
