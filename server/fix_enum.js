import sequelize from './src/config/db.js';

const fixEnum = async () => {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB.');

        // Postgres command to add value to ENUM type
        // Note: This cannot be run inside a transaction block usually, but query() might wrap it.
        // We catch error in case it already exists.
        try {
            await sequelize.query("ALTER TYPE \"enum_Users_whatsapp_step\" ADD VALUE 'WAITING_DNI';");
            console.log('Added WAITING_DNI to ENUM.');
        } catch (e) {
            console.log('ENUM value might already exist:', e.message);
        }

        console.log('Done.');
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

fixEnum();
