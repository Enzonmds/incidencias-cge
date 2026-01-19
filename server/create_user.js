import { User } from './src/models/index.js';
import sequelize from './src/config/db.js';
import bcrypt from 'bcrypt';

// EDIT THESE VALUES TO CREATE CUSTOM USERS
const USER_DATA = {
    name: 'Usuario Prueba',
    dni: '41231037', // Change this
    email: 'prueba@cge.mil.ar', // Change this
    phone: null, // Optional, e.g. '54911...' or null
    role: 'USER', // 'USER', 'ADMIN', 'TECHNICAL_SUPPORT', etc.
};

const createUser = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Base de datos conectada.');

        const hashedPassword = await bcrypt.hash('123456', 10);

        // Check if DNI or Email exists
        const existingDni = await User.findOne({ where: { dni: USER_DATA.dni } });
        if (existingDni) {
            console.log(`⚠️ Ya existe un usuario con DNI ${USER_DATA.dni}: ${existingDni.name}`);
            process.exit(0);
        }

        const existingEmail = await User.findOne({ where: { email: USER_DATA.email } });
        if (existingEmail) {
            console.log(`⚠️ Ya existe un usuario con Email ${USER_DATA.email}: ${existingEmail.name}`);
            process.exit(0);
        }

        const newUser = await User.create({
            name: USER_DATA.name,
            dni: USER_DATA.dni,
            email: USER_DATA.email,
            phone: USER_DATA.phone,
            password_hash: hashedPassword,
            role: USER_DATA.role,
            whatsapp_step: 'MENU'
        });

        console.log(`
🎉 Usuario Creado Exitosamente:
-----------------------------
Nombre: ${newUser.name}
DNI: ${newUser.dni}
Email: ${newUser.email}
Password: '123456'
-----------------------------
`);

    } catch (error) {
        console.error('❌ Error al crear usuario:', error);
    } finally {
        process.exit();
    }
};

createUser();
