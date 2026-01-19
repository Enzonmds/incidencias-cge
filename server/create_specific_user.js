import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';
import bcrypt from 'bcrypt';

const createSpecificUser = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const userData = {
            name: 'Usuario Test 36',
            dni: '41231036',
            email: 'test36@cge.mil.ar',
            password: '123',
            role: 'USER'
        };

        let user = await User.findOne({ where: { dni: userData.dni } });
        if (user) {
            console.log('User 41231036 already exists.');
        } else {
            user = await User.create({
                name: userData.name,
                dni: userData.dni,
                email: userData.email,
                password_hash: await bcrypt.hash(userData.password, 10),
                role: userData.role
            });
            console.log('✅ User 41231036 created.');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
};

createSpecificUser();
