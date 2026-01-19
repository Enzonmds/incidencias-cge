
import sequelize from './src/config/db.js';
import { User, Ticket } from './src/models/index.js';
import { Op } from 'sequelize';

const verify = async () => {
    try {
        await sequelize.authenticate();

        const user = await User.findOne({ where: { phone: '5491171483037' } });
        if (!user) { console.log('❌ User not found.'); return; }

        console.log(`👤 User Step: ${user.whatsapp_step}`);

        // Check for tickets created in the last 30 seconds by this user
        const recentTicket = await Ticket.findOne({
            where: {
                created_by_user_id: user.id,
                createdAt: { [Op.gt]: new Date(Date.now() - 30000) } // Last 30s
            }
        });

        if (recentTicket) {
            console.log(`❌ FAIL: New Ticket Created: #${recentTicket.id} - ${recentTicket.description}`);
        } else {
            console.log('✅ PASS: No new ticket created (RAG Intercepted).');
        }

        if (user.whatsapp_step === 'WAITING_RAG_CONFIRMATION') {
            console.log('✅ PASS: User State is WAITING_RAG_CONFIRMATION.');
        } else {
            console.log(`❌ FAIL: User State is ${user.whatsapp_step} (Expected: WAITING_RAG_CONFIRMATION).`);
        }

    } catch (e) { console.error(e); }
    finally { await sequelize.close(); }
};

verify();
