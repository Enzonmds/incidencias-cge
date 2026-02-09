import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Check, X, AlertCircle, Eye, MessageCircle } from 'lucide-react';

const TriagePage = () => {
    const { token, user } = useContext(AuthContext);
    const [tickets, setTickets] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [actionModal, setActionModal] = useState(null); // 'APPROVE' or 'REJECT'

    const fetchPendingTickets = async () => {
        try {
            // Triage 2.0: Fetch Operational View (Exceptions & Crises)
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets?operational_view=true`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setTickets(await response.json());
            }
        } catch (error) {
            console.error('Error fetching triage tickets:', error);
        }
    };

    useEffect(() => {
        fetchPendingTickets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleTriage = async (e) => {
        e.preventDefault();
        const body = {};

        if (actionModal === 'REJECT') {
            body.status = 'RECHAZADO';
            body.rejectionReason = e.target.rejectionReason?.value;
        } else {
            body.status = 'EN_COLA_DEPARTAMENTAL';
            body.category = e.target.category.value;
            body.cola_atencion = e.target.queue.value;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${selectedTicket.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setActionModal(null);
                setSelectedTicket(null);
                fetchPendingTickets();
            }
        } catch (error) {
            console.error('Error processing ticket:', error);
        }
    };

    // Helper to determine why the ticket is here
    const getCrisisReason = (ticket) => {
        if (ticket.status === 'PENDIENTE_VALIDACION' || ticket.cola_atencion === 'OTHER' || ticket.category === 'OTHER') {
            return { label: '⚠️ IA Insegura / Sin Clasificar', color: 'bg-yellow-100 text-yellow-800' };
        }
        if (ticket.priority === 'CRITICAL') {
            return { label: '🔥 CRÍTICO / Urgente', color: 'bg-red-100 text-red-800' };
        }
        // Check if older than 4 hours
        const isStale = new Date(ticket.createdAt) < new Date(new Date() - 4 * 60 * 60 * 1000);
        if (isStale) {
            return { label: '⏰ Demorado (>4hs)', color: 'bg-orange-100 text-orange-800' };
        }
        return { label: 'Gestión Requerida', color: 'bg-gray-100 text-gray-800' };
    };

    if (user?.role !== 'HUMAN_ATTENTION' && user?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-red-500">Acceso restringido a Coordinación de Operaciones.</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Centro de Coordinación y Operaciones</h1>
            <p className="text-gray-500 dark:text-gray-400">Gestión de excepciones, tickets críticos y fallos de clasificación automática.</p>

            <div className="grid grid-cols-1 gap-4">
                {tickets.map(ticket => {
                    const lastMessage = ticket.messages?.length > 0
                        ? ticket.messages[ticket.messages.length - 1].content
                        : ticket.description;
                    const phoneNumber = ticket.telefono_contacto || ticket.creator?.phone || 'N/A';
                    const crisis = getCrisisReason(ticket);

                    return (
                        <Card key={ticket.id} className="p-4 flex flex-col md:flex-row justify-between items-start gap-4 border-l-4 border-l-cge-blue">
                            <div className="flex-1 min-w-0 w-full">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <span className="font-mono text-gray-500">#{ticket.id}</span>
                                    {/* Critical Interaction Reason Badge */}
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${crisis.color} flex items-center gap-1`}>
                                        {crisis.label}
                                    </span>
                                    <Badge variant={ticket.status}>{ticket.status}</Badge>
                                    <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white truncate">{ticket.title}</h3>

                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 my-2">
                                    <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-1 flex items-center gap-1">
                                        <MessageCircle size={12} /> Último Mensaje:
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{lastMessage}</p>
                                </div>

                                <div className="flex flex-wrap gap-2 text-sm text-gray-700 mt-2">
                                    <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 rounded">Solic: <b>{ticket.creator?.name}</b></div>
                                    <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 rounded">Cola Actual: <b>{ticket.cola_atencion || 'N/A'}</b></div>
                                    <div className="px-2 py-1 bg-gray-100 dark:bg-slate-700 dark:text-gray-300 rounded flex items-center gap-1">
                                        Tel: {phoneNumber}
                                    </div>
                                    <button
                                        className="text-cge-blue hover:underline text-xs flex items-center gap-1 ml-1 mt-1 md:mt-0"
                                        onClick={() => { setSelectedTicket(ticket); setActionModal('HISTORY'); }}
                                    >
                                        <Eye size={14} /> Historial
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto shrink-0">
                                <Button className="bg-green-600 hover:bg-green-700 flex-1 md:flex-none" onClick={() => { setSelectedTicket(ticket); setActionModal('APPROVE'); }}>
                                    <Check size={18} /> <span className="md:hidden lg:inline">Validar</span>
                                </Button>
                                <Button variant="danger" className="flex-1 md:flex-none" onClick={() => { setSelectedTicket(ticket); setActionModal('REJECT'); }}>
                                    <X size={18} /> <span className="md:hidden lg:inline">Rechazar</span>
                                </Button>
                            </div>
                        </Card>
                    );
                })}
                {tickets.length === 0 && <div className="text-center text-gray-500 dark:text-gray-400 p-8 bg-gray-50 dark:bg-slate-800 rounded-lg">No hay tickets pendientes de validación.</div>}
            </div>

            {/* History Modal */}
            {actionModal === 'HISTORY' && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-2xl h-[500px] flex flex-col p-0 overflow-hidden">
                        <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg dark:text-white">Historial: Ticket #{selectedTicket.id}</h3>
                            <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 dark:bg-dark-card">
                            <div className="bg-gray-100 dark:bg-slate-700 p-3 rounded-lg text-sm border border-gray-200 dark:border-slate-600">
                                <p className="font-bold text-gray-700 dark:text-gray-200 mb-1">Descripción Original:</p>
                                <p className="dark:text-gray-300">{selectedTicket.description}</p>
                            </div>
                            {selectedTicket.messages?.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.sender_type === 'AGENT' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.sender_type === 'AGENT' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100' : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200'
                                        }`}>
                                        <p className="font-bold text-xs mb-1 opacity-70">
                                            {msg.sender_type === 'AGENT' ? 'Agente' : 'Usuario'} - {new Date(msg.createdAt).toLocaleString()}
                                        </p>
                                        <p>{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-right">
                            <Button variant="secondary" onClick={() => setActionModal(null)}>Cerrar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Action Modal (Approve/Reject) */}
            {(actionModal === 'REJECT' || actionModal === 'APPROVE') && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-lg p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {actionModal === 'REJECT' ? 'Rechazar Ticket' : 'Derivar a Cola de Atención'}
                        </h2>

                        <form onSubmit={handleTriage} className="space-y-4">
                            {actionModal === 'APPROVE' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cola de Atención (Departamento)</label>
                                        <select
                                            name="queue"
                                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:text-white"
                                            onChange={(e) => {
                                                const queue = e.target.value;
                                                const categorySelect = document.querySelector('select[name="category"]');
                                                categorySelect.innerHTML = ''; // Clear existing options

                                                let options = [];
                                                switch (queue) {
                                                    case 'GASTOS_PERSONAL':
                                                        options = [
                                                            { val: 'HABERES', txt: 'Haberes' },
                                                            { val: 'ENTIDADES', txt: 'Entidades' },
                                                            { val: 'DESCUENTOS', txt: 'Descuentos' }
                                                        ];
                                                        break;
                                                    case 'CONTABILIDAD':
                                                        options = [{ val: 'VIATICOS', txt: 'Viáticos' }];
                                                        break;
                                                    case 'SISTEMAS':
                                                        options = [
                                                            { val: 'PERMISOS_USUARIOS', txt: 'Permisos de Usuarios' },
                                                            { val: 'RECIBOS', txt: 'Problema visualización recibos' },
                                                            { val: 'ERRORES_SISTEMA', txt: 'Errores del Sistema' },
                                                            { val: 'HARDWARE', txt: 'Hardware (Interno)' }
                                                        ];
                                                        break;
                                                    case 'TESORERIA':
                                                    case 'SAF':
                                                    case 'CONTRATACIONES':
                                                    default:
                                                        options = [{ val: 'OTHER', txt: 'General / Otros' }];
                                                        break;
                                                }

                                                options.forEach(opt => {
                                                    const el = document.createElement('option');
                                                    el.value = opt.val;
                                                    el.innerText = opt.txt;
                                                    categorySelect.appendChild(el);
                                                });
                                            }}
                                        >
                                            <option value="">Seleccione Departamento...</option>
                                            <option value="TESORERIA">Tesorería</option>
                                            <option value="GASTOS_PERSONAL">Gastos en Personal</option>
                                            <option value="SISTEMAS">Sistemas Informáticos</option>
                                            <option value="SAF">SAF</option>
                                            <option value="CONTABILIDAD">Contabilidad</option>
                                            <option value="CONTRATACIONES">Contrataciones y Bienes</option>
                                        </select>
                                    </div>
                                    <div className="mt-4">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
                                        <select name="category" className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm bg-white dark:bg-slate-700 dark:text-white">
                                            <option value="OTHER">Seleccione Departamento Primero</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div className="flex items-center gap-2 mb-4 text-orange-600 bg-orange-50 p-3 rounded">
                                        <AlertCircle size={20} />
                                        <span className="font-medium">El ticket será devuelto al usuario solicitando más datos.</span>
                                    </div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Motivo del Rechazo / Solicitud</label>
                                    <textarea
                                        name="rejectionReason"
                                        required
                                        rows="3"
                                        className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cge-red outline-none bg-white dark:bg-slate-700 dark:text-white"
                                        placeholder="Ej: Falta adjuntar la foto del recibo."
                                    ></textarea>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="secondary" onClick={() => setActionModal(null)}>Cancelar</Button>
                                <Button type="submit" variant={actionModal === 'REJECT' ? 'danger' : 'primary'}>Confirmar</Button>
                            </div>
                        </form>
                    </Card >
                </div >
            )}
        </div >
    );
};

export default TriagePage;
