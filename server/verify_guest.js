import { User, Ticket } from './src/models/index.js';
import { processMessage } from './src/services/chatbotService.js';
import sequelize from './src/config/db.js';

const verifyBuffer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        const testPhone = '5491100000000';

        // 1. Reset User
        await Ticket.destroy({ where: { dni_solicitante: '123456' } });
        await User.destroy({ where: { phone: testPhone } });

        console.log('✨ Creating GUEST User...');
        let user = await User.create({
            name: 'Test Buffer',
            phone: testPhone,
            role: 'GUEST',
            whatsapp_step: 'MENU',
            email: `${testPhone}@test.com`
        });

        // 2. Send "Cold Start" Message (Context)
        console.log('🗣️ Sending Context Message...');
        await processMessage(user, "No me anda la impresora", testPhone);

        // Reload user to check buffer
        user = await User.findByPk(user.id);
        console.log(`📋 Buffer Status: "${user.whatsapp_buffer}" (Expected: "No me anda la impresora")`);

        // 3. Send DNI (Advance Flow)
        console.log('🆔 Sending DNI...');
        await processMessage(user, "123456", testPhone);

        // 4. Send Topic Selection
        console.log('📂 Selecting Topic...');
        user = await User.findByPk(user.id); // Reload state
        await processMessage(user, "4", testPhone); // "Datos Personales" -> IVR -> 4 -> Description

        // 5. Send Description (Ticket Creation)
        console.log('📝 Sending Final Description...');
        user = await User.findByPk(user.id);
        await processMessage(user, "Solicito cambio de domicilio", testPhone);

        // 6. Verify Ticket
        const ticket = await Ticket.findOne({
            where: { dni_solicitante: '123456' },
            order: [['createdAt', 'DESC']]
        });

        if (ticket) {
            console.log('✅ Ticket Created!');
            console.log('📜 Final Description:', ticket.description);
            if (ticket.description.includes('[CONTEXTO ORIGINAL]: No me anda la impresora')) {
                console.log('🎉 SUCCESS: Context appended correctly!');
            } else {
                console.error('❌ FAILURE: Context missing.');
            }
        } else {
            console.error('❌ FAILURE: Ticket not found.');
        }

    } catch (error) {
        console.error('❌ Error during verify:', error);
    } finally {
        await sequelize.close();
    }
};

verifyBuffer();
