import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { BarChart as BarChartIcon, Clock, CheckCircle, AlertTriangle, FileText, Download } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const CATEGORY_LABELS = {
    'HABERES': 'Haberes / Cobro',
    'VIATICOS': 'Viáticos',
    'RECIBOS': 'Recibos de Sueldo',
    'FALLA_SERVIDOR': 'Falla de Servidor',
    'ERROR_VPN': 'Error de VPN',
    'PERMISOS_USUARIOS': 'Gestión de Usuarios',
    'HARDWARE': 'Hardware / PC',
    'SOFTWARE': 'Software / Office',
    'ACCESO_REMOTO': 'Acceso Remoto',
    'IMPRESORAS': 'Impresoras',
    'INTERNET': 'Conectividad / Internet',
    'TESORERIA': 'Tesorería',
    'SISTEMAS': 'Sistemas General',
    'OTHER': 'Otros'
};

const ReportsPage = () => {
    const { token } = useContext(AuthContext);
    const [dateRange, setDateRange] = useState('LAST_30_DAYS');
    const [reportData, setReportData] = useState({
        kpis: {
            totalTickets: 0,
            avgTime: '0 hrs',
            satisfaction: '100%',
            slaBreached: 0
        },
        byStatus: [],
        byPriority: [],
        tableData: []
    });
    const [reportLogs, setReportLogs] = useState([]);
    const [tickets, setTickets] = useState([]);

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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTickets(data);

                    // --- KPI Calculations ---
                    const total = data.length;

                    // Satisfaction (Rating Score)
                    let totalScore = 0;
                    let ratedCount = 0;

                    // Avg Time Calculation
                    let totalDurationMs = 0;
                    let resolvedCount = 0;

                    // Detailed Category Stats
                    const categoryStats = {};

                    data.forEach(t => {
                        // Satisfaction
                        if (t.rating_score) {
                            totalScore += t.rating_score;
                            ratedCount++;
                        }

                        // Category Init
                        const cat = t.category || 'Sin Categoría';
                        if (!categoryStats[cat]) {
                            categoryStats[cat] = { total: 0, resolved: 0, totalDuration: 0 };
                        }
                        categoryStats[cat].total++;

                        // Resolved Logic
                        if (['RESUELTO_TECNICO', 'RESOLVED', 'CERRADO'].includes(t.status)) {
                            resolvedCount++;
                            categoryStats[cat].resolved++;

                            const created = new Date(t.createdAt);
                            const updated = new Date(t.updatedAt || t.createdAt);
                            const diff = updated - created;
                            if (diff > 0) {
                                totalDurationMs += diff;
                                categoryStats[cat].totalDuration += diff;
                            }
                        }
                    });

                    const avgRating = ratedCount > 0 ? (totalScore / ratedCount).toFixed(1) : 0;
                    const satisfaction = avgRating > 0 ? `${avgRating} / 5` : 'N/A';

                    // SLA Breached (Mock based on priority/time)
                    // Real logic would compare diff vs SLA threshold. keeping simple mock or improvement:
                    const slaBreached = data.filter(t => {
                        const isOpen = !['RESUELTO_TECNICO', 'RESOLVED', 'CERRADO'].includes(t.status);
                        const created = new Date(t.createdAt);
                        const now = new Date();
                        const diffHours = (now - created) / (1000 * 60 * 60);
                        return isOpen && diffHours > 48; // Mock SLA > 48h
                    }).length;

                    // Helper to format duration
                    const formatDuration = (ms) => {
                        if (!ms) return '0 hrs';
                        const hours = Math.floor(ms / (1000 * 60 * 60));
                        if (hours < 24) return `${hours.toFixed(1)} hrs`;
                        const days = Math.floor(hours / 24);
                        return `${days}d ${hours % 24}h`;
                    };

                    const globalAvgMs = resolvedCount > 0 ? totalDurationMs / resolvedCount : 0;
                    const avgTime = formatDuration(globalAvgMs);

                    // --- Charts Data ---

                    // By Status
                    const statusCounts = data.reduce((acc, t) => {
                        acc[t.status] = (acc[t.status] || 0) + 1;
                        return acc;
                    }, {});
                    const byStatus = Object.keys(statusCounts).map(key => ({
                        name: key.replace('_', ' '),
                        value: statusCounts[key]
                    }));

                    // By Priority
                    const priorityCounts = data.reduce((acc, t) => {
                        acc[t.priority] = (acc[t.priority] || 0) + 1;
                        return acc;
                    }, {});
                    const byPriority = Object.keys(priorityCounts).map(key => ({
                        name: key,
                        value: priorityCounts[key]
                    }));

                    // --- Detailed Table Data ---
                    const tableData = Object.keys(categoryStats).map(cat => {
                        const stats = categoryStats[cat];
                        const catAvgMs = stats.resolved > 0 ? stats.totalDuration / stats.resolved : 0;
                        return {
                            category: cat,
                            total: stats.total,
                            resolved: stats.resolved,
                            avgTime: formatDuration(catAvgMs)
                        };
                    });

                    setReportData({
                        kpis: {
                            totalTickets: total,
                            avgTime,
                            satisfaction,
                            slaBreached
                        },
                        byStatus,
                        byPriority,
                        tableData
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleExportExcel = async () => {
        if (!tickets.length) return;

        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const refCode = `REP-${dateStr}-${Math.floor(1000 + Math.random() * 9000)}`;

        // Log to Backend
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
            fetchReportLogs();
        } catch (error) { console.error(error); }

        // Generate Excel
        const dataToExport = tickets.map(t => ({
            Referencia: refCode,
            ID: t.id,
            Asunto: t.title,
            Estado: t.status,
            Prioridad: t.priority,
            Solicitante: t.creator?.name || 'N/A',
            Fecha: new Date(t.createdAt).toLocaleDateString()
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExport);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Tickets");
        XLSX.writeFile(wb, `Reporte_${refCode}.xlsx`);
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 print:space-y-4">
            <div className="flex justify-between items-center print:hidden">
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Reportes de Gestión</h1>
                <div className="flex gap-2">
                    <Button variant="secondary" onClick={handleExportExcel} className="flex items-center gap-2">
                        <Download size={16} /> Exportar Excel
                    </Button>
                    <Button variant="secondary" onClick={handlePrint} className="flex items-center gap-2">
                        <FileText size={16} /> Imprimir / PDF
                    </Button>
                </div>
            </div>

            <div className="hidden print:block mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Reporte de Incidencias CGE</h1>
                <p className="text-gray-500">Generado el {new Date().toLocaleDateString()}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tickets</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.kpis.totalTickets}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full text-blue-600 dark:text-blue-400">
                            <BarChartIcon size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-yellow-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Tiempo Promedio</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.kpis.avgTime}</h3>
                        </div>
                        <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full text-yellow-600 dark:text-yellow-400">
                            <Clock size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Satisfacción</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.kpis.satisfaction}</h3>
                        </div>
                        <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full text-green-600 dark:text-green-400">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </Card>
                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">SLA Vencido</p>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{reportData.kpis.slaBreached}</h3>
                        </div>
                        <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-full text-red-600 dark:text-red-400">
                            <AlertTriangle size={24} />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="p-6 flex flex-col items-center h-[400px]">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 w-full text-left">Tickets por Estado</h3>
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={reportData.byStatus} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {reportData.byStatus.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.1)" />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 flex flex-col items-center h-[400px]">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 mb-2 w-full text-left">Tickets por Prioridad</h3>
                    <div className="w-full h-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={reportData.byPriority}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="name" stroke="#94a3b8" />
                                <YAxis stroke="#94a3b8" allowDecimals={false} />
                                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
                                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Detailed Table */}
            <Card className="p-6 overflow-hidden">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-gray-700 dark:text-gray-200">Detalle por Categoría</h3>

                    <div className="flex items-center gap-2">
                        <select
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded px-2 py-1 text-sm dark:text-white outline-none"
                        >
                            <option value="LAST_30_DAYS">Últimos 30 días</option>
                            <option value="THIS_YEAR">Este Año</option>
                            <option value="ALL_TIME">Todo el tiempo</option>
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white dark:bg-slate-800 rounded-lg">
                        <thead className="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-300 font-semibold text-xs uppercase tracking-wider">
                            <tr>
                                <th className="p-4 rounded-tl-lg">Categoría</th>
                                <th className="p-4 text-center">Total</th>
                                <th className="p-4 text-center">Resueltos</th>
                                <th className="p-4 text-center rounded-tr-lg">T. Promedio</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                            {reportData.tableData.length === 0 ? (
                                <tr><td colSpan="4" className="p-4 text-center text-gray-500">No hay datos disponibles.</td></tr>
                            ) : reportData.tableData.map((row, idx) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 text-sm">
                                    <td className="p-4 font-medium text-gray-800 dark:text-gray-200">
                                        {CATEGORY_LABELS[row.category] || row.category}
                                    </td>
                                    <td className="p-4 text-center text-gray-600 dark:text-gray-400 font-mono">{row.total}</td>
                                    <td className="p-4 text-center text-green-600 dark:text-green-400 font-bold">{row.resolved}</td>
                                    <td className="p-4 text-center text-gray-500 dark:text-gray-500">{row.avgTime}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="print:hidden mt-8">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Historial de Reportes Generados</h2>
                <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm min-w-[600px]">
                            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-4">Código Referencia</th>
                                    <th className="p-4">Generado Por</th>
                                    <th className="p-4">Tipo</th>
                                    <th className="p-4">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                                {reportLogs.length === 0 ? (
                                    <tr><td colSpan="4" className="p-4 text-center text-gray-500 dark:text-gray-400">No hay reportes generados recientemente.</td></tr>
                                ) : reportLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-50 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 font-mono font-medium text-cge-blue dark:text-blue-400">{log.reference_code}</td>
                                        <td className="p-4 text-gray-700 dark:text-gray-300">{log.generator?.name || 'Desconocido'}</td>
                                        <td className="p-4"><Badge variant="secondary">{log.type}</Badge></td>
                                        <td className="p-4 text-gray-500 dark:text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
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
