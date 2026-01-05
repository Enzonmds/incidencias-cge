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
        type: DataTypes.ENUM('PENDIENTE_VALIDACION', 'RECHAZADO', 'EN_COLA_DEPARTAMENTAL', 'EN_PROCESO', 'RESUELTO_TECNICO', 'CERRADO', 'OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED'), // Keeping old ones for backward compatibility during migration if needed, or just replace. I will replace but keep old ones if DB has them to avoid crash on startup. Actually, better to just define the new ones and let alter handle it.
        defaultValue: 'PENDIENTE_VALIDACION',
    },
    dni_solicitante: {
        type: DataTypes.STRING,
        allowNull: true, // Optional for existing, mandatory for new logic
    },
    telefono_contacto: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    cola_atencion: { // Using string for Queue/Department to simplify MVP
        type: DataTypes.STRING,
        allowNull: true,
    },
    priority: {
        type: DataTypes.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        defaultValue: 'MEDIUM',
    },
    // WhatsApp / External Sources Fields
    solicitante_grado: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    unidad_codigo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    solicitante_nombre_completo: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    solicitante_email: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    channel: {
        type: DataTypes.ENUM('WEB', 'WHATSAPP', 'EMAIL'),
        defaultValue: 'WEB',
    },

    category: {
        type: DataTypes.ENUM(
            'HABERES', 'ENTIDADES', 'DESCUENTOS', // Gastos en Personal
            'VIATICOS', // Contabilidad
            'PERMISOS_USUARIOS', 'RECIBOS', 'ERRORES_SISTEMA', 'HARDWARE', // Sistemas
            'OTHER'
        ),
        defaultValue: 'OTHER',
    },

    // --- Strict SLA Tracking ---
    assigned_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_agent_response_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    last_user_message_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    sla_stage: {
        type: DataTypes.INTEGER, // 0=None, 1=Warning (Mesa), 2=Breach (Subdirector)
        defaultValue: 0,
    },

    // --- Rating System ---
    rating_score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 1, max: 5 }
    },
    rating_feedback: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    // Foreign keys created by associations
});

export default Ticket;
