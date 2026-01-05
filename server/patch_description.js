import sequelize from './src/config/db.js';

const patchDescriptionEnum = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ DB Connected');

        await sequelize.query(`ALTER TYPE "enum_Users_whatsapp_step" ADD VALUE 'WAITING_DESCRIPTION';`);

        console.log('✅ Added WAITING_DESCRIPTION to enum_Users_whatsapp_step');
    } catch (error) {
        console.error('Error patching DB:', error);
    } finally {
        process.exit();
    }
};

patchDescriptionEnum();
