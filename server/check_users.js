import { User } from './src/models/index.js';

async function checkUsers() {
    try {
        const users = await User.findAll({
            attributes: ['id', 'name', 'phone', 'email']
        });
        console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.error(error);
    }
}

checkUsers();
