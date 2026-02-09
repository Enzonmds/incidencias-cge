import { Ticket } from './src/models/index.js';
import sequelize from './src/config/db.js';

const seedRatings = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Update random tickets with ratings
        await Ticket.update({ satisfaction_rating: 5, feedback_comment: 'Excelente servicio' }, { where: { id: [1, 2, 3] } });
        await Ticket.update({ satisfaction_rating: 4, feedback_comment: 'Muy bueno, pero demoró' }, { where: { id: [4, 5] } });
        await Ticket.update({ satisfaction_rating: 1, feedback_comment: 'Mala atención' }, { where: { id: [6] } });

        console.log('✅ Ratings seeded successfully.');
    } catch (error) {
        console.error('❌ Error seeding ratings:', error);
    } finally {
        await sequelize.close();
    }
};

seedRatings();
