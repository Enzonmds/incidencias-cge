
import sequelize from './src/config/db.js';

const addBufferColumn = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log('🔄 Adding whatsapp_buffer column...');
        try {
            await sequelize.query(`ALTER TABLE "Users" ADD COLUMN "whatsapp_buffer" TEXT;`);
            console.log('✅ Column added.');
        } catch (error) {
            console.log('ℹ️ Error (maybe already exists):', error.message);
        }

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

addBufferColumn();
