import express from 'express';
import { createReportLog, getReportLogs } from '../controllers/reportController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticateToken, createReportLog);
router.get('/', authenticateToken, getReportLogs);

export default router;
