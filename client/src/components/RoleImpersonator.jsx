import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Users, Shield, RefreshCw } from 'lucide-react';

const RoleImpersonator = () => {
    const { user, impersonateRole, stopImpersonation } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    // Only show for real ADMINs (check originalRole if currently impersonating, or current role if not)
    const isAdmin = (user?.originalRole || user?.role) === 'ADMIN';

    if (!user || !isAdmin) return null;

    const roles = [
        { id: 'ADMIN', label: 'Administrador' },
        { id: 'HUMAN_ATTENTION', label: 'Coordinación' },
        { id: 'TECHNICAL_SUPPORT', label: 'Soporte Técnico' },
        { id: 'USER', label: 'Usuario Final' }
    ];

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all 
                ${user.originalRole ? 'bg-amber-500 hover:bg-amber-600 animate-pulse' : 'bg-gray-800 hover:bg-gray-700'} text-white`}
                title="Modo Impersonación"
            >
                <Users size={24} />
            </button>
        );
    }

    // Assuming handleImpersonate and isLoading are defined elsewhere or will be added by the user.
    // For this change, we'll just insert the buttons as requested.
    const handleImpersonate = (roleId) => impersonateRole(roleId);
    const isLoading = false; // Placeholder

    const currentRole = user.role;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 w-64 animate-in slide-in-from-bottom-5">
            <div className="flex justify-between items-center mb-3 border-b pb-2">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <Shield size={16} className="text-cge-blue" />
                    Rol Sender
                </h3>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>

            {/* Hierarchy Roles */}
            <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-2 mt-4">Jerarquía</h4>
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => handleImpersonate('JEFE')} // Removed 'Jefe Sistemas' as it's not used by impersonateRole
                    disabled={isLoading}
                    className={`p-2 text-xs rounded border transition-colors ${currentRole === 'JEFE'
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-slate-800 text-purple-400 border-purple-900/30 hover:bg-slate-700'
                        }`}
                >
                    Jefe (Sistemas)
                </button>
                <button
                    onClick={() => handleImpersonate('SUBDIRECTOR')} // Removed 'Subdirector Gral' as it's not used by impersonateRole
                    disabled={isLoading}
                    className={`p-2 text-xs rounded border transition-colors ${currentRole === 'SUBDIRECTOR'
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-slate-800 text-red-400 border-red-900/30 hover:bg-slate-700'
                        }`}
                >
                    Subdirector
                </button>
            </div>

            <h4 className="text-gray-400 text-xs uppercase tracking-wide mb-2 mt-4">Otros</h4>

            <div className="space-y-2">
                {roles.map(role => (
                    <button
                        key={role.id}
                        onClick={() => impersonateRole(role.id)}
                        className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between
                        ${user.role === role.id ? 'bg-blue-100 text-blue-700 font-bold' : 'hover:bg-gray-50 text-gray-600'}`}
                    >
                        {role.label}
                        {user.role === role.id && <span className="text-xs">●</span>}
                    </button>
                ))}
            </div>

            {user.originalRole && (
                <div className="mt-3 pt-3 border-t">
                    <button
                        onClick={stopImpersonation}
                        className="w-full bg-red-50 text-red-600 hover:bg-red-100 px-3 py-2 rounded text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={14} /> Restaurar Admin
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoleImpersonator;
