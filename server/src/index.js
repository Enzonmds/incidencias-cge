import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import sequelize from './config/db.js';
import { User, Ticket, Message } from './models/index.js';
import authRoutes from './routes/authRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
import userRoutes from './routes/userRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import { seedDatabase } from './seed.js';

import { checkSLA } from './services/slaService.js';
import { initializeKnowledgeBase } from './services/knowledgeService.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('public/uploads'));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/reports', reportRoutes);

// Health Check
app.get('/', (req, res) => {
    res.send('Incidencias CGE API is running');
});

// Sync Database and Start Server
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection has been established successfully.');

        // Sync models (force: false ensures we don't drop tables on restart)
        // In production, use migrations instead of sync
        await sequelize.sync({ alter: true });
        console.log('Database connected and synced');

        // await seedDatabase();

        // Initialize RAG (Embeddings)
        await initializeKnowledgeBase();

        // Start SLA Monitor
        setInterval(() => {
            checkSLA();
        }, 60000); // Check every minute

        // Run once immediately on startup for demo
        checkSLA();

        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

startServer();
