
import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';

const checkUser = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');
        const user = await User.findOne({ where: { email: 'sistemas@cge.mil.ar' } });
        if (user) {
            console.log(`✅ User found: ${user.name} (ID: ${user.id}, Role: ${user.role}, Dept: ${user.department})`);
        } else {
            console.log('❌ User sistemas@cge.mil.ar NOT found.');
        }
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkUser();
