
import sequelize from './src/config/db.js';

const fixTopicSchema = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log('🔄 Converting whatsapp_topic to VARCHAR...');

        // 1. Alter Column Type
        await sequelize.query('ALTER TABLE "Users" ALTER COLUMN "whatsapp_topic" TYPE VARCHAR(255) USING "whatsapp_topic"::VARCHAR;');

        // 2. Drop Enum Type (Cleanup)
        try {
            await sequelize.query('DROP TYPE IF EXISTS "enum_Users_whatsapp_topic";');
            console.log('✅ Enum type dropped.');
        } catch (e) {
            console.log('ℹ️ Type drop skipped/failed (non-critical):', e.message);
        }

        console.log('✅ Schema Fixed: whatsapp_topic is now VARCHAR.');

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixTopicSchema();
