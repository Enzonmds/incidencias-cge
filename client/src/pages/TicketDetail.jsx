import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { User, Send, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');

    const fetchTicket = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTicket(data);
            } else {
                alert('Ticket no encontrado');
                navigate('/tickets');
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchTicket();
    }, [id, token]);

    const handleAction = async (actionType) => {
        let body = {};
        if (actionType === 'ASSIGN_ME') {
            body = { assigned_agent_id: user.id, status: 'IN_PROGRESS' };
        } else if (actionType === 'CLOSE') {
            body = { status: 'RESOLVED' };
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                fetchTicket();
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content: messageInput })
            });

            if (response.ok) {
                setMessageInput('');
                fetchTicket();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando ticket...</div>;
    if (!ticket) return null;

    return (
        <div className="space-y-6">
            <Link to="/tickets" className="flex items-center gap-2 text-gray-500 hover:text-cge-sidebar transition-colors">
                <ArrowLeft size={18} />
                <span>Volver al Panel</span>
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-800">Ticket #{ticket.id}</h1>
                        <Badge variant={ticket.status}>{ticket.status}</Badge>
                        <Badge variant={ticket.priority}>{ticket.priority}</Badge>
                        {ticket.category && <span className="text-xs font-bold text-gray-500 border border-gray-300 rounded px-2 py-0.5">{ticket.category}</span>}
                    </div>
                    <div className="flex flex-col gap-1">
                        <h2 className="text-lg text-gray-600">{ticket.title}</h2>
                        {ticket.category && <span className="text-sm text-gray-400">Categoría: {ticket.category}</span>}
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Actions only for Agents/Admins */}
                    {(user?.role === 'ADMIN' || user?.role === 'AGENT') && (
                        <>
                            {!ticket.assigned_agent_id && (
                                <Button variant="secondary" onClick={() => handleAction('ASSIGN_ME')}>Asignarme</Button>
                            )}
                            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                                <Button variant="danger" onClick={() => handleAction('CLOSE')}>Cerrar Ticket</Button>
                            )}
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Conversation */}
                <div className="col-span-2 space-y-4">
                    <Card className="min-h-[400px] flex flex-col">
                        <div className="flex-1 space-y-4 mb-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-700 mb-1">Descripción del Problema</p>
                                <p className="text-gray-600 whitespace-pre-wrap">{ticket.description}</p>
                            </div>

                            {ticket.messages && ticket.messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.sender_type === 'AGENT' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${msg.sender_type === 'AGENT'
                                        ? 'bg-blue-50 border border-blue-100'
                                        : 'bg-white border border-gray-200'
                                        }`}>
                                        <div className="flex justify-between items-center gap-4 mb-2">
                                            <span className="text-xs font-bold text-gray-700">{msg.sender?.name || 'Desconocido'}</span>
                                            <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Box */}
                        <div className="border-t border-gray-100 pt-4 mt-auto">
                            <textarea
                                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-cge-blue outline-none resize-none transition-shadow"
                                rows="3"
                                placeholder="Escribí una respuesta..."
                                value={messageInput}
                                onChange={(e) => setMessageInput(e.target.value)}
                            ></textarea>
                            <div className="flex justify-end mt-2">
                                <Button className="flex items-center gap-2" onClick={handleSendMessage}>
                                    <Send size={16} /> Enviar Respuesta
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* Sidebar Info */}
                <div className="space-y-4">
                    <Card>
                        <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Información</h3>
                        <div className="space-y-4 text-sm">
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Solicitante</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center border border-gray-200">
                                        <User size={16} className="text-gray-500" />
                                    </div>
                                    <span className="font-medium text-cge-sidebar">{ticket.creator?.name || 'Desconocido'}</span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1 ml-11">{ticket.creator?.email}</div>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Responsable</span>
                                {ticket.assignee ? (
                                    <span className="font-medium text-gray-700">{ticket.assignee.name}</span>
                                ) : (
                                    <span className="text-gray-400 italic">Sin asignar</span>
                                )}
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Fecha de Alta</span>
                                <span className="font-medium text-gray-700">{new Date(ticket.createdAt).toLocaleString()}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
