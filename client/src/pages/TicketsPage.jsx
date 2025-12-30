import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Search, Filter, Plus } from 'lucide-react';

const TicketsPage = () => {
    // Mock Data (Expanded)
    const [tickets] = useState([
        { id: '2045', title: 'Problema visualización Recibo de Haberes', status: 'OPEN', priority: 'HIGH', user: 'Capitan Gutierrez', updated: 'hace 30 min' },
        { id: '2044', title: 'Error carga de Viáticos - Unidad Logística', status: 'IN_PROGRESS', priority: 'CRITICAL', user: 'Sargento Mendez', updated: 'hace 2 horas' },
        { id: '2043', title: 'Descuento incorrecto Mutual Círculo', status: 'WAITING_USER', priority: 'MEDIUM', user: 'Suboficial Perez', updated: 'hace 1 día' },
        { id: '2042', title: 'Solicitud licencia médica', status: 'RESOLVED', priority: 'LOW', user: 'Cabo Primero Diaz', updated: 'hace 2 días' },
        { id: '2041', title: 'Falla acceso Intranet', status: 'RESOLVED', priority: 'HIGH', user: 'Teniente Lopez', updated: 'hace 3 días' },
    ]);

    const [filterStatus, setFilterStatus] = useState('ALL');

    const filteredTickets = filterStatus === 'ALL'
        ? tickets
        : tickets.filter(t => t.status === filterStatus);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Tickets de Soporte</h1>
                    <p className="text-gray-500">Gestión de reclamos e incidentes</p>
                </div>
                <Button className="flex items-center gap-2">
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
                            <th className="p-4">Solicitante</th>
                            <th className="p-4">Estado</th>
                            <th className="p-4">Prioridad</th>
                            <th className="p-4">Última Act.</th>
                            <th className="p-4">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTickets.map((ticket) => (
                            <tr key={ticket.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                <td className="p-4 font-mono text-gray-600">#{ticket.id}</td>
                                <td className="p-4 font-medium text-gray-900">{ticket.title}</td>
                                <td className="p-4 text-gray-600">{ticket.user}</td>
                                <td className="p-4"><Badge variant={ticket.status}>{ticket.status}</Badge></td>
                                <td className="p-4"><Badge variant={ticket.priority}>{ticket.priority}</Badge></td>
                                <td className="p-4 text-gray-500 text-xs">{ticket.updated}</td>
                                <td className="p-4">
                                    <Link to={`/tickets/${ticket.id}`}>
                                        <Button variant="secondary" className="text-xs px-2 py-1">Ver Detalle</Button>
                                    </Link>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTickets.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No se encontraron tickets con este filtro.
                    </div>
                )}
            </Card>
        </div>
    );
};

export default TicketsPage;
