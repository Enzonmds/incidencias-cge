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
        allowNull: false,
    },
    role: {
        type: DataTypes.ENUM('ADMIN', 'AGENT', 'USER', 'HUMAN_ATTENTION', 'TECHNICAL_SUPPORT', 'MONITOR', 'JEFE', 'SUBDIRECTOR'),
        defaultValue: 'USER',
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true, // Used for WhatsApp mapping
    },

    department: {
        type: DataTypes.STRING,
        allowNull: true,
        // E.g., 'SISTEMAS', 'TESORERIA', 'SAF', etc.
    },

    // --- WhatsApp Bot State Machine ---
    whatsapp_step: {
        type: DataTypes.ENUM('MENU', 'WAITING_SELECTION', 'WAITING_LOGIN', 'ACTIVE_SESSION', 'GUEST_FLOW'),
        defaultValue: 'MENU',
    },
    whatsapp_temp_role: {
        type: DataTypes.STRING, // 'CIVIL', 'ENTIDAD', 'NO_REGISTRADO', etc.
        allowNull: true,
    },
});

export default User;
