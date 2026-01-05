import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';

const restoreUsers = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // 1. DELETE DNI 41231037
        const deleted = await User.destroy({
            where: {
                [Op.or]: [
                    { dni: '41231037' },
                    { email: 'test37@cge.mil.ar' }, // Assuming this might be it
                    { name: 'Usuario Prueba' } // From logs "Usuario Prueba"
                ]
            }
        });
        console.log(`🗑️ Deleted ${deleted} users (DNI 37/Usuario Prueba).`);

        // 2. RESTORE DNI 41231036
        let user36 = await User.findOne({ where: { email: 'test36@cge.mil.ar' } });

        if (user36) {
            console.log('found user 36, updating...');
            user36.dni = '41231036';
            user36.phone = null; // Unbind phone so they can re-verify nicely
            user36.whatsapp_step = 'MENU';
            await user36.save();
            console.log('✅ User 41231036 Restored (DNI set, Phone unbound).');
        } else {
            console.log('User 36 not found, creating...');
            await User.create({
                name: 'Usuario Test 36',
                dni: '41231036',
                email: 'test36@cge.mil.ar',
                password_hash: await bcrypt.hash('123', 10),
                role: 'USER',
                phone: null
            });
            console.log('✅ User 41231036 Created.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
};

restoreUsers();
