
import sequelize from './src/config/db.js';
import { User } from './src/models/index.js';

const reset = async () => {
    try {
        await sequelize.authenticate();
        const user = await User.findOne({ where: { phone: '5491171483037' } });
        if (user) {
            user.whatsapp_step = 'WAITING_TOPIC';
            user.whatsapp_temp_role = null;
            await user.save();
            console.log('✅ User reset to WAITING_TOPIC');
        } else {
            console.log('❌ User not found');
        }
    } catch (e) { console.error(e); }
    finally { await sequelize.close(); }
};

reset();
