import sequelize from './src/config/db.js';

const addDniColumn = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        await sequelize.query('ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "dni" VARCHAR(255);');
        console.log('Added dni column.');

        // Adding unique constraint separately to avoid fail if column existed but not unique
        try {
            await sequelize.query('ALTER TABLE "Users" ADD CONSTRAINT "Users_dni_key" UNIQUE ("dni");');
            console.log('Added unique constraint.');
        } catch (e) {
            console.log('Constraint might already exist:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

addDniColumn();
