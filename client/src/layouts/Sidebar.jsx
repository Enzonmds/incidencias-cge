import React, { useContext } from 'react';
import { LayoutDashboard, Ticket, Users, FileText, LogOut, CheckSquare, Wrench, Activity } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const NavItem = ({ to, icon: Icon, children }) => {
    return (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive ? 'bg-white bg-opacity-10 text-white' : 'text-gray-300 hover:bg-white hover:bg-opacity-5 hover:text-white'
                }`
            }
        >
            <Icon size={20} />
            <span className="font-medium">{children}</span>
        </NavLink>
    );
};

const Sidebar = ({ isOpen, onClose }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const hasRole = (roles) => roles.includes(user?.role);

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-cge-sidebar text-white shadow-xl transition-transform duration-300 ease-in-out transform 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>

                <div className="p-6 border-b border-white border-opacity-10 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Incidencias CGE</h1>
                        <p className="text-xs text-gray-300 mt-1">
                            {user?.name || 'Usuario'} ({user?.role})
                        </p>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="md:hidden text-gray-300 hover:text-white">
                        <LogOut size={20} className="transform rotate-180" /> {/* Using LogOut icon as X placeholder or just X if preferred, let's use a simple SVG or icon if available. simpler: just text X for now or generic icon if imports allow. Let's use LogOut rotated or just a span X */}
                        <span className="sr-only">Cerrar</span>
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    <NavItem to="/" icon={LayoutDashboard}>Dashboard</NavItem>

                    <NavItem to="/tickets" icon={Ticket}>Tickets</NavItem>

                    {(hasRole(['ADMIN', 'HUMAN_ATTENTION'])) && (
                        <NavItem to="/triage" icon={CheckSquare}>Triaje</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'TECHNICAL_SUPPORT'])) && (
                        <NavItem to="/support" icon={Wrench}>Soporte Técnico</NavItem>
                    )}

                    {(hasRole(['ADMIN'])) && (
                        <NavItem to="/users" icon={Users}>Usuarios</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'MONITOR', 'JEFE', 'SUBDIRECTOR'])) && (
                        <NavItem to="/system-flow" icon={Activity}>Flujo del Sistema</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'AGENT', 'HUMAN_ATTENTION', 'MONITOR', 'JEFE', 'SUBDIRECTOR'])) && (
                        <NavItem to="/reports" icon={FileText}>Reportes</NavItem>
                    )}
                </nav>

                <div className="p-4 border-t border-white border-opacity-10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-300 hover:bg-white hover:bg-opacity-5 hover:text-red-200 rounded-lg transition-colors mt-2"
                    >
                        <LogOut size={20} />
                        <span className="font-medium">Cerrar Sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
