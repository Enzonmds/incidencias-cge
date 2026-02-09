
import Queue from 'bull';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
    }
};

export const messageQueue = new Queue('whatsapp-messages', redisConfig);

messageQueue.on('error', (error) => {
    console.error('Redis Queue Error:', error);
});

console.log('Redis Queue initialized');
