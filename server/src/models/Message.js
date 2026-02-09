import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    sender_type: {
        type: DataTypes.ENUM('USER', 'AGENT', 'BOT', 'SYSTEM'),
        allowNull: false,
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    // --- Internal Notes & Media ---
    is_internal: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    media_url: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    media_type: {
        type: DataTypes.STRING, // 'image', 'document', 'audio'
        allowNull: true,
    },
    // Foreign keys created by associations
});

export default Message;
