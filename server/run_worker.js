import { startWorker } from './src/workers/whatsappWorker.js';
import dotenv from 'dotenv';
dotenv.config();

console.log('Starting local worker...');
startWorker();
