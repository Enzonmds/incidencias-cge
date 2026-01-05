import { User } from './src/models/index.js';

const setTestEmail = async () => {
    try {
        const phone = '5491171483037';
        const user = await User.findOne({ where: { phone } });
        if (user) {
            user.email = 'enzonmds@gmail.com';
            await user.save();
            console.log(`✅ Updated user ${user.name} (${user.phone}) with email: enzonmds@gmail.com`);
        } else {
            console.log(`❌ User with phone ${phone} not found.`);
        }
    } catch (error) {
        console.error('Error updating user email:', error);
    }
};

setTestEmail();
