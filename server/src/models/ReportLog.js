import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const ReportLog = sequelize.define('ReportLog', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    reference_code: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    generated_by_user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('EXCEL', 'PRINT', 'PDF'),
        allowNull: false
    },
    filters_snapshot: {
        type: DataTypes.JSONB,
        allowNull: true
    }
}, {
    tableName: 'report_logs',
    timestamps: true
});

export default ReportLog;
