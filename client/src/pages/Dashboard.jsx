import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import ThemeToggle from '../components/ui/ThemeToggle';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw, Shield, AlertCircle, CheckCircle, Clock, Search, Bell, LayoutDashboard } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

// Corporate Palette (Blue, Teal, Amber, Rose, Indigo)
const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#f43f5e', '#6366f1'];

// Category Mapping
const CATEGORY_LABELS = {
    'HABERES': 'Haberes',
    'VIATICOS': 'Viáticos',
    'RECIBOS': 'Recibos',
    'FALLA_SERVIDOR': 'Servidor',
    'ERROR_VPN': 'VPN',
    'PERMISOS_USUARIOS': 'Usuarios',
    'HARDWARE': 'Hardware',
    'SOFTWARE': 'Software',
    'ACCESO_REMOTO': 'Remoto',
    'IMPRESORAS': 'Impresoras',
    'INTERNET': 'Internet',
    'TESORERIA': 'Tesorería',
    'SISTEMAS': 'Sistemas',
    'GASTOS_PERSONAL': 'Personal',
    'CONTABILIDAD': 'Contab.',
    'CONTRATACIONES': 'Contrat.'
};

const Dashboard = () => {
    const { token, user } = useContext(AuthContext);
    const navigate = useNavigate();
    const { theme } = useTheme();

    useEffect(() => {
        if (user && user.role === 'USER') navigate('/tickets');
    }, [user, navigate]);

    const [tickets, setTickets] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [stats, setStats] = useState({ open: 0, inProgress: 0, waiting: 0, resolved: 0, critical: 0 });
    const [chartData, setChartData] = useState([]);
    const [categoryData, setCategoryData] = useState([]);

    const fetchData = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTickets(data);
                setLastUpdated(new Date());

                // KPIs
                // KPIs
                const ratedTickets = data.filter(t => t.satisfaction_rating > 0);
                const totalRatingSum = ratedTickets.reduce((sum, t) => sum + t.satisfaction_rating, 0);
                const avgRating = ratedTickets.length > 0 ? (totalRatingSum / ratedTickets.length).toFixed(1) : null;

                const newStats = {
                    open: data.filter(t => ['PENDIENTE_VALIDACION', 'EN_COLA_DEPARTAMENTAL'].includes(t.status)).length,
                    inProgress: data.filter(t => t.status === 'EN_PROCESO').length,
                    waiting: data.filter(t => t.status === 'RECHAZADO').length,
                    resolved: data.filter(t => ['RESUELTO_TECNICO', 'CERRADO'].includes(t.status)).length,
                    critical: data.filter(t => t.priority === 'CRITICAL' && t.status !== 'CERRADO').length,
                    avgRating: avgRating,
                    totalRatings: ratedTickets.length
                };
                setStats(newStats);

                // Pie Chart Data
                const statusCounts = data.reduce((acc, t) => {
                    const s = t.status === 'PENDIENTE_VALIDACION' ? 'NUEVO' :
                        t.status === 'EN_COLA_DEPARTAMENTAL' ? 'PENDIENTE' :
                            t.status === 'EN_PROCESO' ? 'PROCESO' : 'RESUELTO';
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                }, {});
                setChartData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })));

                // Bar Chart Data (Top Categories)
                const catCounts = data.reduce((acc, t) => {
                    const rawCat = t.category || 'OTROS';
                    // Use label or fallback to code, replace underscores for better readability if code
                    const label = CATEGORY_LABELS[rawCat] || rawCat.replace(/_/g, ' ');
                    acc[label] = (acc[label] || 0) + 1;
                    return acc;
                }, {});

                // Sort by count desc and take top 5
                setCategoryData(
                    Object.keys(catCounts)
                        .map(key => ({ name: key, count: catCounts[key] }))
                        .sort((a, b) => b.count - a.count)
                        .slice(0, 5)
                );
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
            const interval = setInterval(fetchData, 30000);
            return () => clearInterval(interval);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const isDark = theme === 'dark';

    return (
        <div className="space-y-6 text-slate-800 dark:text-dark-text-primary transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-dark-card p-6 rounded-lg border border-slate-200 dark:border-dark-border shadow-sm">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1 flex items-center gap-3">
                        <LayoutDashboard className="text-cge-blue" size={28} />
                        Panel de Control
                    </h1>
                    <p className="text-slate-500 dark:text-dark-text-secondary text-sm">
                        Resumen de actividad y métricas clave.
                    </p>
                </div>

                <div className="flex items-center gap-4 mt-4 md:mt-0">
                    <Button
                        onClick={() => navigate('/tickets')}
                        className="bg-cge-blue text-white hover:bg-blue-600 shadow-sm"
                    >
                        + Nuevo Ticket
                    </Button>
                    <div className="flex gap-2 items-center border-l border-slate-200 dark:border-dark-border pl-4">
                        <ThemeToggle />
                        <button
                            onClick={fetchData}
                            className="p-2 rounded-full bg-slate-100 dark:bg-dark-bg hover:bg-slate-200 dark:hover:bg-dark-border transition-colors text-slate-600 dark:text-dark-text-secondary"
                            title="Actualizar datos"
                        >
                            <RefreshCw size={20} className={lastUpdated ? "" : "animate-spin"} />
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                {[
                    { label: 'Casos Críticos', count: stats.critical, icon: AlertCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' },
                    { label: 'Nuevos / Pend.', count: stats.open, icon: Clock, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
                    { label: 'En Progreso', count: stats.inProgress, icon: RefreshCw, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                    { label: 'Resueltos', count: stats.resolved, icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                    {
                        label: 'Reputación',
                        count: stats.avgRating ? stats.avgRating : '-',
                        subtext: stats.totalRatings ? `(${stats.totalRatings} opiniones)` : 'Sin datos',
                        icon: Shield,
                        color: 'text-indigo-600 dark:text-indigo-400',
                        bg: 'bg-indigo-50 dark:bg-indigo-900/20',
                        isRating: true
                    },
                ].map((stat) => (
                    <Card key={stat.label} className="flex items-center justify-between p-6">
                        <div>
                            <p className="text-slate-500 dark:text-dark-text-secondary text-sm font-medium uppercase tracking-wider">{stat.label}</p>
                            <div className="flex items-baseline gap-2 mt-1">
                                <h2 className={`text-3xl font-bold ${stat.color}`}>{stat.count}</h2>
                                {stat.isRating && stat.count !== '-' && <span className="text-yellow-500 text-xl">★</span>}
                            </div>
                            {stat.subtext && <p className="text-xs text-gray-400 mt-1">{stat.subtext}</p>}
                        </div>
                        <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Distribution */}
                <Card className="p-6 h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-dark-border pb-2">
                        Distribución por Estado
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke={isDark ? '#1E293B' : '#fff'}
                                    strokeWidth={2}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1E293B' : '#fff',
                                        borderColor: isDark ? '#334155' : '#e2e8f0',
                                        color: isDark ? '#F8FAFC' : '#1e293b',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    wrapperStyle={{ color: isDark ? '#94A3B8' : '#64748b' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Categories Flow */}
                <Card className="p-6 h-[400px] flex flex-col">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-6 border-b border-slate-100 dark:border-dark-border pb-2">
                        Top Categorías
                    </h3>
                    <div className="flex-1 w-full min-h-0">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke={isDark ? "#334155" : "#e2e8f0"} />
                                <XAxis type="number" hide allowDecimals={false} />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    width={140}
                                    tick={{ fill: isDark ? '#94A3B8' : '#64748b', fontSize: 13, fontWeight: 500 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <RechartsTooltip
                                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
                                    contentStyle={{
                                        backgroundColor: isDark ? '#1E293B' : '#fff',
                                        borderColor: isDark ? '#334155' : '#e2e8f0',
                                        color: isDark ? '#F8FAFC' : '#1e293b',
                                        borderRadius: '6px',
                                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default Dashboard;
