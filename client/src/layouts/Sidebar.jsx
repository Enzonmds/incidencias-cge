import React, { useContext } from 'react';
import { LayoutDashboard, Ticket, Users, FileText, LogOut, CheckSquare, Wrench } from 'lucide-react';
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

const Sidebar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const hasRole = (roles) => roles.includes(user?.role);

    return (
        <aside className="w-64 bg-cge-sidebar text-white h-screen fixed left-0 top-0 flex flex-col shadow-xl z-50">
            <div className="p-6 border-b border-white border-opacity-10">
                <h1 className="text-2xl font-bold tracking-tight">Incidencias CGE</h1>
                <p className="text-xs text-gray-300 mt-1">
                    {user?.name || 'Usuario'} ({user?.role})
                </p>
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

                {(hasRole(['ADMIN', 'AGENT', 'HUMAN_ATTENTION'])) && (
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
    );
};

export default Sidebar;
