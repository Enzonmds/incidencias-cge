
import { predictQueue } from './src/services/aiService.js';

const verifyAI = async () => {
    console.log('🧪 Testing AI Service...');

    try {
        const text = "No me anda la impresora en el primer piso";
        console.log(`🗣️ Input: "${text}"`);

        const start = Date.now();
        const queue = await predictQueue(text);
        const duration = Date.now() - start;

        console.log(`✅ Result: ${queue}`);
        console.log(`⏱️ Duration: ${duration}ms`);

        if (queue === 'OTHER') {
            console.log('⚠️ Result is OTHER (Could be fallback or low confidence)');
        } else {
            console.log('🎉 AI Classification working!');
        }

    } catch (error) {
        console.error('❌ Critical Failure in Test Script:', error);
    }
};

verifyAI();
