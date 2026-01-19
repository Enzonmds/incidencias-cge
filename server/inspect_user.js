import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';

const inspectUser = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        // Fetch ALL users and filter in JS to see if it's a DB query issue
        const allUsers = await User.findAll();
        console.log(`Total Users: ${allUsers.length}`);

        const target = allUsers.find(u => u.dni && u.dni.includes('41231036'));

        if (target) {
            console.log('✅ Found in JS Filter:');
            console.log('ID:', target.id);
            console.log('DNI Raw:', `'${target.dni}'`); // Quotes to see whitespace
            console.log('DNI Length:', target.dni.length);
            console.log('Type:', typeof target.dni);
        } else {
            console.log('❌ Not found in JS Filter either.');
        }

        // Try Sequelize Query
        const dbUser = await User.findOne({ where: { dni: '41231036' } });
        console.log('Sequelize Query Result:', dbUser ? 'FOUND' : 'NOT FOUND');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit();
    }
};

inspectUser();
