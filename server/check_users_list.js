import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';

const listUsers = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        const users = await User.findAll({
            attributes: ['id', 'name', 'dni', 'email', 'whatsapp_step', 'role']
        });

        console.log('\n📋 LISTADO DE USUARIOS:');
        console.table(users.map(u => u.toJSON()));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
};

listUsers();
