import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Search, Plus, MessageCircle, Mail, Globe, ArrowUpDown } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => (
    <th className="p-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors" onClick={() => onSort(sortKey)}>
        <div className="flex items-center gap-1">
            {label}
            <ArrowUpDown size={14} className={`text-gray-400 ${sortConfig.key === sortKey ? 'text-cge-blue dark:text-blue-400' : ''}`} />
        </div>
    </th>
);

const TicketsPage = () => {
    const { token, user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });

    const fetchTickets = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        const formData = {
            title: e.target.title.value,
            description: e.target.description.value,
            // category: e.target.category.value, // Removed, assigned by AH
            // priority: e.target.priority.value, // Removed by User, handled by Backend
            dni_solicitante: e.target.dni.value,
            telefono_contacto: e.target.phone.value
        };

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowCreateModal(false);
                fetchTickets();
                e.target.reset();
            } else {
                alert('Indices del error al crear ticket');
            }
        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const getFilterMatch = (ticket, filter) => {
        if (filter === 'ALL') return true;

        switch (filter) {
            case 'OPEN':
                return ['PENDIENTE_VALIDACION', 'EN_COLA_DEPARTAMENTAL', 'RECHAZADO', 'OPEN'].includes(ticket.status);
            case 'IN_PROGRESS':
                return ['EN_PROCESO', 'IN_PROGRESS'].includes(ticket.status);
            case 'RESOLVED':
                return ['RESUELTO_TECNICO', 'CERRADO', 'RESOLVED'].includes(ticket.status);
            default:
                return false;
        }
    };

    const sortedTickets = [...tickets.filter(t => getFilterMatch(t, filterStatus))].sort((a, b) => {
        if (!a[sortConfig.key] || !b[sortConfig.key]) return 0;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Specific handling for 'solicitante' which is composite in UI but we sort by raw field
        if (sortConfig.key === 'solicitante') {
            aValue = a.solicitante_nombre_completo || a.creator?.name || '';
            bValue = b.solicitante_nombre_completo || b.creator?.name || '';
        }

        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Tickets de Soporte</h1>
                    <p className="text-gray-500 dark:text-gray-400">Gestión de reclamos e incidentes</p>
                </div>
                {user?.role !== 'MONITOR' && (
                    <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                        <Plus size={18} /> Nueva Consulta
                    </Button>
                )}
            </div>

            {/* Filters & Search */}
            <Card className="p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
                    <Search size={18} className="text-gray-400" />
                    <input type="text" placeholder="Buscar por ID, asunto o usuario..." className="outline-none text-sm w-full bg-transparent dark:text-white" />
                </div>

                <div className="flex gap-2 flex-wrap">
                    {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === status
                                ? 'bg-cge-sidebar text-white'
                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : <Badge variant={status} className="bg-transparent p-0 text-inherit">{status}</Badge>}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[800px]">
                        <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-slate-700">
                            <tr>
                                <SortableHeader label="ID" sortKey="id" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Asunto" sortKey="title" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Categoría" sortKey="category" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Solicitante" sortKey="solicitante" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Estado" sortKey="status" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Prioridad" sortKey="priority" sortConfig={sortConfig} onSort={handleSort} />
                                <SortableHeader label="Creado" sortKey="createdAt" sortConfig={sortConfig} onSort={handleSort} />
                                <th className="p-4">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {loading ? (
                                <tr><td colSpan="8" className="p-4 text-center text-gray-500 dark:text-gray-400">Cargando tickets...</td></tr>
                            ) : sortedTickets.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-4 font-mono text-gray-600 dark:text-blue-400">#{ticket.id}</td>
                                    <td className="p-4 font-medium text-gray-900 dark:text-white">{ticket.title}</td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400">{ticket.category}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-300">
                                        <div className="flex items-center gap-2">
                                            {ticket.channel === 'WHATSAPP' ? <MessageCircle size={14} className="text-green-600 dark:text-green-400" /> :
                                                (ticket.channel === 'EMAIL' ? <Mail size={14} className="text-blue-500 dark:text-blue-400" /> : <Globe size={14} className="text-gray-400 dark:text-gray-500" />)}
                                            <span className="truncate max-w-[150px]" title={ticket.solicitante_nombre_completo || ticket.creator?.name}>
                                                {ticket.solicitante_grado ? `${ticket.solicitante_grado} ` : ''}
                                                {ticket.solicitante_nombre_completo || ticket.creator?.name || 'Desconocido'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4"><Badge variant={ticket.status}>{ticket.status}</Badge></td>
                                    <td className="p-4"><Badge variant={ticket.priority}>{ticket.priority}</Badge></td>
                                    <td className="p-4 text-gray-500 dark:text-gray-400 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <Link to={`/tickets/${ticket.id}`}>
                                            <Button variant="secondary" className="text-xs px-2 py-1 dark:bg-slate-700 dark:text-white dark:hover:bg-slate-600">Ver Detalle</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {!loading && sortedTickets.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron tickets con este filtro.
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            {
                showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <Card className="w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                            <h2 className="text-xl font-bold mb-4">Nueva Consulta</h2>
                            <form onSubmit={handleCreateTicket} className="space-y-4">
                                <Input name="title" label="Asunto" required />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input name="dni" label="DNI Solicitante" placeholder="Ej: 12345678" required />
                                    <Input name="phone" label="Teléfono Contacto" placeholder="Ej: 11 1234-5678" required />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción Detallada</label>
                                    <textarea
                                        name="description"
                                        required
                                        rows="4"
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-cge-blue"
                                    ></textarea>
                                </div>

                                <div className="flex justify-end gap-2 mt-6">
                                    <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                                    <Button type="submit">Crear Ticket</Button>
                                </div>
                            </form>
                        </Card>
                    </div>
                )
            }
        </div >
    );
};

export default TicketsPage;
