import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Search, Filter, Plus } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TicketsPage = () => {
    const { token } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);

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
    }, [token]);

    const handleCreateTicket = async (e) => {
        e.preventDefault();
        const formData = {
            title: e.target.title.value,
            description: e.target.description.value,
            // category: e.target.category.value, // Removed, assigned by AH
            priority: e.target.priority.value,
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

    const filteredTickets = tickets.filter(t => getFilterMatch(t, filterStatus));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tickets de Soporte</h1>
                    <p className="text-gray-500">Gestión de reclamos e incidentes</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                    <Plus size={18} /> Nuevo Reclamo
                </Button>
            </div>

            {/* Filters & Search */}
            <Card className="p-4 flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 border border-gray-200 rounded-lg px-3 py-2">
                    <Search size={18} className="text-gray-400" />
                    <input type="text" placeholder="Buscar por ID, asunto o usuario..." className="outline-none text-sm w-full" />
                </div>

                <div className="flex gap-2">
                    {['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterStatus === status
                                ? 'bg-cge-sidebar text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {status === 'ALL' ? 'Todos' : <Badge variant={status} className="bg-transparent p-0 text-inherit">{status}</Badge>}
                        </button>
                    ))}
                </div>
            </Card>

            {/* Table */}
            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="p-4">ID</th>
                            <th className="p-4">Asunto</th>
                            <th className="p-4">Categoría</th>
                            <th className="p-4">Solicitante</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Prioridad</th>
                            <th className="p-4">Creado</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="8" className="p-4 text-center">Cargando tickets...</td></tr>
                        ) : filteredTickets.map((ticket) => (
                            <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-mono text-gray-600">#{ticket.id}</td>
                                <td className="p-4 font-medium text-gray-900">{ticket.title}</td>
                                <td className="p-4 text-gray-500">{ticket.category}</td>
                                <td className="p-4 text-gray-600">{ticket.creator?.name || 'Desconocido'}</td>
                                <td className="p-4"><Badge variant={ticket.status}>{ticket.status}</Badge></td>
                                <td className="p-4"><Badge variant={ticket.priority}>{ticket.priority}</Badge></td>
                                <td className="p-4 text-gray-500 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                <td className="p-4">
                                    <Link to={`/tickets/${ticket.id}`}>
                                        <Button variant="secondary" className="text-xs px-2 py-1">Ver Detalle</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filteredTickets.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron tickets con este filtro.
                    </div>
                )}
            </Card>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-[500px] p-6">
                        <h2 className="text-xl font-bold mb-4">Nuevo Reclamo</h2>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <Input name="title" label="Asunto" required />

                            <div className="grid grid-cols-2 gap-4">
                                <Input name="dni" label="DNI Solicitante" placeholder="Ej: 12345678" required />
                                <Input name="phone" label="Teléfono Contacto" placeholder="Ej: 11 1234-5678" required />
                            </div>

                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad (Inicial)</label>
                                    <select name="priority" className="w-full border border-gray-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-cge-blue">
                                        <option value="LOW">Baja</option>
                                        <option value="MEDIUM" selected>Media</option>
                                        <option value="HIGH">Alta</option>
                                        <option value="CRITICAL">Crítica</option>
                                    </select>
                                </div>
                                <div className="flex-1 flex items-center">
                                    <p className="text-xs text-gray-400 mt-4 italic">* La categoría será asignada durante la validación.</p>
                                </div>
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
            )}
        </div>
    );
};

export default TicketsPage;
