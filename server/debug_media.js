
import { Message } from './src/models/index.js';
import fs from 'fs';
import path from 'path';
import sequelize from './src/config/db.js';

const run = async () => {
    try {
        await sequelize.authenticate();

        // Find last message with media
        const msg = await Message.findOne({
            where: {
                content: { [sequelize.Sequelize.Op.like]: '%[MEDIA_URL]%' }
            },
            order: [['createdAt', 'DESC']]
        });

        if (!msg) {
            console.log('❌ No media messages found.');
            return;
        }

        console.log('📄 Message Content:', msg.content);

        const url = msg.content.replace('[MEDIA_URL]:', '').trim();
        console.log('🔗 URL:', url);

        const filename = url.split('/').pop();
        console.log('📂 Filename:', filename);

        const localPath = path.join(process.cwd(), 'public', 'uploads', filename);
        console.log('📍 Expected Local Path:', localPath);

        if (fs.existsSync(localPath)) {
            console.log('✅ File EXISTS locally.');
            const stats = fs.statSync(localPath);
            console.log('   Size:', stats.size, 'bytes');
        } else {
            console.log('❌ File does NOT exist locally.');

            // List dir to see what IS there
            const dir = path.join(process.cwd(), 'public', 'uploads');
            if (fs.existsSync(dir)) {
                console.log('📂 Directory listing:');
                fs.readdirSync(dir).forEach(f => console.log('   -', f));
            } else {
                console.log('❌ Uploads directory does not exist.');
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
};

run();
