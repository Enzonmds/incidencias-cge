
import sequelize from './src/config/db.js';

const fixCategorySchema = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to DB.');

        console.log('🔄 Converting "category" and "cola_atencion" to VARCHAR to support AI outputs...');

        // 1. Alter Ticket Category to VARCHAR (Removing Enum Constraint)
        await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "category" TYPE VARCHAR(255) USING "category"::VARCHAR;');

        // 2. Drop Enum Type for Category
        try {
            await sequelize.query('DROP TYPE IF EXISTS "enum_Tickets_category";');
            console.log('✅ Category Enum type dropped.');
        } catch (e) {
            console.log('ℹ️ Category drop skipped/failed:', e.message);
        }

        // 3. Ensure cola_atencion is also strict or varchar (Already String in model, ensuring DB matches)
        // It is likely VARCHAR already, but let's be safe.
        await sequelize.query('ALTER TABLE "Tickets" ALTER COLUMN "cola_atencion" TYPE VARCHAR(255);');

        console.log('✅ Schema Fixed: Ticket.category is now VARCHAR.');

    } catch (error) {
        console.error('❌ Error during fix:', error);
    } finally {
        await sequelize.close();
    }
};

fixCategorySchema();
