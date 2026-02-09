import bcrypt from 'bcrypt';
import { User, Ticket } from './models/index.js';
import { faker } from '@faker-js/faker';

export const seedDatabase = async () => {
    try {
        const initialPassword = process.env.ADMIN_INITIAL_PASSWORD || '123456';
        const passwordHash = await bcrypt.hash(initialPassword, 10);

        console.log(`🔐 Seeding Users with Initial Password: ${initialPassword}`);

        // --- 1. CORE USERS (Fixed) ---
        // Admin
        const [admin] = await User.findOrCreate({
            where: { email: 'admin@cge.mil.ar' },
            defaults: { name: 'Admin CGE', password_hash: passwordHash, role: 'ADMIN', phone: '555-0000' }
        });

        // Monitor (Read Only)
        const [monitor] = await User.findOrCreate({
            where: { email: 'monitor@cge.mil.ar' },
            defaults: { name: 'Monitor CGE', password_hash: passwordHash, role: 'MONITOR', phone: '555-0911' }
        });

        // Hierarchy: Jefe (Chief) & Subdirector
        const [jefe] = await User.findOrCreate({
            where: { email: 'jefe@cge.mil.ar' },
            defaults: { name: 'Jefe Sistemas', password_hash: passwordHash, role: 'JEFE', phone: '555-JEFE', department: 'SISTEMAS' }
        });

        const [subdirector] = await User.findOrCreate({
            where: { email: 'subdirector@cge.mil.ar' },
            defaults: { name: 'Subdirector General', password_hash: passwordHash, role: 'SUBDIRECTOR', phone: '555-BOSS' }
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
                defaults: { name: dept.name, password_hash: passwordHash, role: 'TECHNICAL_SUPPORT', phone: '555-DEPT', department: dept.queue }
            });
            deptUsers[dept.queue] = user;
        }

        // Standard User (Juan Perez)
        const [normalUser] = await User.findOrCreate({
            where: { email: 'usuario@cge.mil.ar' },
            defaults: { name: 'Juan Pérez', password_hash: passwordHash, role: 'USER', phone: '555-USER' }
        });

        console.log('✅ Usuarios Principales Creados');

        // --- 2. GENERATE EXTRA USERS (Total ~150) ---
        const extraUsersCount = 135; // 150 total approx
        const extraUsers = [];

        console.log(`👤 Generando ${extraUsersCount} usuarios adicionales...`);
        for (let i = 0; i < extraUsersCount; i++) {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = faker.internet.email({ firstName, lastName }).toLowerCase();

            extraUsers.push({
                name: `${firstName} ${lastName}`,
                email: email,
                password_hash: passwordHash,
                role: 'USER',
                phone: faker.phone.number(),
                department: null
            });
        }

        // Bulk Create Extra Users (ignoring duplicates if any)
        await User.bulkCreate(extraUsers, { ignoreDuplicates: true });

        // Fetch all users to use for ticket creation
        const allUsers = await User.findAll({ where: { role: 'USER' } });
        console.log(`✅ Total Usuarios en DB: ${allUsers.length + 10}`); // Approx

        // --- 3. CLEAN UP TICKETS ---
        const { Message } = await import('./models/index.js');
        await Message.destroy({ where: {} });
        await Ticket.destroy({ where: {} });
        console.log('🧹 Tickets limpiados para regeneración');

        // --- 4. GENERATE REALISTIC TICKETS ---
        const tickets = [];

        // 3.4 TESORERIA & SAF (Generic)
        tickets.push({
            title: 'Fondo Fijo', description: 'Solicitud de reposición de fondo fijo.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'TESORERIA', cola_atencion: 'TESORERIA',
            dni_solicitante: '40111222', telefono_contacto: '11-7777-6666', created_by_user_id: normalUser.id,
            channel: 'WHATSAPP', solicitante_grado: 'MY', unidad_codigo: 'U2375', solicitante_nombre_completo: 'Mayor Ramirez'
        });
        tickets.push({
            title: 'Usuario bloqueado en SAF', description: 'No puedo operar, usuario bloqueado.',
            status: 'EN_COLA_DEPARTAMENTAL', category: 'SISTEMAS', cola_atencion: 'SAF',
            dni_solicitante: '50111222', telefono_contacto: '11-0000-1111', created_by_user_id: normalUser.id,
            channel: 'EMAIL', solicitante_grado: 'CT', unidad_codigo: 'U2375', solicitante_nombre_completo: 'Capitán Fernandez'
        });

        // Bulk Generation for Stats
        const ticketCount = 20;

        const possibleQueues = ['GASTOS_PERSONAL', 'CONTABILIDAD', 'SISTEMAS', 'TESORERIA', 'SAF', 'CONTRATACIONES'];

        // Revised Categories - No more 'OTHER'
        const possibleCats = [
            'HABERES', 'VIATICOS', 'RECIBOS',
            'FALLA_SERVIDOR', 'ERROR_VPN', 'PERMISOS_USUARIOS',
            'HARDWARE', 'SOFTWARE', 'ACCESO_REMOTO', 'IMPRESORAS', 'INTERNET'
        ];

        const possiblePriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
        const possibleStatuses = ['PENDIENTE_VALIDACION', 'EN_COLA_DEPARTAMENTAL', 'EN_PROCESO', 'RESUELTO_TECNICO', 'CERRADO', 'RECHAZADO'];
        const possibleGrades = ['SV', 'CB', 'CI', 'SG', 'SI', 'SA', 'SP', 'SM', 'ST', 'TT', 'TP', 'CT', 'MY', 'TC', 'CR', 'CY', 'GB', 'GD', 'TG'];
        const possibleUnits = ['U2375', 'U2287', 'U1101', 'U9999', 'U1000', 'U5555'];

        // Realistic Scenarios
        const scenarios = [
            { title: 'No puedo acceder al VPN', desc: 'Me da error de autenticación al intentar conectar desde casa.', cat: 'ERROR_VPN' },
            { title: 'Impresora trabada', desc: 'La impresora del piso 2 hace ruido y no imprime.', cat: 'IMPRESORAS' },
            { title: 'Outlook no conecta', desc: 'No me llegan los correos desde hace una hora.', cat: 'SOFTWARE' },
            { title: 'Pantalla azul', desc: 'Mi PC se reinició sola y mostró pantalla azul.', cat: 'HARDWARE' },
            { title: 'Solicitud de licencia Office', desc: 'Necesito activar el Office en la nueva notebook.', cat: 'SOFTWARE' },
            { title: 'Internet lento', desc: 'No puedo abrir páginas externas, la red está muy lenta.', cat: 'INTERNET' },
            { title: 'Carpeta compartida inaccesible', desc: 'Me pide credenciales para entrar a "Pública".', cat: 'PERMISOS_USUARIOS' },
            { title: 'Error en liquidación', desc: 'El monto de viáticos no coincide con lo declarado.', cat: 'VIATICOS' },
            { title: 'Recibo de sueldo no aparece', desc: 'Entro al portal y no veo el recibo de este mes.', cat: 'RECIBOS' },
            { title: 'Sistema SAF caído', desc: 'Error 504 Gateway Timeout al entrar al SAF.', cat: 'FALLA_SERVIDOR' }
        ];

        console.log(`🎫 Generando ${ticketCount} tickets...`);

        for (let i = 0; i < ticketCount; i++) {
            // Random dates in last 60 days
            const createdDate = faker.date.recent({ days: 60 });

            // Allow some tickets to be resolved later
            let status = faker.helpers.arrayElement(possibleStatuses);
            let closedDate = null;
            let rating = null;
            let assignedAgentId = null;

            // Pick a scenario or generate random
            const scenario = Math.random() > 0.3
                ? faker.helpers.arrayElement(scenarios)
                : {
                    title: faker.hacker.phrase(),
                    desc: faker.lorem.sentence(),
                    cat: faker.helpers.arrayElement(possibleCats)
                };

            // Logic for status consistency
            if (['RESUELTO_TECNICO', 'CERRADO'].includes(status)) {
                // Ensure resolved tickets have update date after create date
                const durationHours = faker.number.int({ min: 1, max: 120 }); // 1 hour to 5 days
                closedDate = new Date(createdDate.getTime() + durationHours * 60 * 60 * 1000);

                // Assign to a dept agent
                const q = faker.helpers.arrayElement(possibleQueues);
                assignedAgentId = deptUsers[q]?.id;

                // Add rating for closed tickets
                if (status === 'CERRADO') {
                    rating = faker.number.int({ min: 1, max: 5 });
                }
            } else if (status === 'EN_PROCESO') {
                const q = faker.helpers.arrayElement(possibleQueues);
                assignedAgentId = deptUsers[q]?.id;
            }

            // Creator
            const creator = faker.helpers.arrayElement(allUsers);

            tickets.push({
                title: scenario.title,
                description: scenario.desc,
                status: status,
                priority: faker.helpers.arrayElement(possiblePriorities),
                category: scenario.cat,
                cola_atencion: faker.helpers.arrayElement(possibleQueues),

                // Requester Info (Mocked from User or explicit)
                dni_solicitante: faker.number.int({ min: 20000000, max: 45000000 }).toString(),
                telefono_contacto: faker.phone.number(),

                solicitante_grado: faker.helpers.arrayElement(possibleGrades),
                unidad_codigo: faker.helpers.arrayElement(possibleUnits),
                solicitante_nombre_completo: creator?.name || faker.person.fullName(),
                solicitante_email: creator?.email || faker.internet.email(),

                channel: faker.helpers.arrayElement(['WHATSAPP', 'WEB', 'EMAIL']),

                created_by_user_id: creator?.id || normalUser.id,
                assigned_agent_id: assignedAgentId,
                rating_score: rating,

                createdAt: createdDate,
                updatedAt: closedDate || createdDate // Sequelize handles createdAt automatically usually, but we overwrite for history
            });
        }

        // Iterative Creation for better debugging
        console.log(`🚀 Starting Iterative Insert for ${tickets.length} tickets...`);
        let successCount = 0;

        for (const t of tickets) {
            try {
                await Ticket.create(t);
                successCount++;
                if (successCount % 5 === 0) console.log(`   ... inserted ${successCount}`);
            } catch (err) {
                console.error(`❌ FAILED to insert ticket "${t.title}":`, err.message);
                // console.error(err); // Too verbose
            }
        }

        console.log(`✅ Seed Completed. Success: ${successCount}/${tickets.length}`);

        const verifyCount = await Ticket.count();
        console.log(`🔍 VERIFICACIÓN POST-SEED: ${verifyCount} tickets en DB`);

    } catch (error) {
        console.error('Seed Error:', error);
        throw error;
    }
};
