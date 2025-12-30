import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Check, X, AlertCircle } from 'lucide-react';

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
                {tickets.map(ticket => (
                    <Card key={ticket.id} className="p-4 flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-gray-500">#{ticket.id}</span>
                                <Badge variant="PENDING">Pendiente Validación</Badge>
                                <span className="text-xs text-gray-400">{new Date(ticket.createdAt).toLocaleString()}</span>
                            </div>
                            <h3 className="font-bold text-lg text-gray-900">{ticket.title}</h3>
                            <p className="text-gray-600 mt-1 mb-2">{ticket.description}</p>

                            <div className="flex gap-4 text-sm text-gray-700 bg-gray-50 p-2 rounded">
                                <div><span className="font-semibold">Solicitante:</span> {ticket.creator?.name}</div>
                                <div><span className="font-semibold">DNI:</span> {ticket.dni_solicitante || 'N/A'}</div>
                                <div><span className="font-semibold">Tel:</span> {ticket.telefono_contacto || 'N/A'}</div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button variant="danger" onClick={() => { setSelectedTicket(ticket); setActionModal('REJECT'); }}>
                                <X size={18} /> Rechazar
                            </Button>
                            <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setSelectedTicket(ticket); setActionModal('APPROVE'); }}>
                                <Check size={18} /> Validar
                            </Button>
                        </div>
                    </Card>
                ))}
                {tickets.length === 0 && <div className="text-center text-gray-500 p-8 bg-gray-50 rounded-lg">No hay tickets pendientes de validación.</div>}
            </div>

            {/* Action Modal */}
            {actionModal && selectedTicket && (
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
                                <p className="text-red-600 bg-red-50 p-3 rounded">
                                    <AlertCircle className="inline mr-2" size={16} />
                                    El ticket será devuelto al usuario solicitando más información.
                                </p>
                            )}

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="secondary" onClick={() => setActionModal(null)}>Cancelar</Button>
                                <Button type="submit" variant={actionModal === 'REJECT' ? 'danger' : 'primary'}>Confirmar</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default TriagePage;
