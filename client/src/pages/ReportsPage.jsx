import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { BarChart, Clock, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import logo from '../assets/logo_cge.png';

const ReportsPage = () => {
    const { token } = useContext(AuthContext);
    const [stats, setStats] = useState({
        total: 0,
        avgTime: '0 hrs', // Placeholder logic for now as we don't track time yet
        satisfaction: '100%', // Placeholder
        slaBreached: 0,
        byCategory: [],
        byAgent: []
    });
    const [reportLogs, setReportLogs] = useState([]);

    const fetchReportLogs = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setReportLogs(await response.json());
            }
        } catch (error) {
            console.error('Error fetching report logs:', error);
        }
    };

    const [tickets, setTickets] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTickets(data);

                    // Calculate KPIs
                    const total = data.length;
                    let totalScore = 0;
                    let ratedTicketsCount = 0;
                    let slaBreachedCount = 0; // If tracking SLA

                    // Group by Category
                    const categoryCount = data.reduce((acc, t) => {
                        const cat = t.category || 'OTHER';
                        acc[cat] = (acc[cat] || 0) + 1;
                        return acc;
                    }, {});

                    const byCategory = Object.keys(categoryCount).map(key => ({
                        label: key,
                        count: categoryCount[key],
                        width: `${(categoryCount[key] / total) * 100}%`
                    })).sort((a, b) => b.count - a.count);

                    // Group by Agent (Assignee)
                    const agentStats = {};

                    data.forEach(t => {
                        // SLA Check (Mock logic or use existing field if available, currently mocked)
                        // if (t.sla_breached) slaBreachedCount++;

                        // Global Rating
                        if (t.rating_score && t.rating_score > 0) {
                            totalScore += t.rating_score;
                            ratedTicketsCount++;
                        }

                        if (t.assignee) {
                            const name = t.assignee.name;
                            if (!agentStats[name]) {
                                agentStats[name] = { solved: 0, open: 0, totalRating: 0, ratingCount: 0 };
                            }

                            if (['RESUELTO_TECNICO', 'CERRADO', 'RESOLVED'].includes(t.status)) {
                                agentStats[name].solved++;
                            } else {
                                agentStats[name].open++;
                            }

                            if (t.rating_score && t.rating_score > 0) {
                                agentStats[name].totalRating += t.rating_score;
                                agentStats[name].ratingCount++;
                            }
                        }
                    });

                    const byAgent = Object.keys(agentStats).map(name => {
                        const stat = agentStats[name];
                        const avgResponse = stat.ratingCount > 0 ? (stat.totalRating / stat.ratingCount).toFixed(1) : 'N/A';
                        return {
                            name,
                            solved: stat.solved,
                            open: stat.open,
                            avgRating: avgResponse,
                            ratingCount: stat.ratingCount
                        };
                    });

                    const globalAvg = ratedTicketsCount > 0 ? (totalScore / ratedTicketsCount).toFixed(1) : 0;
                    const satisfactionPercentage = globalAvg > 0 ? Math.round((globalAvg / 5) * 100) : 100;

                    setStats({
                        total,
                        avgTime: '2.5 hrs', // Mocked for MVP
                        satisfaction: `${globalAvg > 0 ? globalAvg : '-'} / 5 (${satisfactionPercentage}%)`,
                        slaBreached: slaBreachedCount,
                        byCategory,
                        byAgent
                    });
                }
            } catch (error) {
                console.error('Error fetching report data:', error);
            }
        };

        if (token) {
            fetchReportLogs();
            fetchData();
        }
    }, [token]);

    const handleExportExcel = async () => {
        if (!tickets.length) return;

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const randomCode = Math.floor(1000 + Math.random() * 9000);
        const refCode = `REP-${dateStr}-${randomCode}`;

        // 1. Log to Backend
        try {
            await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    reference_code: refCode,
                    type: 'EXCEL',
                    filters: { total_tickets: tickets.length }
                })
            });
            fetchReportLogs(); // Refresh history
        } catch (error) {
            console.error('Failed to log report:', error);
        }

        // 2. Generate Excel
        const dataToExport = tickets.map(t => ({
            Referencia_Reporte: refCode,
            ID: t.id,
            Asunto: t.title,
            Categoría: t.category,
            Estado: t.status,
            Prioridad: t.priority,
            Solicitante: t.creator?.name || 'Desconocido',
            Asignado: t.assignee?.name || 'Sin Asignar',
            Fecha_Creación: new Date(t.createdAt).toLocaleDateString() + ' ' + new Date(t.createdAt).toLocaleTimeString()
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
        XLSX.writeFile(wb, `Reporte_Tickets_${refCode}.xlsx`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 print:space-y-4">
            {/* ... (Keep Header, KPI Cards, Charts) */}

            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-800">Reportes de Gestión</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2">
                        <Download size={16} /> Exportar Excel (.xlsx)
                    </Button>
                    <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                        <FileText size={16} /> Imprimir / PDF
                    </Button>
                </div>
            </div>

            {/* Print Header */}
            <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Reporte de Incidencias CGE</h1>
                <p className="text-gray-500">Generado el {new Date().toLocaleDateString()}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 print:grid-cols-4">
                <Card className="p-4 border-l-4 border-blue-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Total Tickets</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
                        </div>
                        <BarChart className="text-blue-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-yellow-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Tiempo Promedio</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.avgTime}</p>
                        </div>
                        <Clock className="text-yellow-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-green-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Satisfacción</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.satisfaction}</p>
                        </div>
                        <CheckCircle className="text-green-100" size={32} />
                    </div>
                </Card>
                <Card className="p-4 border-l-4 border-red-500">
                    <div className="flex justify-between">
                        <div>
                            <p className="text-sm text-gray-500">SLA Vencido</p>
                            <p className="text-2xl font-bold text-gray-800">{stats.slaBreached}</p>
                        </div>
                        <AlertTriangle className="text-red-100" size={32} />
                    </div>
                </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                <Card className="p-6 break-inside-avoid">
                    <h3 className="font-semibold mb-6">Volumen por Categoría</h3>
                    <div className="space-y-4">
                        {stats.byCategory.length > 0 ? stats.byCategory.map((item) => (
                            <div key={item.label}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-600">{item.label}</span>
                                    <span className="font-medium">{item.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2.5 print:border print:border-gray-200">
                                    <div className="bg-cge-sidebar h-2.5 rounded-full print:bg-gray-800" style={{ width: item.width }}></div>
                                </div>
                            </div>
                        )) : <div className="text-gray-500 text-sm">No hay datos suficientes</div>}
                    </div>
                </Card>

                <Card className="p-6 break-inside-avoid">
                    <h3 className="font-semibold mb-6">Rendimiento por Agente</h3>
                    <div className="space-y-6">
                        {stats.byAgent.length > 0 ? stats.byAgent.map((agent) => (
                            <div key={agent.name} className="flex items-center gap-4 border-b border-gray-50 last:border-0 pb-3 last:pb-0">
                                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold print:border print:border-gray-300">
                                    {agent.name.charAt(0)}
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-800">{agent.name}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">{agent.solved} resueltos</span>
                                        <span className="text-xs text-gray-500">{agent.open} activos</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    {agent.avgRating !== 'N/A' ? (
                                        <div className="flex flex-col items-end">
                                            <div className="flex items-center gap-1 text-yellow-500">
                                                <span className="text-sm font-bold">{agent.avgRating}</span>
                                                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" /></svg>
                                            </div>
                                            <span className="text-[10px] text-gray-400">({agent.ratingCount} calif.)</span>
                                        </div>
                                    ) : (
                                        <span className="text-xs text-gray-400 italic">Sin calif.</span>
                                    )}
                                </div>
                            </div>
                        )) : <div className="text-gray-500 text-sm">No hay datos de agentes</div>}
                    </div>
                </Card>
            </div>

            {/* History Table */}
            <div className="print:hidden mt-8">
                <h2 className="text-lg font-bold text-gray-800 mb-4">Historial de Reportes Generados</h2>
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                                <tr>
                                    <th className="p-4">Código Referencia</th>
                                    <th className="p-4">Generado Por</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Fecha</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportLogs.length === 0 ? (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay reportes generados recientemente.</td></tr>
                                ) : reportLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-50">
                                        <td className="p-4 font-mono font-medium text-cge-blue">{log.reference_code}</td>
                                        <td className="p-4">{log.generator?.name || 'Desconocido'}</td>
                                        <td className="p-4"><Badge variant="secondary">{log.type}</Badge></td>
                                        <td className="p-4 text-gray-500">{new Date(log.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default ReportsPage;
