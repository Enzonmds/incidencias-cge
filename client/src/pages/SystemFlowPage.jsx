import React from 'react';
import Card from '../components/ui/Card';
import { MessageCircle, Server, Database, Users, Send, CheckCircle, ArrowRight, Smartphone, Bot, RefreshCcw } from 'lucide-react';

const SystemFlowPage = () => {
    const steps = [
        {
            id: 1,
            title: "1. Inicio de Solicitud",
            icon: <Smartphone size={32} className="text-green-600" />,
            description: "El Usuario envía un mensaje vía WhatsApp o Email.",
            details: ["DNI, Grado y Unidad extraídos.", "Validación automática de identidad.", "Detalle del problema.", "Origen: Externo (Red Segura)."],
            color: "border-green-200 bg-green-50"
        },
        {
            id: 2,
            title: "2. Ingesta & Procesamiento",
            icon: <Bot size={32} className="text-blue-600" />,
            description: "El Bot de CGE recibe y clasifica el mensaje.",
            details: ["Análisis de texto (NLP).", "Creación de Ticket en BD.", "Asignación de prioridad inicial."],
            color: "border-blue-200 bg-blue-50"
        },
        {
            id: 3,
            title: "3. Enrutamiento Inteligente",
            icon: <Database size={32} className="text-purple-600" />,
            description: "Distribución automática a la cola correspondiente.",
            details: ["Reglas: 'Haberes' -> Gastos Personal.", "Reglas: 'SAF' -> Sistemas.", "SLA Timer iniciado."],
            color: "border-purple-200 bg-purple-50"
        },
        {
            id: 4,
            title: "4. Gestión Técnica",
            icon: <Users size={32} className="text-orange-600" />,
            description: "El Agente Técnico resuelve la incidencia o solicita más datos.",
            details: ["Acceso a herramientas (MLH).", "Comunicación interna.", "Cambio de estado a 'Resuelto'."],
            color: "border-orange-200 bg-orange-50"
        },
        {
            id: 5,
            title: "5. Interacción (Bucle)",
            icon: <RefreshCcw size={32} className="text-yellow-600" />,
            description: "El Agente solicita datos faltantes específicos (Ej: Foto del recibo).",
            details: ["Usuario responde directo al chat.", "No se pide DNI nuevamente (Sesión Activa).", "Actualización inmediata del Ticket."],
            color: "border-yellow-200 bg-yellow-50"
        },
        {
            id: 6,
            title: "6. Notificación Final",
            icon: <Send size={32} className="text-teal-600" />,
            description: "Respuesta enviada al canal original del usuario.",
            details: ["Notificación WhatsApp Automática.", "Encuesta de satisfacción.", "Cierre del Ticket."],
            color: "border-teal-200 bg-teal-50"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800">Flujo del Sistema y Retroalimentación</h1>
                <p className="text-gray-500">Visualización del ciclo de vida de una incidencia desde WhatsApp hasta su resolución.</p>
            </div>

            <div className="relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 transform -translate-y-1/2 rounded"></div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {steps.map((step, index) => (
                        <div key={step.id} className="relative group hover:-translate-y-2 transition-transform duration-300">
                            {/* Arrow Indicator for Mobile */}
                            {index < steps.length - 1 && (
                                <div className="lg:hidden flex justify-center my-2">
                                    <ArrowRight className="text-gray-300" />
                                </div>
                            )}

                            <Card className={`h-full border-t-4 ${step.color} shadow-lg`}>
                                <div className="flex flex-col items-center text-center space-y-4">
                                    <div className={`p-4 rounded-full bg-white shadow-sm border ${step.color.split(' ')[0]}`}>
                                        {step.icon}
                                    </div>

                                    <h3 className="font-bold text-gray-800">{step.title}</h3>
                                    <p className="text-sm text-gray-600 leading-relaxed min-h-[60px]">
                                        {step.description}
                                    </p>

                                    <div className="w-full bg-white/50 rounded-lg p-3 text-left space-y-2 text-xs text-gray-500">
                                        {step.details.map((detail, i) => (
                                            <div key={i} className="flex items-center gap-2">
                                                <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                                                <span>{detail}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </Card>

                            {/* Arrow Indicator for Desktop */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10 translate-x-1/2">
                                    <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm">
                                        <ArrowRight size={20} className="text-gray-400" />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            <Card className="bg-gray-800 text-white p-6 mt-8">
                <div className="flex items-center gap-4">
                    <Server size={40} className="text-blue-400" />
                    <div>
                        <h3 className="font-bold text-lg">Arquitectura de Procesamiento</h3>
                        <p className="text-gray-300 text-sm">
                            Todo el flujo es orquestado por el Backend (Node.js + Docker), que integra la API de WhatsApp Business con el motor de base de datos PostgreSQL y el servicio de SLAs background.
                        </p>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default SystemFlowPage;
