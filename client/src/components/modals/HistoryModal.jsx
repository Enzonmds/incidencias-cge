import React, { useState, useEffect, useContext } from 'react';
import { X, MessageCircle, User, Loader } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import Card from '../ui/Card';
import Button from '../ui/Button';

const HistoryModal = ({ ticketId, onClose }) => {
    const { token } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTicketDetails = async () => {
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${ticketId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (response.ok) {
                    const data = await response.json();
                    setTicket(data);
                }
            } catch (error) {
                console.error('Error fetching ticket history:', error);
            } finally {
                setLoading(false);
            }
        };

        if (ticketId) {
            fetchTicketDetails();
        }
    }, [ticketId, token]);

    if (!ticketId) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <Card className="w-full max-w-2xl h-[600px] flex flex-col p-0 overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b dark:border-slate-700 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <MessageCircle size={20} className="text-cge-blue" />
                        <h3 className="font-bold text-lg dark:text-white">
                            Historial: Ticket #{ticketId}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-100 dark:bg-dark-bg">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <Loader size={32} className="animate-spin mb-2" />
                            <p>Cargando historial...</p>
                        </div>
                    ) : ticket ? (
                        <>
                            {/* Original Description */}
                            <div className="flex flex-col items-start">
                                <span className="text-xs text-gray-500 ml-1 mb-1 font-medium">Descripción Original</span>
                                <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl rounded-tl-none text-sm border border-gray-200 dark:border-slate-600 shadow-sm max-w-[90%]">
                                    <p className="dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="flex items-center gap-4 py-2">
                                <div className="h-px bg-gray-300 dark:bg-slate-600 flex-1"></div>
                                <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Inicio del Chat</span>
                                <div className="h-px bg-gray-300 dark:bg-slate-600 flex-1"></div>
                            </div>

                            {/* Messages */}
                            {ticket.messages && ticket.messages.map((msg, idx) => {
                                const isAgent = msg.sender_type === 'AGENT' || msg.sender_type === 'SYSTEM';
                                return (
                                    <div key={idx} className={`flex flex-col ${isAgent ? 'items-end' : 'items-start'}`}>
                                        <div className={`flex items-end gap-2 max-w-[85%] ${isAgent ? 'flex-row-reverse' : 'flex-row'}`}>

                                            {/* Avatar/Icon */}
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isAgent
                                                    ? 'bg-cge-blue text-white'
                                                    : 'bg-gray-300 dark:bg-slate-600 text-gray-600 dark:text-gray-300'
                                                }`}>
                                                <User size={14} />
                                            </div>

                                            {/* Bubble */}
                                            <div className={`p-3 rounded-2xl text-sm shadow-sm relative group ${isAgent
                                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                                    : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-800 dark:text-gray-200 rounded-tl-none'
                                                }`}>
                                                <p className="whitespace-pre-wrap">{msg.content}</p>

                                                {/* Timestamp inside or outside? Let's put it outside or small inside */}
                                                <span className={`text-[10px] block mt-1 opacity-70 ${isAgent ? 'text-blue-100' : 'text-gray-400'}`}>
                                                    {new Date(msg.createdAt).toLocaleString()} • {isAgent ? 'Agente' : 'Solicitante'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* End of Chat */}
                            <div className="text-center py-4">
                                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-slate-800 px-3 py-1 rounded-full">Fin del historial</span>
                            </div>
                        </>
                    ) : (
                        <div className="text-center text-red-500">Error al cargar el ticket.</div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-right">
                    <Button variant="secondary" onClick={onClose}>Cerrar</Button>
                </div>
            </Card>
        </div>
    );
};

export default HistoryModal;
