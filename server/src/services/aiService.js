import { pipeline } from '@xenova/transformers';

// Singleton instance to prevent reloading the model on every request
let classifier = null;

const QUEUE_DEFINITIONS = [
    { label: 'Soporte Técnico Hardware, Software, WiFi, Impresoras y Redes', value: 'SISTEMAS' },
    { label: 'Liquidación de Haberes, Sueldos, Descuentos y Recibos', value: 'HABERES' },
    { label: 'Pagos de Tesorería, Fondos y Transferencias', value: 'TESORERIA' },
    { label: 'Gastos de Personal, Viáticos y Movilidad', value: 'GASTOS_PERSONAL' },
    { label: 'Servicio Administrativo Financiero y Presupuesto (SAF)', value: 'SAF' },
    { label: 'Contabilidad, Balances y Asientos Contables', value: 'CONTABILIDAD' },
    { label: 'Contrataciones, Compras y Licitaciones', value: 'CONTRATACIONES' }
];

export const predictQueue = async (text) => {
    try {
        if (!classifier) {
            console.log('🤖 Loading AI Model (Zero-Shot)... This may take a moment.');
            // Using a public model that doesn't require Auth to avoid 401 errors
            // Was: 'Xenova/mDeBERTa-v3-base-mnli-xnli' (Requires Token sometimes)
            // Now: 'Xenova/distilbert-base-cipher-mnli' (Public)
            const modelName = process.env.AI_MODEL_NAME || 'Xenova/distilbert-base-uncased-mnli';

            classifier = await pipeline('zero-shot-classification', modelName, {
                options: {
                    use_auth_token: process.env.HF_TOKEN || false
                }
            });
        }

        const candidateLabels = QUEUE_DEFINITIONS.map(q => q.label);

        // Run classification
        const result = await classifier(text, candidateLabels);

        // result = { sequence: '...', labels: [...], scores: [...] }
        // Get the top label
        const topLabel = result.labels[0];
        const topScore = result.scores[0];

        // Find the mapped value
        const matchedQueue = QUEUE_DEFINITIONS.find(q => q.label === topLabel);

        console.log(`🤖 AI Prediction: "${text}" -> [${topLabel}] (Confidence: ${(topScore * 100).toFixed(2)}%)`);

        // If confidence is too low (e.g. < 20%), maybe default to something else? 
        // For now, we trust the top result or default to 'SISTEMAS' if really unsure
        if (topScore < 0.20) {
            console.log('⚠️ Low confidence, defaulting to OTHER (Needs Triage)');
            return 'OTHER';
        }

        return matchedQueue ? matchedQueue.value : 'OTHER';

    } catch (error) {
        console.error('❌ AI Service Error:', error);
        return 'OTHER'; // Fallback
    }
};
