
import sequelize from './src/config/db.js';
import { Ticket, User } from './src/models/index.js';
import { checkSLA } from './src/services/slaService.js';

const runVerify = async () => {
    try {
        await sequelize.authenticate();

        // Cleanup old test tickets
        await Ticket.destroy({ where: { title: 'SLA TEST' } });

        const user = await User.findOne();
        const agent = await User.findOne({ where: { role: 'TECHNICAL_SUPPORT' } }) || user;

        const now = new Date();
        const sixMinAgo = new Date(now - 6 * 60 * 1000);
        const fifteenMinAgo = new Date(now - 15 * 60 * 1000);
        const twentyFiveMinAgo = new Date(now - 25 * 60 * 1000);

        console.log('🧪 Creating Test Tickets...');

        // 1. Unassigned Warning (5m+)
        const t1 = await Ticket.create({
            title: 'SLA TEST', description: 'Unassigned Warn',
            priority: 'MEDIUM', status: 'PENDIENTE_VALIDACION',
            created_by_user_id: user.id,
            createdAt: sixMinAgo, sla_stage: 0
        });

        // 2. Unassigned Breach (10m+ & Stage 1)
        const t2 = await Ticket.create({
            title: 'SLA TEST', description: 'Unassigned Breach',
            priority: 'MEDIUM', status: 'PENDIENTE_VALIDACION',
            created_by_user_id: user.id,
            createdAt: fifteenMinAgo, sla_stage: 1
        });

        // 3. No Response Warning (10m+)
        const t3 = await Ticket.create({
            title: 'SLA TEST', description: 'No Response Warn',
            priority: 'MEDIUM', status: 'EN_PROCESO',
            created_by_user_id: user.id,
            assigned_agent_id: agent.id,
            assigned_at: fifteenMinAgo, // Assigned 15m ago
            last_agent_response_at: null,
            sla_stage: 0
        });

        // 4. No Response Breach (20m+ & Stage 1)
        const t4 = await Ticket.create({
            title: 'SLA TEST', description: 'No Response Breach',
            priority: 'MEDIUM', status: 'EN_PROCESO',
            created_by_user_id: user.id,
            assigned_agent_id: agent.id,
            assigned_at: twentyFiveMinAgo, // Assigned 25m ago
            last_agent_response_at: null,
            sla_stage: 1
        });

        console.log('🔎 Running SLA Service Check...');
        await checkSLA();

        console.log('📊 Verifying Results...');
        await t1.reload(); await t2.reload(); await t3.reload(); await t4.reload();

        console.log(`Ticket 1 (Unassigned > 5m): Stage ${t1.sla_stage} (Expect 1)`);
        console.log(`Ticket 2 (Unassigned > 10m): Stage ${t2.sla_stage} (Expect 2) [Critical? ${t2.priority}]`);
        console.log(`Ticket 3 (No Response > 10m): Stage ${t3.sla_stage} (Expect 1)`);
        console.log(`Ticket 4 (No Response > 20m): Stage ${t4.sla_stage} (Expect 2) [Critical? ${t4.priority}]`);

    } catch (e) {
        console.error(e);
    }
};

runVerify();
