
import sequelize from './src/config/db.js';

const fixStepEnum = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log('🔄 Adding WAITING_MENU_SELECTION to enum_Users_whatsapp_step...');

        // Postgres method to add value to ENUM
        // ALTER TYPE "enum_Users_whatsapp_step" ADD VALUE 'WAITING_MENU_SELECTION';

        try {
            await sequelize.query("ALTER TYPE \"enum_Users_whatsapp_step\" ADD VALUE 'WAITING_MENU_SELECTION';");
            console.log('✅ Enum value added.');
        } catch (e) {
            console.log('ℹ️ Expected error if already exists or type issue:', e.message);

            // Fallback: If it fails (e.g. inside transaction block or other reason), 
            // we might need to convert to VARCHAR temporarily or drop/recreate.
            // But usually ADD VALUE works fine in PG 12+.

            // If it complains about "unsafe to add value inside transaction", we can't easily fix it via Sequelize without `transaction: false`.
            // But let's try.
        }

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixStepEnum();
