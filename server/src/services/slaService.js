import { Ticket, User } from '../models/index.js';
import { Op } from 'sequelize';
import sequelize from '../config/db.js';
import { sendSLABreachNotification } from './emailService.js';

export const checkSLA = async () => {
    console.log('⏰ Running SLA Check...');
    try {
        const now = new Date();
        const FIVE_MIN = 5 * 60 * 1000;
        const TEN_MIN = 10 * 60 * 1000;
        const TWENTY_MIN = 20 * 60 * 1000;

        // ---------------------------------------------
        // 1. UNASSIGNED TICKETS (5 min)
        // ---------------------------------------------

        // Stage 1: Warning (5 min) -> Notify Mesa
        const unassignedWarning = await Ticket.findAll({
            where: {
                status: 'PENDIENTE_VALIDACION',
                assigned_agent_id: null,
                sla_stage: 0,
                createdAt: { [Op.lt]: new Date(now - FIVE_MIN) }
            },
            include: [{ model: User, as: 'creator' }]
        });

        for (const ticket of unassignedWarning) {
            console.log(`⚠️ SLA Warn: Ticket #${ticket.id} unassigned > 5m. Notifying Mesa.`);
            sendSLABreachNotification(ticket, 'UNASSIGNED', 1).catch(e => console.error(e));
            ticket.sla_stage = 1;
            await ticket.save();
        }

        // Stage 2: Breach (10 min or 5 min after warning) -> Notify Subdirector
        const unassignedBreach = await Ticket.findAll({
            where: {
                status: 'PENDIENTE_VALIDACION',
                assigned_agent_id: null,
                sla_stage: 1,
                createdAt: { [Op.lt]: new Date(now - TEN_MIN) }
            },
            include: [{ model: User, as: 'creator' }]
        });

        for (const ticket of unassignedBreach) {
            console.log(`🚨 SLA BREACH: Ticket #${ticket.id} unassigned > 10m. ESCALATING TO SUBDIRECTOR.`);
            sendSLABreachNotification(ticket, 'UNASSIGNED', 2).catch(e => console.error(e));
            ticket.priority = 'CRITICAL';
            ticket.sla_stage = 2; // Breach
            await ticket.save();
        }

        // ---------------------------------------------
        // 2. AGENT RESPONSE DELAY (10 min)
        // ---------------------------------------------

        // A. Initial Response Delay (assigned_at vs last_agent_response_at)
        // Stage 1: Warning (10 min without response)
        const noResponseWarning = await Ticket.findAll({
            where: {
                assigned_agent_id: { [Op.ne]: null },
                last_agent_response_at: null,
                sla_stage: 0,
                assigned_at: { [Op.lt]: new Date(now - TEN_MIN) } // Assigned > 10m ago
            },
            include: [{ model: User, as: 'assignee' }, { model: User, as: 'creator' }]
        });

        // B. Thread Delay (last_user_message vs last_agent_response)
        // Stage 1: Warning (10 min after user msg)
        const slowResponseWarning = await Ticket.findAll({
            where: {
                status: 'EN_PROCESO',
                assigned_agent_id: { [Op.ne]: null },
                sla_stage: { [Op.ne]: 1 }, // Not already warned
                last_agent_response_at: { [Op.ne]: null }, // Has responded before
                last_user_message_at: {
                    [Op.gt]: sequelize.col('last_agent_response_at'), // User spoke last
                    [Op.lt]: new Date(now - TEN_MIN) // User spoke > 10m ago
                }
            },
            include: [{ model: User, as: 'assignee' }, { model: User, as: 'creator' }]
        });

        // Unified Warning Loop
        for (const ticket of [...noResponseWarning, ...slowResponseWarning]) {
            if (ticket.sla_stage === 1) continue; // Skip if already warned
            console.log(`⚠️ SLA Warn: Agent ${ticket.assignee?.name} slow on #${ticket.id}. Notifying Mesa.`);
            sendSLABreachNotification(ticket, 'NO_RESPONSE', 1).catch(e => console.error(e));
            ticket.sla_stage = 1;
            await ticket.save();
        }

        // Stage 2: Breach (20 min Total or 10 min after warning)
        // Checking for extreme delays
        const responseBreach = await Ticket.findAll({
            where: {
                assigned_agent_id: { [Op.ne]: null },
                sla_stage: 1,
                [Op.or]: [
                    {
                        last_agent_response_at: null,
                        assigned_at: { [Op.lt]: new Date(now - TWENTY_MIN) }
                    },
                    {
                        status: 'EN_PROCESO',
                        last_user_message_at: { [Op.lt]: new Date(now - TWENTY_MIN) },
                        // Ensuring user spoke last is implied if we are in stage 1 and still no response
                    }
                ]
            },
            include: [{ model: User, as: 'assignee' }, { model: User, as: 'creator' }]
        });

        for (const ticket of responseBreach) {
            console.log(`🚨 SLA BREACH: Agent ${ticket.assignee?.name} ignored #${ticket.id} > 20m. ESCALATING TO SUBDIRECTOR.`);
            sendSLABreachNotification(ticket, 'NO_RESPONSE', 2).catch(e => console.error(e));
            ticket.priority = 'CRITICAL';
            ticket.sla_stage = 2;
            await ticket.save();
        }

    } catch (error) {
        console.error('❌ SLA Check Error:', error);
    }
};
