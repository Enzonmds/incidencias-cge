
import sequelize from './src/config/db.js';

const fixMessageEnum = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        // Add SYSTEM to enum
        console.log('🔄 Altering Message Enum type...');
        try {
            await sequelize.query(`ALTER TYPE "enum_Messages_sender_type" ADD VALUE 'SYSTEM';`);
            console.log('✅ Enum updated: SYSTEM added.');
        } catch (error) {
            console.log('ℹ️ Error (maybe already exists):', error.message);
        }

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixMessageEnum();
