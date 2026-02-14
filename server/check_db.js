import sequelize from './src/config/db.js';
import { User, Ticket } from './src/models/index.js';

const run = async () => {
    await sequelize.authenticate();

    const user = await User.findOne({ where: { phone: '5491112345678' } });
    if (user) {
        console.log(`User ${user.id}: Step=${user.whatsapp_step}, Role=${user.role}, Name=${user.name}`);
    } else {
        console.log('User 5491112345678 not found!');
    }

    const tickets = await Ticket.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']]
    });
    console.log('--- Last 5 Tickets ---');
    tickets.forEach(t => {
        console.log(`${t.id}: ${t.title} [${t.status}] (Created: ${t.createdAt}) CreatedBy: ${t.created_by_user_id}`);
    });

    await sequelize.close();
};

run();
