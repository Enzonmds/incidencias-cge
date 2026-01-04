import React from 'react';

const variants = {
    // Priorities
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-gray-100 text-gray-800',

    // Statuses
    OPEN: 'bg-blue-100 text-blue-800',
    PENDIENTE_VALIDACION: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
    EN_COLA_DEPARTAMENTAL: 'bg-blue-100 text-blue-700 border border-blue-200',
    EN_PROCESO: 'bg-purple-100 text-purple-700 border border-purple-200',
    IN_PROGRESS: 'bg-purple-100 text-purple-700 border border-purple-200',
    WAITING_USER: 'bg-indigo-100 text-indigo-700',
    RESUELTO_TECNICO: 'bg-teal-100 text-teal-800 border border-teal-200',
    RESOLVED: 'bg-green-100 text-green-700 border border-green-200',
    CERRADO: 'bg-gray-100 text-gray-600 border border-gray-200',
    CLOSED: 'bg-gray-100 text-gray-600 border border-gray-200',
    RECHAZADO: 'bg-red-100 text-red-700 border border-red-200'
};

const translations = {
    // Priorities
    CRITICAL: 'CRÍTICA',
    HIGH: 'ALTA',
    MEDIUM: 'MEDIA',
    LOW: 'BAJA',

    // Statuses
    OPEN: 'ABIERTO',
    PENDIENTE_VALIDACION: 'VALIDACIÓN',
    EN_COLA_DEPARTAMENTAL: 'EN COLA DEPT',
    EN_PROCESO: 'EN PROCESO',
    IN_PROGRESS: 'EN PROCESO',
    WAITING_USER: 'ESPERANDO USUARIO',
    RESUELTO_TECNICO: 'RESUELTO TÉC.',
    RESOLVED: 'RESUELTO',
    CERRADO: 'CERRADO',
    CLOSED: 'CERRADO',
    RECHAZADO: 'RECHAZADO'
};

const Badge = ({ children, variant = 'LOW', className = '' }) => {
    return (
        <span
            className={`px-2 py-1 rounded-full text-xs font-semibold ${variants[variant] || 'bg-gray-100 text-gray-800'} ${className}`}
        >
            {translations[children] || children}
        </span>
    );
};

export default Badge;
