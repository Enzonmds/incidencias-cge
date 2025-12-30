import { Ticket, User } from '../models/index.js';
import { Op } from 'sequelize';

export const checkSLA = async () => {
    console.log('⏰ Running SLA Check...');
    try {
        const now = new Date();

        // 1. PENDIENTE_VALIDACION > 4 Hours -> HIGH Priority
        const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000);
        const pendingTickets = await Ticket.findAll({
            where: {
                status: 'PENDIENTE_VALIDACION',
                priority: { [Op.ne]: 'HIGH' }, // Not already HIGH (or Critical)
                createdAt: { [Op.lt]: fourHoursAgo }
            }
        });

        for (const ticket of pendingTickets) {
            console.log(`⚠️ SLA Breach (L1): Ticket #${ticket.id} is pending > 4h. Escalating to HIGH.`);
            ticket.priority = 'HIGH';
            await ticket.save();
        }

        // 2. EN_COLA_DEPARTAMENTAL > 24 Hours -> CRITICAL Priority
        const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
        const queueTickets = await Ticket.findAll({
            where: {
                status: 'EN_COLA_DEPARTAMENTAL',
                priority: { [Op.ne]: 'CRITICAL' },
                createdAt: { [Op.lt]: twentyFourHoursAgo }
            }
        });

        for (const ticket of queueTickets) {
            console.log(`⚠️ SLA Breach (L2): Ticket #${ticket.id} in queue > 24h. Escalating to CRITICAL.`);
            ticket.priority = 'CRITICAL';
            await ticket.save();
        }

        // 3. EN_PROCESO > 48 Hours -> Log Warning (Critical)
        const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000);
        const stuckTickets = await Ticket.findAll({
            where: {
                status: 'EN_PROCESO',
                priority: { [Op.ne]: 'CRITICAL' },
                createdAt: { [Op.lt]: fortyEightHoursAgo }
            }
        });

        for (const ticket of stuckTickets) {
            console.log(`⚠️ SLA Breach (L3): Ticket #${ticket.id} in progress > 48h. Marking CRITICAL.`);
            ticket.priority = 'CRITICAL';
            await ticket.save();
        }

    } catch (error) {
        console.error('❌ SLA Check Error:', error);
    }
};
