import { Ticket, Message, User } from './src/models/index.js';
import { checkAndCloseExpiredTickets } from './src/services/cronService.js';
import sequelize from './src/config/db.js';

const testCron = async () => {
    try {
        console.log('🧪 Starting Final Verification...');

        // 0. FIX DB SCHEMA DRIFT (Missing columns & Enum)
        try {
            await sequelize.query(`ALTER TABLE "Tickets" ADD COLUMN IF NOT EXISTS "channel" VARCHAR(255) DEFAULT 'WEB';`);
            await sequelize.query(`ALTER TYPE "enum_Tickets_status" ADD VALUE IF NOT EXISTS 'CERRADO_TIMEOUT';`);
            console.log('✅ DB Schema/Enum patched.');
        } catch (dbError) {
            console.warn('⚠️ DB Patch Warning:', dbError.parent?.message || dbError.message);
        }

        // 1. Run the Logic
        console.log('🔄 Executing checkAndCloseExpiredTickets()...');
        await checkAndCloseExpiredTickets();

        // 2. Verify Ticket #32
        const ticket32 = await Ticket.findByPk(32);
        console.log(`🏁 Ticket #32 Status: ${ticket32?.status}`);

        if (ticket32 && ticket32.status === 'CERRADO_TIMEOUT') {
            console.log('✅ SUCCESS: Ticket #32 closed by cron logic.');
        } else {
            console.error('❌ FAILURE: Ticket #32 was NOT closed (Status: ' + ticket32?.status + ')');
        }

    } catch (error) {
        console.error('❌ Test Error Message:', error.message);
        if (error.sql) console.error('❌ SQL:', error.sql);
        console.error('❌ Error Details:', error);
    } finally {
        process.exit();
    }
};

testCron();
