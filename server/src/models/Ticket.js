import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Ticket = sequelize.define('Ticket', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    status: {
        type: DataTypes.ENUM('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED'),
        defaultValue: 'OPEN',
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'MEDIUM',
    },
    // Foreign keys created by associations
});

export default Ticket;
