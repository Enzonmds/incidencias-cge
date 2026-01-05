import sequelize from './src/config/db.js';

const patchDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected.');

        // 1. Add Column
        try {
            await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "whatsapp_topic" VARCHAR(255);');
            console.log('Added whatsapp_topic column.');
        } catch (e) {
            console.log('Column add error (maybe exists):', e.message);
        }

        // 2. Update Enum
        try {
            await sequelize.query("ALTER TYPE \"enum_Users_whatsapp_step\" ADD VALUE 'WAITING_TOPIC';");
            console.log('Added WAITING_TOPIC to ENUM.');
        } catch (e) {
            console.log('Enum add error (maybe exists):', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

patchDB();
