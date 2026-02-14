import sequelize from './src/config/db.js';
import { User } from './src/models/index.js';

const run = async () => {
    await sequelize.authenticate();
    // find or create user
    const [user, created] = await User.findOrCreate({
        where: { phone: '5491112345678' },
        defaults: {
            name: 'Test Sript User',
            email: 'testscript@cge.mil.ar', // valid email to test SMTP logic too if patched
            whatsapp_step: 'WAITING_DESCRIPTION',
            whatsapp_topic: 'SISTEMAS',
            dni: '12345678'
        }
    });

    if (!created) {
        user.whatsapp_step = 'WAITING_DESCRIPTION';
        user.whatsapp_topic = 'SISTEMAS';
        await user.save();
    }

    console.log('✅ User State Updated:', user.id, user.whatsapp_step);
    await sequelize.close();
};

run();
