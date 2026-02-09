import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    dni: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        },
    },
    password_hash: {
        type: DataTypes.STRING,
        allowNull: true, // Allow for invited users pending setup
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'AGENT', 'USER', 'HUMAN_ATTENTION', 'TECHNICAL_SUPPORT', 'MONITOR', 'JEFE', 'SUBDIRECTOR', 'GUEST'),
        defaultValue: 'USER',
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true, // Used for WhatsApp mapping
        unique: true,
    },

    department: {
        type: DataTypes.STRING,
        allowNull: true,
        // E.g., 'SISTEMAS', 'TESORERIA', 'SAF', etc.
    },

    // --- WhatsApp Bot State Machine ---
    whatsapp_step: {
        type: DataTypes.ENUM('MENU', 'WAITING_DNI', 'WAITING_EMAIL', 'WAITING_SELECTION', 'WAITING_LOGIN', 'WAITING_TOPIC', 'WAITING_DESCRIPTION', 'ACTIVE_SESSION', 'GUEST_FLOW', 'WAITING_RATING', 'WAITING_RAG_CONFIRMATION', 'WAITING_MENU_SELECTION'),
        defaultValue: 'MENU',
    },
    whatsapp_temp_role: {
        type: DataTypes.STRING, // 'CIVIL', 'ENTIDAD', 'NO_REGISTRADO', etc.
        allowNull: true,
    },
    whatsapp_topic: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    whatsapp_buffer: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
});

export default User;
