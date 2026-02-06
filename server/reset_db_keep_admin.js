import { User, Ticket, Message } from './src/models/index.js';
import sequelize from './src/config/db.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const resetDbKeepAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('🔌 DB Connected.');

        console.log('🗑️ Deleting all Messages...');
        await Message.destroy({ where: {}, truncate: true, cascade: true });

        console.log('🗑️ Deleting all Tickets...');
        await Ticket.destroy({ where: {}, truncate: true, cascade: true });

        console.log('🗑️ Deleting non-ADMIN Users...');
        const deletedUsers = await User.destroy({
            where: {
                role: { [Op.ne]: 'ADMIN' }
            }
        });
        console.log(`✅ Deleted ${deletedUsers} users.`);

        // Ensure Admin Exists
        console.log('🛡️ Verifying Admin Account...');
        const adminEmail = 'admin@cge.mil.ar';
        const admin = await User.findOne({ where: { email: adminEmail } });

        if (!admin) {
            console.log('⚠️ Admin not found. Creating default Admin...');
            const passwordHash = await bcrypt.hash('123456', 10);
            await User.create({
                name: 'Admin CGE',
                email: adminEmail,
                password_hash: passwordHash,
                role: 'ADMIN',
                phone: '555-0000'
            });
            console.log('✅ Admin Created: admin@cge.mil.ar / 123456');
        } else {
            console.log('✅ Admin exists.');
        }

        console.log('🏁 Database Reset Complete (Admin Preserved).');

    } catch (error) {
        console.error('❌ Reset Error:', error);
    } finally {
        await sequelize.close();
    }
};

resetDbKeepAdmin();
