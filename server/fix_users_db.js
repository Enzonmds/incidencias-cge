
import sequelize from './src/config/db.js';

const fixDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        // 1. Remove Duplicates
        console.log('🧹 Removing duplicates...');
        await sequelize.query(`
            DELETE FROM "Users" a USING "Users" b
            WHERE a.id < b.id AND a.phone = b.phone;
        `);
        console.log('✅ Duplicates removed.');

        // 2. Add Constraint
        console.log('🔒 Adding UNIQUE constraint...');
        try {
            await sequelize.query(`
                ALTER TABLE "Users" ADD CONSTRAINT unique_phone_user UNIQUE (phone);
            `);
            console.log('✅ Constraint added.');
        } catch (error) {
            if (error.original && error.original.code === '42710') {
                console.log('ℹ️ Constraint already exists.');
            } else {
                throw error;
            }
        }

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixDatabase();
