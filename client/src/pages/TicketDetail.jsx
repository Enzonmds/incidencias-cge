import React, { useState, useEffect, useContext, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { User, Send, ArrowLeft, MessageCircle, Mail, AlertTriangle, Lock, Paperclip, X, RotateCcw } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const TicketDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { token, user } = useContext(AuthContext);
    const [ticket, setTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null); // Lightbox State

    // Refs for auto-scroll and input focus
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Reject/Observe State
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const fetchTicket = async (isBackground = false) => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTicket(data);
                if (!isBackground) scrollToBottom();
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, token]);

    // Scroll on load/update
    useEffect(() => {
        scrollToBottom();
    }, [ticket?.messages]);

    // Focus input on load
    useEffect(() => {
        if (!loading && inputRef.current) {
            inputRef.current.focus();
        }
    }, [loading]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // GUARDS: Disable all hotkeys if ticket is closed/resolved
            // GUARDS: Disable all hotkeys if ticket is closed/resolved
            const TERMINAL_STATES = ['CERRADO', 'CERRADO_TIMEOUT', 'RESUELTO_TECNICO', 'RESOLVED', 'CLOSED', 'BAJA', 'RECHAZADO'];
            if (TERMINAL_STATES.includes(ticket?.status)) return;

            // Internal Note Toggle (Alt + I)
            if (e.altKey && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                setIsInternal(prev => !prev);
            }
            // Assign Me (Alt + A)
            if (e.altKey && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                handleAction('ASSIGN_ME');
            }
            // Quick Resolve (Alt + C)
            if (e.altKey && e.key.toLowerCase() === 'c') {
                e.preventDefault();
                handleAction('CLOSE');
            }
            // Send Message: Ctrl + Enter logic moved to Textarea to prevent double-fire
            // and ensure context.
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticket, isInternal, messageInput]); // Add dependencies needed for handlers

    const [optimisticTicket, setOptimisticTicket] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    // Sync optimistic state with real ticket when valid
    useEffect(() => {
        if (ticket) setOptimisticTicket(ticket);
    }, [ticket]);

    // Derived state for UI rendering
    const displayTicket = optimisticTicket || ticket;

    const handleAction = async (actionType) => {
        if (actionLoading) return; // Prevent double clicks
        setActionLoading(true);

        const previousTicket = { ...ticket };
        let body = {};
        let optimsticUpdate = {};

        // 1. Optimistic Update
        if (actionType === 'ASSIGN_ME') {
            body = { assigned_agent_id: user.id, status: 'IN_PROGRESS' };
            optimsticUpdate = {
                assigned_agent_id: user.id,
                status: 'IN_PROGRESS',
                assignee: { id: user.id, name: user.name, email: user.email } // Mock assignee for UI
            };
        } else if (actionType === 'CLOSE') {
            body = { status: 'RESUELTO_TECNICO' };
            optimsticUpdate = { status: 'RESUELTO_TECNICO' };
        }

        // Apply Optimistic State
        setOptimisticTicket(prev => ({ ...prev, ...optimsticUpdate }));

        try {
            // 2. Network Request
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                // 3. Success (Server Sync)
                const updatedTicket = await response.json();
                setTicket(updatedTicket);
                // optimisticTicket will sync via Effect
            } else {
                throw new Error('Action failed');
            }
        } catch (error) {
            console.error('Error updating ticket:', error);
            alert('Error al actualizar el ticket. Reintentando...');
            // 4. Revert on Error
            setOptimisticTicket(previousTicket);
        } finally {
            setActionLoading(false);
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


    // Derivation State
    const [showDeriveModal, setShowDeriveModal] = useState(false);
    const [deriveReason, setDeriveReason] = useState('');
    const [targetQueue, setTargetQueue] = useState('COORDINACION');
    const [targetAgent, setTargetAgent] = useState('');
    const [availableAgents, setAvailableAgents] = useState([]);

    const QUEUES = [
        'COORDINACION',
        'HABERES',
        'VIATICOS',
        'CASINOS',
        'DATOS_PERSONALES',
        'JUICIOS',
        'SUPLEMENTOS',
        'ALQUILERES'
    ];

    // Fetch Agents on Modal Open
    useEffect(() => {
        if (showDeriveModal) {
            fetch(`${import.meta.env.VITE_API_URL}/api/users?role=TECHNICAL_SUPPORT`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
                .then(res => res.json())
                .then(data => setAvailableAgents(Array.isArray(data) ? data : []))
                .catch(err => console.error('Error fetching agents:', err));
        }
    }, [showDeriveModal, token]);

    const handleDerive = async () => {
        if (!deriveReason.trim()) return alert('Debe indicar un motivo.');

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    cola_atencion: targetQueue,
                    assigned_agent_id: targetAgent || null, // If explicit agent selected
                    derivationReason: deriveReason
                })
            });

            if (response.ok) {
                setShowDeriveModal(false);
                setDeriveReason('');
                setTargetQueue('COORDINACION');
                setTargetAgent('');
                fetchTicket();
            } else {
                alert('Error al derivar el ticket. Intente nuevamente.');
            }
        } catch (error) {
            console.error('Error deriving ticket:', error);
            alert('Error de conexión.');
        }
    };

    const handleSendMessage = async () => {
        if (!messageInput.trim()) return;

        // Guard: Prevent sending if ticket is closed/resolved
        if (['CERRADO', 'RESUELTO_TECNICO', 'RESOLVED', 'CLOSED'].includes(ticket?.status)) {
            alert('No se pueden enviar mensajes en un ticket cerrado.');
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/tickets/${id}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: messageInput,
                    is_internal: isInternal
                })
            });

            if (response.ok) {
                setMessageInput('');
                setIsInternal(false); // Reset to public after sending
                fetchTicket();
            }
        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    if (loading) return <div className="p-8 text-center">Cargando ticket...</div>;
    if (!ticket) return null;

    const isAgent = ['ADMIN', 'AGENT', 'TECHNICAL_SUPPORT', 'HUMAN_ATTENTION'].includes(user?.role);

    // STRICT READ-ONLY MODE (FinOps/Security)
    const TERMINAL_STATES = ['CERRADO', 'CERRADO_TIMEOUT', 'RESUELTO_TECNICO', 'RESOLVED', 'CLOSED', 'BAJA', 'RECHAZADO'];
    const isEditable = ticket && !TERMINAL_STATES.includes(ticket.status);

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col gap-4">
            {/* Top Bar: Navigation & Basic Info */}
            <div className="flex justify-between items-center bg-white dark:bg-dark-card p-3 rounded-lg shadow-sm border border-gray-200 dark:border-dark-border shrink-0 transition-colors">
                <div className="flex items-center gap-4">
                    <Link to="/tickets" className="text-gray-500 dark:text-gray-400 hover:text-cge-sidebar dark:hover:text-cge-blue transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-gray-800 dark:text-white">#{displayTicket.id}</span>
                            <span className="text-gray-600 dark:text-gray-300 font-medium truncate max-w-[300px]">{displayTicket.title}</span>
                            <Badge variant={displayTicket.status}>{displayTicket.status}</Badge>
                            <Badge variant={displayTicket.priority}>{displayTicket.priority}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>Atajos:</span>
                    <span className="border dark:border-slate-600 px-1 rounded bg-gray-50 dark:bg-slate-700">Alt+A Asignar</span>
                    <span className="border dark:border-slate-600 px-1 rounded bg-gray-50 dark:bg-slate-700">Alt+C Resolver</span>
                    <span className="border dark:border-slate-600 px-1 rounded bg-gray-50 dark:bg-slate-700">Alt+I Nota Interna</span>
                </div>
            </div>

            {/* LOCKED BANNER */}
            {!isEditable && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-lg flex items-center gap-3 text-red-700 dark:text-red-300 animate-in fade-in slide-in-from-top-2">
                    <Lock size={20} />
                    <span className="font-semibold text-sm">
                        TICKET CERRADO / SOLO LECTURA
                    </span>
                    <span className="text-xs border-l border-red-300 dark:border-red-700 pl-3">
                        No se pueden realizar modificaciones, asignaciones ni enviar mensajes en este estado.
                    </span>
                </div>
            )}

            <div className="flex flex-1 gap-6 overflow-hidden">
                {/* Main Chat Area */}
                <div className="flex-1 flex flex-col bg-white dark:bg-dark-card rounded-lg shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden transition-colors">

                    {/* Messages List - Scrollable */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-dark-bg/50">
                        {/* Initial Description as System/User Message */}
                        <div className="flex justify-center my-4">
                            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-200 dark:bg-slate-800 px-3 py-1 rounded-full">
                                {new Date(ticket.createdAt).toLocaleDateString()} - Ticket Creado
                            </span>
                        </div>

                        {/* If description exists, show it as first message from user */}
                        {ticket.description && (
                            <div className="flex flex-col items-start message-animate">
                                <div className="max-w-[80%] flex gap-3">
                                    <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-gray-300 dark:bg-slate-700 text-gray-600 dark:text-gray-300`}>
                                        <User size={14} />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-baseline gap-2">
                                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{ticket.creator?.name || 'Usuario'}</span>
                                        </div>
                                        <div className="p-3 rounded-tr-xl rounded-br-xl rounded-bl-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-sm">
                                            <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{ticket.description}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {ticket.messages && ticket.messages.map((msg) => {
                            const isMe = msg.sender_id === user.id; // Correct check for "Me"
                            const isMsgInternal = msg.is_internal;
                            const isSystem = msg.sender_type === 'BOT'; // Or System

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center my-2">
                                        <span className="text-xs text-gray-500 dark:text-gray-400 italic px-2">
                                            {msg.content}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} message-animate`}>
                                    <div className={`max-w-[80%] flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                        {/* Avatar */}
                                        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${msg.sender_type === 'AGENT' ? 'bg-blue-100 text-cge-blue' : 'bg-gray-300 text-gray-600'
                                            }`}>
                                            {msg.sender_type === 'AGENT' ? <User size={14} /> : (ticket.channel === 'WHATSAPP' ? <MessageCircle size={14} /> : <User size={14} />)}
                                        </div>

                                        {/* Bubble Container */}
                                        <div className="flex flex-col gap-1">
                                            <div className={`flex items-baseline gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{msg.sender?.name || 'Desconocido'}</span>
                                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                {isMsgInternal && <span className="text-[10px] bg-yellow-100 text-yellow-800 px-1 rounded flex items-center"><Lock size={8} className="mr-1" /> Interno</span>}
                                            </div>

                                            <div className={`p-3 relative shadow-sm ${isMsgInternal
                                                ? 'bg-yellow-50 border border-yellow-200 rounded-xl'
                                                : isMe
                                                    ? 'bg-cge-blue text-white rounded-tl-xl rounded-tr-xl rounded-bl-xl'
                                                    : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-tr-xl rounded-br-xl rounded-bl-xl'
                                                }`}>
                                                {/* Content Logic (Media vs Text) */}
                                                <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe && !isMsgInternal ? 'text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                                    {(() => {
                                                        if (msg.content.startsWith('[MEDIA_URL]:')) {
                                                            const url = msg.content.replace('[MEDIA_URL]:', '').trim();
                                                            const ext = url.split('.').pop().toLowerCase();
                                                            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
                                                            const isAudio = ['mp3', 'ogg', 'wav'].includes(ext);

                                                            if (isImage) {
                                                                return (
                                                                    <div className="mt-1">
                                                                        <div
                                                                            className="cursor-pointer overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                                                                            onClick={() => setSelectedImage(url)}
                                                                        >
                                                                            <img src={url} alt="Adjunto" className="max-w-full h-auto max-h-48" />
                                                                        </div>
                                                                    </div>
                                                                );
                                                            } else if (isAudio) {
                                                                return <audio controls src={url} className="w-full mt-1 h-8" />;
                                                            } else {
                                                                return (
                                                                    <div className="flex items-center gap-2 bg-white/10 p-2 rounded border border-white/20 mt-1">
                                                                        <Paperclip size={16} />
                                                                        <a href={url} target="_blank" rel="noopener noreferrer" className="underline truncate max-w-[200px]">
                                                                            Ver Archivo
                                                                        </a>
                                                                    </div>
                                                                );
                                                            }
                                                        }
                                                        return msg.content;
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border transition-colors">
                        {user?.role !== 'MONITOR' && (
                            <>
                                {!ticket.assigned_agent_id && isEditable ? (
                                    <div className="flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-dashed border-gray-300 dark:border-slate-600 transition-colors">
                                        <p className="text-gray-500 dark:text-gray-400 mr-4 text-sm">Debes asignarte este ticket para responder.</p>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={() => handleAction('ASSIGN_ME')}
                                        >
                                            Asignarme (Alt+A)
                                        </Button>
                                    </div>
                                ) : (
                                    <div className={`relative rounded-xl border transition-colors ${!isEditable
                                        ? 'border-gray-200 bg-gray-50 dark:border-slate-700 dark:bg-slate-800/50 opacity-75'
                                        : isInternal
                                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                                            : 'border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 focus-within:border-cge-blue'
                                        }`}>
                                        <textarea
                                            ref={inputRef}
                                            className={`w-full p-3 pr-12 text-sm bg-transparent dark:text-white outline-none resize-none max-h-32 min-h-[44px] ${!isEditable
                                                ? 'text-gray-500 cursor-not-allowed'
                                                : isInternal
                                                    ? 'placeholder-yellow-700/50 dark:placeholder-yellow-500/50 text-yellow-900 dark:text-yellow-100'
                                                    : 'text-gray-900 placeholder-gray-400'
                                                }`}
                                            rows="1"
                                            placeholder={
                                                !isEditable
                                                    ? "Ticket Cerrado por Inactividad."
                                                    : isInternal
                                                        ? "Escribiendo nota interna (solo visible para agentes)..."
                                                        : "Escribe una respuesta... (Ctrl+Enter para enviar)"
                                            }
                                            value={messageInput}
                                            onChange={(e) => setMessageInput(e.target.value)}
                                            disabled={!isEditable}
                                            onKeyDown={(e) => {
                                                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                                    e.preventDefault();
                                                    handleSendMessage();
                                                }
                                            }}
                                        />

                                        <div className="absolute right-2 bottom-2 flex items-center gap-2">
                                            {/* Internal Toggle */}
                                            {isAgent && (
                                                <button
                                                    onClick={() => setIsInternal(!isInternal)}
                                                    className={`p-1.5 rounded-full transition-colors ${isInternal ? 'bg-yellow-200 text-yellow-800' : 'text-gray-400 hover:bg-gray-100'}`}
                                                    title="Nota Interna (Alt+I)"
                                                    disabled={!isEditable}
                                                >
                                                    <Lock size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={handleSendMessage}
                                                disabled={!messageInput.trim() || !isEditable || (!isInternal && ticket.is_session_expired)}
                                                className={`p-1.5 rounded-full transition-colors ${!messageInput.trim() || !isEditable
                                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                    : (isInternal ? 'bg-yellow-500 text-white hover:bg-yellow-600' : 'bg-cge-blue text-white hover:bg-blue-700')
                                                    }`}
                                            >
                                                <Send size={16} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Context Info */}
                <div className="w-80 shrink-0 space-y-4 overflow-y-auto">
                    {/* Actions Panel */}
                    {isAgent && isEditable && (
                        <Card className="p-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase mb-3">Acciones Rápidas</h3>
                            <div className="flex flex-col gap-2">
                                {!ticket.assigned_agent_id && (
                                    <Button variant="secondary" className="w-full justify-start text-sm" onClick={() => handleAction('ASSIGN_ME')}>
                                        <span className="w-5">🙋</span> Asignarme
                                    </Button>
                                )}

                                {ticket.status === 'PENDIENTE_VALIDACION' && (
                                    <Button
                                        className="w-full justify-start text-sm bg-orange-100 text-orange-700 hover:bg-orange-200"
                                        onClick={() => setShowRejectModal(true)}
                                    >
                                        <span className="w-5">❌</span> Rechazar / Observar
                                    </Button>
                                )}

                                {ticket.assigned_agent_id && (
                                    <>
                                        <Button variant="danger" className="w-full justify-start text-sm" onClick={() => handleAction('CLOSE')}>
                                            <span className="w-5">✅</span> Marcar Resuelto
                                        </Button>

                                        <div className="h-px bg-gray-200 dark:bg-gray-700 my-2"></div>

                                        <Button
                                            className="w-full justify-start text-sm bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 dark:bg-slate-700 dark:text-indigo-300 dark:hover:bg-slate-600 dark:border-slate-600"
                                            onClick={() => setShowDeriveModal(true)}
                                        >
                                            <span className="w-5"><RotateCcw size={16} /></span> Derivar / Transferir
                                        </Button>
                                    </>
                                )}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 px-1">Detalles del Ticket</h3>
                        <div className="space-y-4 px-1">
                            <div>
                                <span className="text-xs text-gray-400 block mb-1">Solicitante</span>
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-gray-500">
                                        {ticket.channel === 'WHATSAPP' ? <MessageCircle size={14} /> : <Mail size={14} />}
                                    </div>
                                    <span className="text-sm font-medium truncate">{ticket.creator?.name || ticket.solicitante_nombre_completo}</span>
                                </div>
                                <div className="text-xs text-gray-500 ml-8">
                                    {ticket.creator?.email || ticket.solicitante_email}
                                    <br />
                                    {ticket.telefono_contacto || ticket.creator?.phone}
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-3">
                                <span className="text-xs text-gray-400 block mb-1">Agente Asignado</span>
                                {ticket.assignee ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                                            {ticket.assignee.name.charAt(0)}
                                        </div>
                                        <span className="text-sm">{ticket.assignee.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-sm text-gray-400 italic">-- Sin asignar --</span>
                                )}
                            </div>

                            <div className="border-t border-gray-100 pt-3 grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-gray-400 block mb-1">Impacto</span>
                                    <Badge variant={ticket.impact || 'LOW'} className="scale-90 origin-left">{ticket.impact}</Badge>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 block mb-1">Urgencia</span>
                                    <Badge variant={ticket.urgency || 'LOW'} className="scale-90 origin-left">{ticket.urgency}</Badge>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Rejection Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-96 p-6 shadow-xl border-orange-200">
                        <div className="flex items-center gap-2 mb-4 text-orange-600">
                            <AlertTriangle size={24} />
                            <h2 className="text-lg font-bold">Observar Ticket</h2>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Indique el motivo. Esto notificará al usuario para que corrija la información.
                        </p>
                        <textarea
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-orange-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                            rows="4"
                            placeholder="Ej: Falta adjuntar el recibo de haberes..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            autoFocus
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <Button variant="secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); }}>Cancelar</Button>
                            <Button className="bg-orange-500 hover:bg-orange-600 text-white" onClick={handleReject}>Confirmar</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Derivation Modal */}
            {showDeriveModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-96 p-6 shadow-xl border-blue-200">
                        <div className="flex items-center gap-2 mb-4 text-blue-600">
                            <RotateCcw size={24} />
                            <h2 className="text-lg font-bold">Derivar / Transferir Ticket</h2>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Seleccione el área o usuario de destino y el motivo de la derivación.
                        </p>

                        {/* Queue Selector */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Área de Destino</label>
                            <select
                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                value={targetQueue}
                                onChange={(e) => setTargetQueue(e.target.value)}
                            >
                                {QUEUES.map(q => <option key={q} value={q}>{q}</option>)}
                            </select>
                        </div>

                        {/* Agent Selector (Optional) */}
                        <div className="mb-3">
                            <label className="block text-xs font-bold text-gray-500 mb-1">Asignar a Agente (Opcional)</label>
                            <select
                                className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                value={targetAgent}
                                onChange={(e) => setTargetAgent(e.target.value)}
                            >
                                <option value="">-- Sin asignar (En Cola) --</option>
                                {availableAgents.map(agent => (
                                    <option key={agent.id} value={agent.id}>{agent.name} ({agent.email})</option>
                                ))}
                            </select>
                        </div>

                        <label className="block text-xs font-bold text-gray-500 mb-1">Motivo (Requerido)</label>
                        <textarea
                            className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-3 text-sm mb-4 focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                            rows="3"
                            placeholder="Ej: Corresponde a otra área, falta información crítica..."
                            value={deriveReason}
                            onChange={(e) => setDeriveReason(e.target.value)}
                            autoFocus
                        ></textarea>
                        <div className="flex justify-end gap-2">
                            <Button
                                className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
                                onClick={() => { setShowDeriveModal(false); setDeriveReason(''); }}
                            >
                                Cancelar
                            </Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleDerive}>Confirmar Derivación</Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Image Lightbox Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-full transition-colors"
                        onClick={() => setSelectedImage(null)}
                    >
                        <X size={32} />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Full size"
                        className="max-w-full max-h-full object-contain rounded shadow-2xl scale-100"
                        onClick={(e) => e.stopPropagation()} // Prevent close when clicking image
                    />
                </div>
            )}
        </div>
    );
};

export default TicketDetail;
