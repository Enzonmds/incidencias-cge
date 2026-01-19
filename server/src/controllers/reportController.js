import { ReportLog, User } from '../models/index.js';

export const createReportLog = async (req, res) => {
    try {
        const { reference_code, type, filters } = req.body;
        const userId = req.user.id;

        const log = await ReportLog.create({
            reference_code,
            generated_by_user_id: userId,
            type,
            filters_snapshot: filters
        });

        res.status(201).json(log);
    } catch (error) {
        console.error('Create Report Log Error:', error);
        res.status(500).json({ message: 'Error creating log' });
    }
};

export const getReportLogs = async (req, res) => {
    try {
        const logs = await ReportLog.findAll({
            include: [{
                model: User,
                as: 'generator',
                attributes: ['name', 'email']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        res.json(logs);
    } catch (error) {
        console.error('Get Report Logs Error:', error);
        res.status(500).json({ message: 'Error fetching logs' });
    }
};
