import React, { useState, useEffect, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { User, Send, ArrowLeft, MessageCircle, Mail, Wrench, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { AuthContext } from '../context/AuthContext';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');

    // Reject/Observe State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const fetchTicket = async (isBackground = false) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTicket(data);
            } else if (!isBackground) {
                alert('Ticket no encontrado');
                navigate('/tickets');
            }
        } catch (error) {
            console.error('Error fetching ticket:', error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchTicket(false);

            // Poll every 3 seconds for real-time updates
            const interval = setInterval(() => {
                fetchTicket(true);
            }, 3000);

            return () => clearInterval(interval);
        }
    }, [id, token]);

    const handleAction = async (actionType) => {
        let body = {};
        if (actionType === 'ASSIGN_ME') {
            body = { assigned_agent_id: user.id, status: 'IN_PROGRESS' };
        } else if (actionType === 'CLOSE') {
            body = { status: 'RESUELTO_TECNICO' };
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

    const handleReject = async () => {
        if (!rejectReason.trim()) return alert('Debe indicar un motivo.');
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    status: 'RECHAZADO',
                    rejectionReason: rejectReason
                })
            });

            if (response.ok) {
                setShowRejectModal(false);
                setRejectReason('');
                fetchTicket();
            }
        } catch (error) {
            console.error('Error rejecting ticket:', error);
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
                    {['ADMIN', 'AGENT', 'TECHNICAL_SUPPORT', 'HUMAN_ATTENTION'].includes(user?.role) && (
                        <>
                            {!ticket.assigned_agent_id && (
                                <Button variant="secondary" onClick={() => handleAction('ASSIGN_ME')}>Asignarme</Button>
                            )}

                            {/* Rejection / Observation Button - Only for Triage (Pending Validation) */}
                            {ticket.status === 'PENDIENTE_VALIDACION' && (
                                <Button
                                    className="bg-orange-500 hover:bg-orange-600 text-white"
                                    onClick={() => setShowRejectModal(true)}
                                >
                                    ❌ Rechazar / Observar
                                </Button>
                            )}

                            {ticket.assigned_agent_id && ticket.status !== 'RESUELTO_TECNICO' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && (
                                <Button variant="danger" onClick={() => handleAction('CLOSE')}>✅ Resolver (Técnico)</Button>
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
                                        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                            {(() => {
                                                if (msg.content.startsWith('[MEDIA_URL]:')) {
                                                    const url = msg.content.replace('[MEDIA_URL]:', '').trim();
                                                    const ext = url.split('.').pop().toLowerCase();

                                                    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
                                                        return (
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-500 mb-1">📷 Imagen Adjunta:</p>
                                                                <a href={url} target="_blank" rel="noopener noreferrer">
                                                                    <img src={url} alt="Adjunto" className="max-w-full h-auto max-h-64 rounded-lg border border-gray-200 hover:opacity-95 transition-opacity" />
                                                                </a>
                                                            </div>
                                                        );
                                                    } else if (['mp3', 'ogg', 'wav'].includes(ext)) {
                                                        return (
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-500 mb-1">🎤 Audio Adjunto:</p>
                                                                <audio controls src={url} className="w-full" />
                                                            </div>
                                                        );
                                                    } else {
                                                        return (
                                                            <div className="flex items-center gap-2 bg-gray-100 p-3 rounded-lg border border-gray-200">
                                                                <span className="text-2xl">
                                                                    {['xls', 'xlsx', 'csv'].includes(ext) ? '📊' :
                                                                        ['pdf'].includes(ext) ? '📄' : '📁'}
                                                                </span>
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-gray-700 text-xs uppercase">{ext}</span>
                                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline text-sm break-all">
                                                                        Descargar Archivo
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        );
                                                    }
                                                }
                                                return msg.content;
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Reply Box Logic */}
                        {user?.role !== 'MONITOR' && (
                            <div className="border-t border-gray-100 pt-4 mt-auto">
                                {!ticket.assigned_agent_id ? (
                                    <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                        <p className="text-gray-500 mb-3 text-sm">Debes asignarte este ticket para poder responder.</p>
                                        <Button
                                            variant="primary"
                                            className="flex items-center gap-2"
                                            onClick={() => handleAction('ASSIGN_ME')}
                                        >
                                            <User size={16} /> Tomar Caso
                                        </Button>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
                                )}
                            </div>
                        )}
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
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${ticket.channel === 'WHATSAPP' ? 'bg-green-100 border-green-200 text-green-600' : 'bg-gray-100 border-gray-200 text-gray-500'}`}>
                                        {ticket.channel === 'WHATSAPP' ? <MessageCircle size={16} /> : (ticket.channel === 'EMAIL' ? <Mail size={16} /> : <User size={16} />)}
                                    </div>
                                    <div>
                                        <p className="font-medium text-cge-sidebar">
                                            {ticket.solicitante_grado ? `${ticket.solicitante_grado} ` : ''}
                                            {ticket.solicitante_nombre_completo || ticket.creator?.name || 'Desconocido'}
                                        </p>
                                        {ticket.unidad_codigo && (
                                            <Badge variant="outline" className="text-[10px] px-1 py-0 border-gray-300 text-gray-500 mt-0.5 inline-block">
                                                {ticket.unidad_codigo}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 mt-2 ml-11 flex flex-col gap-1">
                                    <span>{ticket.solicitante_email || ticket.creator?.email}</span>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold text-gray-500">Canal:</span>
                                        <span className="capitalize">{ticket.channel?.toLowerCase() || 'Web'}</span>
                                    </div>
                                </div>
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

                    {/* Quick Tools (Agents Only) */}
                    {(user?.role === 'ADMIN' || user?.role === 'TECHNICAL_SUPPORT' || user?.role === 'HUMAN_ATTENTION') && (
                        <Card>
                            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2 flex items-center gap-2">
                                <Wrench size={16} /> Herramientas Rápidas
                            </h3>
                            <div className="space-y-2">
                                <a
                                    href="http://mlh.cge.mil.ar"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium py-2 rounded-lg transition-colors border border-blue-200 text-sm"
                                >
                                    Acceso a MLH
                                </a>
                                <p className="text-xs text-gray-400 text-center italic">
                                    Soluciones personalizadas según departamento
                                </p>
                            </div>
                        </Card>
                    )}
                </div>
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-96 p-6">
                        <div className="flex items-center gap-2 mb-4 text-orange-600">
                            <AlertTriangle size={24} />
                            <h2 className="text-xl font-bold">Observar / Rechazar Ticket</h2>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            Indique el motivo por el cual se rechaza u observa este ticket. Este mensaje será enviado al usuario.
                        </p>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4 bg-gray-50"
                            rows="4"
                            placeholder="Motivo: Falta recibo de sueldo, no corresponde a esta área, etc..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Cancelar</Button>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReject}>Confirmar Observación</Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TicketDetail;
