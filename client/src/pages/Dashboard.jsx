import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { RefreshCw } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const Dashboard = () => {
    const { token, user } = useContext(AuthContext); // Destructure user
    const navigate = useNavigate();

    useEffect(() => {
        if (user && user.role === 'USER') {
            navigate('/tickets');
        }
    }, [user, navigate]);
    const [tickets, setTickets] = useState([]);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [stats, setStats] = useState({
        open: 0,
        inProgress: 0,
        waiting: 0,
        resolved: 0
    });
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
                const newStats = {
                    open: data.filter(t => ['PENDIENTE_VALIDACION', 'EN_COLA_DEPARTAMENTAL'].includes(t.status)).length,
                    inProgress: data.filter(t => t.status === 'EN_PROCESO').length,
                    waiting: data.filter(t => t.status === 'RECHAZADO').length,
                    resolved: data.filter(t => ['RESUELTO_TECNICO', 'CERRADO'].includes(t.status)).length
                };
                setStats(newStats);

                // Pie Chart Data (Status)
                const statusCounts = data.reduce((acc, t) => {
                    const s = t.status === 'PENDIENTE_VALIDACION' ? 'NUEVO' :
                        t.status === 'EN_COLA_DEPARTAMENTAL' ? 'PENDIENTE' :
                            t.status === 'EN_PROCESO' ? 'EN PROCESO' : 'RESUELTO';
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                }, {});
                setChartData(Object.keys(statusCounts).map(key => ({ name: key, value: statusCounts[key] })));

                // Bar Chart Data (Category)
                const catCounts = data.reduce((acc, t) => {
                    const c = t.category || 'OTROS';
                    acc[c] = (acc[c] || 0) + 1;
                    return acc;
                }, {});
                setCategoryData(Object.keys(catCounts).map(key => ({ name: key, count: catCounts[key] })).slice(0, 5));
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    useEffect(() => {
        if (token) {
            fetchData();
            const interval = setInterval(fetchData, 30000); // Poll every 30s
            return () => clearInterval(interval);
        }
    }, [token]);

    return (
        <div className="space-y-6">
            {/* Premium Welcome Banner */}
            <div className="relative overflow-hidden bg-gradient-to-r from-blue-900 to-cge-blue rounded-2xl p-8 text-white shadow-lg page-enter">
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2">Hola, {user?.name || 'Usuario'} 👋</h1>
                        <p className="text-blue-100 flex items-center gap-2 text-sm font-medium">
                            <span className="opacity-75">{lastUpdated.toLocaleDateString()}</span> •
                            <span className="opacity-75">{lastUpdated.toLocaleTimeString()}</span>
                            <RefreshCw size={14} className="cursor-pointer hover:rotate-180 transition-transform duration-500" onClick={fetchData} title="Actualizar datos" />
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate('/tickets')}
                        variant="white"
                        className="border-none shadow-xl transform hover:scale-105"
                    >
                        + Nuevo Reclamo
                    </Button>
                </div>
                {/* Abstract Background Shapes */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-400 opacity-10 rounded-full blur-2xl"></div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Nuevos / Pendientes', count: stats.open, color: 'text-blue-600', border: 'border-blue-200' },
                    { label: 'En Progreso', count: stats.inProgress, color: 'text-yellow-600', border: 'border-yellow-200' },
                    { label: 'Rechazados', count: stats.waiting, color: 'text-gray-600', border: 'border-gray-200' },
                    { label: 'Resueltos', count: stats.resolved, color: 'text-green-600', border: 'border-green-200' },
                ].map((stat) => (
                    <Card key={stat.label} className={`flex flex-col items-center justify-center p-4 border-t-4 ${stat.border}`}>
                        <span className={`text-3xl font-bold ${stat.color}`}>{stat.count}</span>
                        <span className="text-sm text-gray-500 mt-1">{stat.label}</span>
                    </Card>
                ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 h-[300px] flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Estado de Tickets</h3>
                    <div className="flex-1 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <RechartsTooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                <Card className="p-6 h-[300px] flex flex-col">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 5 Categorías</h3>
                    <div className="flex-1 w-full text-xs">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <RechartsTooltip />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Recent Tickets Table */}
            <Card>
                <h2 className="text-lg font-semibold mb-4 mx-4 mt-4">Tickets Recientes</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-gray-100 text-sm text-gray-500">
                                <th className="pb-3 pl-4 font-medium">ID</th>
                                <th className="pb-3 font-medium">Asunto</th>
                                <th className="pb-3 font-medium">Estado</th>
                                <th className="pb-3 font-medium">Prioridad</th>
                                <th className="pb-3 font-medium">Fecha</th>
                                <th className="pb-3 font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {tickets.slice(0, 5).map((ticket) => (
                                <tr key={ticket.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                                    <td className="py-3 pl-4 text-gray-600">#{ticket.id}</td>
                                    <td className="py-3 font-medium text-gray-800">{ticket.title}</td>
                                    <td className="py-3"><Badge variant={ticket.status}>{ticket.status}</Badge></td>
                                    <td className="py-3"><Badge variant={ticket.priority}>{ticket.priority}</Badge></td>
                                    <td className="py-3 text-gray-500 text-xs">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                                    <td className="py-3">
                                        <Link to={`/tickets/${ticket.id}`} className="inline-block">
                                            <Button variant="secondary" className="text-xs px-2 py-1">Ver</Button>
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-gray-500">No hay tickets recientes</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
