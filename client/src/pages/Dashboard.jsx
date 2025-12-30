import React from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';

const Dashboard = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
                <Button>+ Nuevo Reclamo</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Abiertos', count: 12, color: 'text-blue-600' },
                    { label: 'En Progreso', count: 5, color: 'text-cge-yellow' },
                    { label: 'Pendientes', count: 3, color: 'text-purple-600' },
                    { label: 'Resueltos', count: 45, color: 'text-green-600' },
                ].map((stat) => (
                    <Card key={stat.label} className="flex flex-col items-center justify-center p-4">
                        <span className={`text-3xl font-bold ${stat.color}`}>{stat.count}</span>
                        <span className="text-sm text-gray-500 mt-1">{stat.label}</span>
                    </Card>
                ))}
            </div>

            <Card>
                <h2 className="text-lg font-semibold mb-4">Tickets Recientes</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-sm text-gray-500">
                                <th className="pb-3 font-medium">ID</th>
                                <th className="pb-3 font-medium">Asunto</th>
                                <th className="pb-3 font-medium">Estado</th>
                                <th className="pb-3 font-medium">Prioridad</th>
                                <th className="pb-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {[
                                { id: '2045', title: 'Problema visualización Recibo de Haberes', status: 'OPEN', priority: 'HIGH' },
                                { id: '2044', title: 'Error carga de Viáticos - Unidad Logística', status: 'IN_PROGRESS', priority: 'CRITICAL' },
                                { id: '2043', title: 'Descuento incorrecto Mutual Círculo', status: 'WAITING_USER', priority: 'MEDIUM' },
                            ].map((ticket) => (
                                <tr key={ticket.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 text-gray-600">#{ticket.id}</td>
                                    <td className="py-3 font-medium text-gray-800">{ticket.title}</td>
                                    <td className="py-3"><Badge variant={ticket.status}>{ticket.status}</Badge></td>
                                    <td className="py-3"><Badge variant={ticket.priority}>{ticket.priority}</Badge></td>
                                    <td className="py-3">
                                        <Link to={`/tickets/${ticket.id}`} className="inline-block">
                                            <Button variant="secondary" className="text-xs px-2 py-1">Ver</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
