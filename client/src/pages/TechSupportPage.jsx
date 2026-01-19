import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Play, CheckCircle, Clock } from 'lucide-react';

const TechSupportPage = () => {
    const { token, user } = useContext(AuthContext);
    const [queueTickets, setQueueTickets] = useState([]);
    const [myTickets, setMyTickets] = useState([]);
    const [selectedQueue, setSelectedQueue] = useState('TI'); // Default queue

    const fetchTickets = async () => {
        try {
            // 1. Fetch Department Queue (Unassigned)
            const queueRes = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets?status=EN_COLA_DEPARTAMENTAL&cola_atencion=${selectedQueue}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (queueRes.ok) setQueueTickets(await queueRes.json());

            // 2. Fetch My Active Tickets
            const myRes = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets?status=EN_PROCESO&assigned_agent_id=${user.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (myRes.ok) setMyTickets(await myRes.json());

        } catch (error) {
            console.error('Error fetching tickets:', error);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, [token, selectedQueue]);

    const handleAssignToMe = async (ticketId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'EN_PROCESO',
                    assigned_agent_id: user.id
                })
            });
            if (response.ok) fetchTickets();
        } catch (error) {
            console.error('Error assigning ticket:', error);
        }
    };

    const handleResolve = async (ticketId) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'RESUELTO_TECNICO'
                })
            });
            if (response.ok) fetchTickets();
        } catch (error) {
            console.error('Error resolving ticket:', error);
        }
    };

    const TicketList = ({ tickets, type }) => (
        <div className="space-y-4">
            {tickets.length === 0 && <div className="text-gray-500 italic">No hay tickets en esta sección.</div>}
            {tickets.map(ticket => (
                <Card key={ticket.id} className="p-4 border-l-4 border-l-blue-500">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="w-full">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                                <span className="font-mono text-gray-500">#{ticket.id}</span>
                                <Badge variant={ticket.priority}>{ticket.priority}</Badge>
                                <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                            </div>
                            <h3 className="font-bold text-gray-900">{ticket.title}</h3>
                            <p className="text-gray-600 text-sm mt-1">{ticket.description}</p>
                            <div className="mt-2 text-xs text-blue-600 font-semibold uppercase tracking-wide">
                                {ticket.category} - {ticket.cola_atencion}
                            </div>
                        </div>
                        <div className="w-full md:w-auto shrink-0 flex justify-end">
                            {type === 'QUEUE' && (
                                <Button size="sm" onClick={() => handleAssignToMe(ticket.id)} className="w-full md:w-auto">
                                    <Play size={16} className="mr-1" /> Tomar Caso
                                </Button>
                            )}
                            {type === 'MINE' && (
                                <Button size="sm" className="bg-green-600 hover:bg-green-700 w-full md:w-auto" onClick={() => handleResolve(ticket.id)}>
                                    <CheckCircle size={16} className="mr-1" /> Resolver
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );

    if (user?.role !== 'TECHNICAL_SUPPORT' && user?.role !== 'ADMIN') {
        return <div className="p-8 text-red-500">Acceso restringido a Soporte Técnico.</div>;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-800">Soporte Técnico</h1>
                <select
                    value={selectedQueue}
                    onChange={(e) => setSelectedQueue(e.target.value)}
                    className="border p-2 rounded-lg bg-white w-full md:w-auto"
                >
                    <option value="TESORERIA">Tesorería</option>
                    <option value="GASTOS_PERSONAL">Gastos en Personal</option>
                    <option value="SISTEMAS">Sistemas Informáticos</option>
                    <option value="SAF">SAF</option>
                    <option value="CONTABILIDAD">Contabilidad</option>
                    <option value="CONTRATACIONES">Contrataciones</option>
                </select>
            </div>

            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                    <Clock size={20} className="mr-2" /> Cola de Espera ({selectedQueue})
                </h2>
                <TicketList tickets={queueTickets} type="QUEUE" />
            </div>

            <hr />

            <div>
                <h2 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                    <Play size={20} className="mr-2" /> Mis Casos en Proceso
                </h2>
                <TicketList tickets={myTickets} type="MINE" />
            </div>
        </div>
    );
};

export default TechSupportPage;
