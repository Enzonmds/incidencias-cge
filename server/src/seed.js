import bcrypt from 'bcrypt';
import { User } from './models/index.js';

export const seedDatabase = async () => {
    try {
        const adminExists = await User.findOne({ where: { email: 'admin@cge.mil.ar' } });
        if (!adminExists) {
            const passwordHash = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Admin CGE',
                email: 'admin@cge.mil.ar',
                password_hash: passwordHash,
                role: 'ADMIN',
                phone: '56912345678'
            });
            console.log('✅ Admin user created: admin@cge.mil.ar / admin123');
        }

        const agentExists = await User.findOne({ where: { email: 'agente@cge.mil.ar' } });
        if (!agentExists) {
            const passwordHash = await bcrypt.hash('agente123', 10);
            await User.create({
                name: 'Agente Operaciones',
                email: 'agente@cge.mil.ar',
                password_hash: passwordHash,
                role: 'AGENT',
                phone: '56987654321'
            });
            console.log('✅ Agent user created: agente@cge.mil.ar / agente123');
        }
    } catch (error) {
        console.error('Seed error:', error);
    }
};
