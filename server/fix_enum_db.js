
import sequelize from './src/config/db.js';

const fixEnum = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        // Add GUEST to enum
        console.log('🔄 Altering Enum type...');
        try {
            await sequelize.query(`ALTER TYPE "enum_Users_role" ADD VALUE 'GUEST';`);
            console.log('✅ Enum updated: GUEST added.');
        } catch (error) {
            console.log('ℹ️ Error (maybe already exists):', error.message);
        }

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixEnum();
