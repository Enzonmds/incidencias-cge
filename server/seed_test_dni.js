import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';
import bcrypt from 'bcrypt';

const seedTestDNI = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        const dni = '41231036';
        const email = 'test_militar@cge.mil.ar';

        // Check if user exists with this DNI
        let user = await User.findOne({ where: { dni } });

        if (user) {
            console.log(`✅ User with DNI ${dni} already exists: ${user.name} (${user.email})`);
        } else {
            // Check if user exists with current email to update
            user = await User.findOne({ where: { email } });
            if (user) {
                user.dni = dni;
                await user.save();
                console.log(`✅ Updated existing user ${user.email} with DNI ${dni}`);
            } else {
                // Create new user
                const hashedPassword = await bcrypt.hash('123456', 10);
                user = await User.create({
                    name: 'Personal Militar Test',
                    email: email,
                    password_hash: hashedPassword,
                    role: 'USER',
                    dni: dni,
                    department: 'OPERACIONES'
                });
                console.log(`✅ Created NEW user for DNI ${dni}`);
            }
        }

    } catch (error) {
        console.error('Error seeding test user:', error);
    } finally {
        process.exit();
    }
};

seedTestDNI();
