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
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets?status=PENDIENTE_VALIDACION`, {
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

    if (user?.role !== 'HUMAN_ATTENTION' && user?.role !== 'ADMIN') {
        return <div className="p-8 text-center text-red-500">Acceso restringido a Mesa de Ayuda (Atención Humana).</div>;
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-800">Triaje y Validación</h1>
            <p className="text-gray-500">Tickets entrantes pendientes de derivación.</p>

            <div className="grid grid-cols-1 gap-4">
                {tickets.map(ticket => {
                    const lastMessage = ticket.messages?.length > 0
                        ? ticket.messages[ticket.messages.length - 1].content
                        : ticket.description;
                    const phoneNumber = ticket.telefono_contacto || ticket.creator?.phone || 'N/A';

                    return (
                        <Card key={ticket.id} className="p-4 flex justify-between items-start">
                            <div className="flex-1 min-w-0 pr-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono text-gray-500">#{ticket.id}</span>
                                    <Badge variant="PENDING">Pendiente Validación</Badge>
                                    <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                                </div>
                                <h3 className="font-bold text-lg text-gray-900 truncate">{ticket.title}</h3>

                                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 my-2">
                                    <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                                        <MessageCircle size={12} /> Último Mensaje:
                                    </p>
                                    <p className="text-sm text-gray-700 line-clamp-2">{lastMessage}</p>
                                </div>

                                <div className="flex gap-4 text-sm text-gray-700 mt-2">
                                    <div><span className="font-semibold">Solicitante:</span> {ticket.creator?.name}</div>
                                    <div><span className="font-semibold">DNI:</span> {ticket.dni_solicitante || 'N/A'}</div>
                                    <div className="flex items-center gap-1">
                                        <span className="font-semibold">Tel:</span>
                                        <span>{phoneNumber}</span>
                                    </div>
                                    <button
                                        className="text-cge-blue hover:underline text-xs flex items-center gap-1 ml-2"
                                        onClick={() => { setSelectedTicket(ticket); setActionModal('HISTORY'); }}
                                    >
                                        <Eye size={14} /> Ver Historial Completo ({ticket.messages?.length || 0})
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 shrink-0">
                                <Button className="bg-green-600 hover:bg-green-700 w-full" onClick={() => { setSelectedTicket(ticket); setActionModal('APPROVE'); }}>
                                    <Check size={18} /> Validar
                                </Button>
                                <Button variant="danger" className="w-full" onClick={() => { setSelectedTicket(ticket); setActionModal('REJECT'); }}>
                                    <X size={18} /> Rechazar
                                </Button>
                            </div>
                        </Card>
                    );
                })}
                {tickets.length === 0 && <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">No hay tickets pendientes de validación.</div>}
            </div>

            {/* History Modal */}
            {actionModal === 'HISTORY' && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-[600px] h-[500px] flex flex-col p-0 overflow-hidden">
                        <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-lg">Historial: Ticket #{selectedTicket.id}</h3>
                            <button onClick={() => setActionModal(null)} className="text-gray-500 hover:text-gray-700"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            <div className="bg-gray-100 p-3 rounded-lg text-sm border border-gray-200">
                                <p className="font-bold text-gray-700 mb-1">Descripción Original:</p>
                                <p>{selectedTicket.description}</p>
                            </div>
                            {selectedTicket.messages?.map((msg, idx) => (
                                <div key={idx} className={`flex flex-col ${msg.sender_type === 'AGENT' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg text-sm ${msg.sender_type === 'AGENT' ? 'bg-blue-100 text-blue-900' : 'bg-white border border-gray-200 text-gray-800'
                                        }`}>
                                        <p className="font-bold text-xs mb-1 opacity-70">
                                            {msg.sender_type === 'AGENT' ? 'Agente' : 'Usuario'} - {new Date(msg.createdAt).toLocaleString()}
                                        </p>
                                        <p>{msg.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t bg-gray-50 text-right">
                            <Button variant="secondary" onClick={() => setActionModal(null)}>Cerrar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Action Modal (Approve/Reject) */}
            {(actionModal === 'REJECT' || actionModal === 'APPROVE') && selectedTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-[500px] p-6">
                        <h2 className="text-xl font-bold mb-4">
                            {actionModal === 'REJECT' ? 'Rechazar Ticket' : 'Derivar a Cola de Atención'}
                        </h2>

                        <form onSubmit={handleTriage} className="space-y-4">
                            {actionModal === 'APPROVE' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cola de Atención (Departamento)</label>
                                        <select
                                            name="queue"
                                            className="w-full border border-gray-300 rounded-lg p-2 text-sm"
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
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                        <select name="category" className="w-full border border-gray-300 rounded-lg p-2 text-sm">
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
                                        className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-cge-red outline-none"
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
