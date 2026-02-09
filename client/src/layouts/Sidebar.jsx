import React, { useContext } from 'react';
import { LayoutDashboard, Ticket, Users, FileText, LogOut, CheckSquare, Wrench, Activity, X } from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import logo from '../assets/logo_cge.png';

const NavItem = ({ to, icon: Icon, children, onClick }) => {
    return (
        <NavLink
            to={to}
            onClick={onClick}
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

            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-cge-sidebar to-[#7A3E31] dark:from-slate-900 dark:to-slate-800 text-white shadow-2xl transition-transform duration-300 ease-in-out transform 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col border-r dark:border-dark-border`}>

                <div className="p-6 border-b border-white border-opacity-10 flex justify-between items-center bg-black/10">
                    <div className="flex items-center gap-3 min-w-0">
                        <img src={logo} alt="CGE" className="w-10 h-10 object-contain drop-shadow-md" />
                        <div className="min-w-0">
                            <h1 className="text-lg font-bold tracking-tight truncate">Consultas CGE</h1>
                            <p className="text-xs text-gray-300 truncate opacity-80">
                                {user?.name || 'Usuario'}
                            </p>
                        </div>
                    </div>
                    {/* Close button for mobile */}
                    <button onClick={onClose} className="md:hidden text-gray-300 hover:text-white p-1 hover:bg-white/10 rounded-lg transition-colors">
                        <X size={24} />
                        <span className="sr-only">Cerrar</span>
                    </button>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {!hasRole(['USER']) && (
                        <NavItem to="/" icon={LayoutDashboard} onClick={onClose}>Dashboard</NavItem>
                    )}

                    <NavItem to="/tickets" icon={Ticket} onClick={onClose}>Tickets</NavItem>

                    {(hasRole(['ADMIN', 'HUMAN_ATTENTION', 'SUBDIRECTOR'])) && (
                        <NavItem to="/triage" icon={CheckSquare} onClick={onClose}>Coordinación</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'TECHNICAL_SUPPORT', 'JEFE', 'SUBDIRECTOR'])) && (
                        <NavItem to="/support" icon={Wrench} onClick={onClose}>Soporte Técnico</NavItem>
                    )}

                    {(hasRole(['ADMIN'])) && (
                        <NavItem to="/users" icon={Users} onClick={onClose}>Usuarios</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'MONITOR', 'JEFE', 'SUBDIRECTOR'])) && (
                        <NavItem to="/system-flow" icon={Activity} onClick={onClose}>Flujo del Sistema</NavItem>
                    )}

                    {(hasRole(['ADMIN', 'AGENT', 'HUMAN_ATTENTION', 'MONITOR', 'JEFE', 'SUBDIRECTOR'])) && (
                        <NavItem to="/reports" icon={FileText} onClick={onClose}>Reportes</NavItem>
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
