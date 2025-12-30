import React from 'react';
import Card from '../components/ui/Card';
import { BarChart, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const ReportsPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Reportes de Gestión</h1>
                <div className="flex gap-2">
                    <select className="border border-gray-300 rounded-lg p-2 text-sm">
                        <option>Últimos 30 días</option>
                        <option>Este Año</option>
                    </select>
                    <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 border-l-4 border-blue-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Tickets</p>
                            <p className="text-2xl font-bold text-gray-800">1,245</p>
                        </div>
                        <BarChart className="text-blue-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-yellow-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Tiempo Promedio</p>
                            <p className="text-2xl font-bold text-gray-800">4.5 hrs</p>
                        </div>
                        <Clock className="text-yellow-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Satisfacción</p>
                            <p className="text-2xl font-bold text-gray-800">92%</p>
                        </div>
                        <CheckCircle className="text-green-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">SLA Vencido</p>
                            <p className="text-2xl font-bold text-gray-800">12</p>
                        </div>
                        <AlertTriangle className="text-red-100" size={32} />
                    </div>
                </Card>
            </div>

            {/* Charts Implementation (Simulated with Bars for MVP purely CSS/Taiwind) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h3 className="font-semibold mb-6">Volumen por Categoría</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Recibo de Haberes', width: '80%', count: 450 },
                            { label: 'Viáticos', width: '45%', count: 210 },
                            { label: 'Licencias Médicas', width: '30%', count: 120 },
                            { label: 'Soporte TI', width: '20%', count: 85 },
                            { label: 'Otros', width: '15%', count: 50 },
                        ].map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium">{item.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5">
                                    <div className="bg-cge-sidebar h-2.5 rounded-full" style={{ width: item.width }}></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-6">
                    <h3 className="font-semibold mb-6">Rendimiento por Agente</h3>
                    <div className="space-y-6">
                        {[
                            { name: 'Serrano (Agente)', solved: 145, open: 12 },
                            { name: 'Peralta (Soporte)', solved: 98, open: 5 },
                            { name: 'Gomez (RRHH)', solved: 210, open: 22 },
                        ].map((agent) => (
                            <div key={agent.name} className="flex items-center gap-4">
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                    {agent.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{agent.name}</p>
                                    <p className="text-xs text-gray-500">{agent.solved} resueltos</p>
                                </div>
                                <div className="text-right">
                                    <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">{agent.open} activos</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportsPage;
