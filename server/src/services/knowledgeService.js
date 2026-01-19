
import { pipeline } from '@xenova/transformers';
import fs from 'fs';
import path from 'path';

let extractor = null;
let knowledgeBase = [];
const KB_PATH = path.join(process.cwd(), 'src', 'data', 'knowledge_base.json');

// Cosine Similarity Helper
const cosineSimilarity = (vecA, vecB) => {
    const dotProduct = vecA.reduce((sum, val, i) => sum + val * vecB[i], 0);
    const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0));
    const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magA * magB);
};

export const initializeKnowledgeBase = async () => {
    try {
        if (!extractor) {
            console.log('📚 Loading Embedding Model (This may take a moment)...');
            extractor = await pipeline('feature-extraction', 'Xenova/paraphrase-multilingual-MiniLM-L12-v2');
        }

        if (fs.existsSync(KB_PATH)) {
            const rawData = fs.readFileSync(KB_PATH, 'utf-8');
            knowledgeBase = JSON.parse(rawData);
            console.log(`📚 Knowledge Base Loaded: ${knowledgeBase.length} entries.`);

            // Pre-calculate embeddings if missing (On first run or update)
            let updated = false;
            for (const entry of knowledgeBase) {
                if (!entry.vector) {
                    console.log(`🧠 Generating embedding for: "${entry.question}"`);
                    const output = await extractor(entry.question, { pooling: 'mean', normalize: true });
                    entry.vector = Array.from(output.data);
                    updated = true;
                }
            }

            if (updated) {
                fs.writeFileSync(KB_PATH, JSON.stringify(knowledgeBase, null, 2));
                console.log('💾 Knowledge Base updated with new embeddings.');
            }
        } else {
            console.warn('⚠️ No Knowledge Base file found at:', KB_PATH);
            knowledgeBase = [];
        }

    } catch (error) {
        console.error('❌ Error initializing Knowledge Base:', error);
    }
};

export const searchKnowledge = async (query) => {
    if (!extractor || knowledgeBase.length === 0) return null;

    try {
        // Embed the query
        const output = await extractor(query, { pooling: 'mean', normalize: true });
        const queryVector = Array.from(output.data);

        // Find best match
        let bestMatch = null;
        let highestScore = -1;

        for (const entry of knowledgeBase) {
            if (!entry.vector) continue;
            const score = cosineSimilarity(queryVector, entry.vector);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = entry;
            }
        }

        console.log(`🔍 RAG Search: "${query}" -> Best: "${bestMatch?.question}" (${(highestScore * 100).toFixed(2)}%)`);

        // Threshold: 0.60 is safe for this model
        if (highestScore > 0.60) {
            return { ...bestMatch, score: highestScore };
        }

        return null;

    } catch (error) {
        console.error('❌ RAG Search Error:', error);
        return null;
    }
};
