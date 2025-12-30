import React from 'react';

const variants = {
    OPEN: 'bg-blue-100 text-blue-800',
    IN_PROGRESS: 'bg-cge-yellow text-white',
    WAITING_USER: 'bg-purple-100 text-purple-800',
    RESOLVED: 'bg-green-100 text-green-800',
    CRITICAL: 'bg-cge-red text-white',
    HIGH: 'bg-orange-100 text-orange-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    LOW: 'bg-gray-100 text-gray-800'
};

const translations = {
    OPEN: 'ABIERTO',
    IN_PROGRESS: 'EN PROGRESO',
    WAITING_USER: 'ESPERANDO USUARIO',
    RESOLVED: 'RESUELTO',
    CRITICAL: 'CRÍTICA',
    HIGH: 'ALTA',
    MEDIUM: 'MEDIA',
    LOW: 'BAJA'
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
