import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { User, Send, ArrowLeft } from 'lucide-react';

const TicketDetail = () => {
    const { id } = useParams();

    // Mock Database for Demo
    const ticketsDB = {
        '2045': {
            title: 'Problema visualización Recibo de Haberes',
            description: 'Al intentar ingresar al portal de autogestión para descargar el recibo de haberes de este mes, me sale un error que dice "Legajo no encontrado".',
            status: 'OPEN',
            priority: 'HIGH',
            created_at: '30/12/2023 08:30',
            user: 'Capitán Gutierrez',
            messages: [
                { id: 1, sender: 'Capitán Gutierrez', role: 'USER', content: 'Buen día, necesito descargar mi recibo urgente para un trámite en el banco y no me deja entrar.', time: '08:30' },
                { id: 2, sender: 'Serrano (Agente)', role: 'AGENT', content: 'Buen día Capitán. Estamos verificando su estado en el sistema de Personal. Aguarde un momento.', time: '08:45' },
            ]
        },
        '2044': {
            title: 'Error carga de Viáticos - Unidad Logística',
            description: 'La comisión realizada a Campo de Mayo la semana pasada no figura en el sistema de liquidación de viáticos.',
            status: 'IN_PROGRESS',
            priority: 'CRITICAL',
            created_at: '29/12/2023 14:15',
            user: 'Sargento Primero Mendez',
            messages: [
                { id: 1, sender: 'Sargento Primero Mendez', role: 'USER', content: 'Estimados, cargué la solicitud #9988 pero sigue en pendiente y cierra la liquidación mañana.', time: '14:15' },
                { id: 2, sender: 'Serrano (Agente)', role: 'AGENT', content: 'Recibido Sargento. Voy a escalar el ticket a Tesorería para que forcen la aprobación.', time: '14:20' },
            ]
        },
        '2043': {
            title: 'Descuento incorrecto Mutual Círculo',
            description: 'Me figura un descuento duplicado de la Mutual en el último resumen.',
            status: 'WAITING_USER',
            priority: 'MEDIUM',
            created_at: '28/12/2023 10:00',
            user: 'Suboficial Mayor Perez',
            messages: [
                { id: 1, sender: 'Suboficial Mayor Perez', role: 'USER', content: 'Solicito reintegro del importe mal descontado.', time: '10:00' },
                { id: 2, sender: 'Mesa de Ayuda', role: 'AGENT', content: 'Por favor adjunte copia del recibo donde figura el doble ítem para iniciar el reclamo.', time: '11:00' },
            ]
        }
    };

    const ticket = ticketsDB[id] || {
        title: 'Ticket no encontrado',
        description: 'No hay información disponible.',
        status: 'RESOLVED',
        priority: 'LOW',
        created_at: '-',
        user: 'Desconocido',
        messages: []
    };

    return (
        <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-cge-sidebar transition-colors">
                <ArrowLeft size={18} />
                <span>Volver al Panel</span>
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="text-2xl font-bold text-gray-800">Ticket #{id}</h1>
                        <Badge variant={ticket.status}>{ticket.status}</Badge>
                        <Badge variant={ticket.priority}>{ticket.priority}</Badge>
                    </div>
                    <h2 className="text-lg text-gray-600">{ticket.title}</h2>
                </div>
                <div className="flex gap-2">
                    <Button variant="secondary">Asignarme</Button>
                    <Button variant="danger">Cerrar Ticket</Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Conversation */}
                <div className="col-span-2 space-y-4">
                    <Card className="min-h-[400px] flex flex-col">
                        <div className="flex-1 space-y-4 mb-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-700 mb-1">Descripción del Problema</p>
                                <p className="text-gray-600">{ticket.description}</p>
                            </div>

                            {ticket.messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'AGENT' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg shadow-sm ${msg.role === 'AGENT'
                                            ? 'bg-blue-50 border border-blue-100'
                                            : 'bg-white border border-gray-200'
                                        }`}>
                                        <div className="flex justify-between items-center gap-4 mb-2">
                                            <span className="text-xs font-bold text-gray-700">{msg.sender}</span>
                                            <span className="text-xs text-gray-400">{msg.time}</span>
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
                            ></textarea>
                            <div className="flex justify-end mt-2">
                                <Button className="flex items-center gap-2">
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
                                    <span className="font-medium text-cge-sidebar">{ticket.user}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Responsable</span>
                                <span className="font-medium text-gray-700">--</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs uppercase tracking-wider mb-1">Fecha de Alta</span>
                                <span className="font-medium text-gray-700">{ticket.created_at}</span>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default TicketDetail;
