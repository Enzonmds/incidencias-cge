import bcrypt from 'bcrypt';
import { User, Ticket } from './models/index.js';

export const seedDatabase = async () => {
    try {
        const passwordHash = await bcrypt.hash('123456', 10);

        // --- 1. USERS ---
        // Admin
        const [admin] = await User.findOrCreate({
            where: { email: 'admin@cge.mil.ar' },
            defaults: { name: 'Admin CGE', password_hash: passwordHash, role: 'ADMIN', phone: '555-0000' }
        });

        // Mesa de Entradas (Triaje)
        const [mesa] = await User.findOrCreate({
            where: { email: 'mesa@cge.mil.ar' },
            defaults: { name: 'Mesa de Entradas', password_hash: passwordHash, role: 'HUMAN_ATTENTION', phone: '555-0001' }
        });

        // Departments (Technical Support)
        const departments = [
            { email: 'tesoreria@cge.mil.ar', name: 'Técnico Tesorería', queue: 'TESORERIA' },
            { email: 'personal@cge.mil.ar', name: 'Técnico Gastos Personal', queue: 'GASTOS_PERSONAL' },
            { email: 'sistemas@cge.mil.ar', name: 'Técnico Sistemas', queue: 'SISTEMAS' },
            { email: 'saf@cge.mil.ar', name: 'Técnico SAF', queue: 'SAF' },
            { email: 'contabilidad@cge.mil.ar', name: 'Técnico Contabilidad', queue: 'CONTABILIDAD' },
            { email: 'contrataciones@cge.mil.ar', name: 'Técnico Contrataciones', queue: 'CONTRATACIONES' }
        ];

        const deptUsers = {};
        for (const dept of departments) {
            const [user] = await User.findOrCreate({
                where: { email: dept.email },
                defaults: { name: dept.name, password_hash: passwordHash, role: 'TECHNICAL_SUPPORT', phone: '555-DEPT' }
            });
            deptUsers[dept.queue] = user;
        }

        // Standard User
        const [normalUser] = await User.findOrCreate({
            where: { email: 'usuario@cge.mil.ar' },
            defaults: { name: 'Juan Pérez (User)', password_hash: passwordHash, role: 'USER', phone: '555-USER' }
        });

        console.log('✅ Usuarios de Departamentos Creados (Passwords: 123456)');

        // --- 2. CLEAN UP ---
        const { Message } = await import('./models/index.js');
        await Message.destroy({ where: {} });
        await Ticket.destroy({ where: {} });
        console.log('🧹 DB Limpia');

        // --- 3. SEED TICKETS ---
        const tickets = [];

        // 3.1 GASTOS EN PERSONAL
        tickets.push({
            title: 'No cobré antigüedad', description: 'Revisando mi recibo no figura el ítem de antigüedad.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'HABERES', cola_atencion: 'GASTOS_PERSONAL',
            dni_solicitante: '20111222', telefono_contacto: '11-4444-5555',
            created_by_user_id: normalUser.id, priority: 'HIGH'
        });
        tickets.push({
            title: 'Descuento Mutual erróneo', description: 'Me descontaron doble la cuota de la mutual.',
            status: 'EN_PROCESO', category: 'ENTIDADES', cola_atencion: 'GASTOS_PERSONAL',
            dni_solicitante: '20333444', telefono_contacto: '11-6666-7777',
            created_by_user_id: normalUser.id, assigned_agent_id: deptUsers['GASTOS_PERSONAL'].id
        });

        // 3.2 CONTABILIDAD (Viáticos)
        tickets.push({
            title: 'Comisión a Córdoba impaga', description: 'Falta liquidar viáticos de la comisión de hace 15 días.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'VIATICOS', cola_atencion: 'CONTABILIDAD',
            dni_solicitante: '30555666', telefono_contacto: '11-8888-9999',
            created_by_user_id: normalUser.id
        });

        // 3.3 SISTEMAS
        tickets.push({
            title: 'Error al ingresar al SAF', description: 'Me tira error 500 al intentar loguearme.',
            status: 'PENDIENTE_VALIDACION', // New ticket
            dni_solicitante: '10222333', telefono_contacto: '11-1212-3434',
            created_by_user_id: normalUser.id
        });
        tickets.push({
            title: 'Permiso carpeta compartida', description: 'Necesito acceso a la carpeta de Rendiciones.',
            status: 'EN_PROCESO', category: 'PERMISOS_USUARIOS', cola_atencion: 'SISTEMAS',
            dni_solicitante: '10222333', telefono_contacto: '11-1212-3434',
            created_by_user_id: normalUser.id, assigned_agent_id: deptUsers['SISTEMAS'].id
        });

        // 3.4 TESORERIA & SAF (Generic)
        tickets.push({
            title: 'Fondo Fijo', description: 'Solicitud de reposición de fondo fijo.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'OTHER', cola_atencion: 'TESORERIA',
            dni_solicitante: '40111222', telefono_contacto: '11-7777-6666', created_by_user_id: normalUser.id
        });
        tickets.push({
            title: 'Usuario bloqueado en SAF', description: 'No puedo operar, usuario bloqueado.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'OTHER', cola_atencion: 'SAF',
            dni_solicitante: '50111222', telefono_contacto: '11-0000-1111', created_by_user_id: normalUser.id
        });

        // Bulk Generation for Stats
        const possibleQueues = ['GASTOS_PERSONAL', 'CONTABILIDAD', 'SISTEMAS', 'TESORERIA', 'SAF', 'CONTRATACIONES'];
        const possibleCats = ['HABERES', 'VIATICOS', 'RECIBOS', 'OTHER', 'PERMISOS_USUARIOS'];

        for (let i = 0; i < 50; i++) {
            const q = possibleQueues[Math.floor(Math.random() * possibleQueues.length)];
            const s = Math.random() > 0.3 ? 'EN_COLA_DEPARTAMENTAL' : (Math.random() > 0.5 ? 'EN_PROCESO' : 'CERRADO');
            let assigned = null;
            if (s !== 'EN_COLA_DEPARTAMENTAL') assigned = deptUsers[q]?.id;

            tickets.push({
                title: `Ticket Auto #${i}`, description: 'Generado automáticamente.',
                status: s, category: possibleCats[Math.floor(Math.random() * possibleCats.length)],
                cola_atencion: q,
                dni_solicitante: `99${i}00`, telefono_contacto: '11-0000-0000',
                created_by_user_id: normalUser.id, assigned_agent_id: assigned,
                createdAt: new Date(new Date() - Math.floor(Math.random() * 10 * 24 * 60 * 60 * 1000))
            });
        }

        await Ticket.bulkCreate(tickets);
        console.log('✅ Tickets Realistas y Bulk Creados');

    } catch (error) {
        console.error('Seed Error:', error);
    }
};

