import React from 'react';
import Card from '../components/ui/Card';
import { MessageCircle, Server, Database, Users, Send, CheckCircle, ArrowRight, Smartphone, Bot, RefreshCcw } from 'lucide-react';

const SystemFlowPage = () => {
    const steps = [
        {
            id: 1,
            title: "1. Inicio de Consulta",
            icon: <Smartphone size={32} className="text-gray-600" />,
            description: "El Colaborador inicia una consulta. El sistema valida su identidad automáticamente.",
            details: [
                "👤 Acción Humana",
                "Canal: WhatsApp o Correo electrónico.",
                "El sistema identifica al colaborador activo en la BD."
            ],
            color: "border-gray-400 bg-gray-50 dark:bg-slate-800 dark:border-slate-600",
            type: "USER"
        },
        {
            id: 2,
            title: "2. Ingreso & Entendimiento",
            icon: <Bot size={32} className="text-blue-600" />,
            description: "El Asistente Virtual analiza la consulta para comprender la necesidad.",
            details: [
                "🤖 Acción Automática",
                "Ingreso: La consulta es recibida por el servidor.",
                "IA (NLP): Interpreta el texto (Ej: 'Duda sobre recibo')."
            ],
            color: "border-blue-500 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800",
            type: "BOT"
        },
        {
            id: 3,
            title: "3. Derivación Automática",
            icon: <Database size={32} className="text-indigo-600" />,
            description: "El sistema dirige la consulta al área capacitada para responder.",
            details: [
                "🤖 Acción Automática",
                "Reglas: Si es Hardware -> Área Soporte.",
                "Reglas: Si es Liquidación -> Área Haberes.",
                "Se notifica al equipo correspondiente."
            ],
            color: "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10 dark:border-indigo-800",
            type: "BOT"
        },
        {
            id: 4,
            title: "4. Respuesta & Atención",
            icon: <Users size={32} className="text-orange-600" />,
            description: "Un especialista analiza la consulta y elabora una respuesta o solución.",
            details: [
                "👤 Acción Humana",
                "El especialista recibe la consulta.",
                "Utiliza herramientas internas para gestionar la respuesta.",
                "Envía la solución propuesta al colaborador."
            ],
            color: "border-orange-500 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800",
            type: "HUMAN"
        },
        {
            id: 5,
            title: "5. Intercambio (Si es necesario)",
            icon: <RefreshCcw size={32} className="text-orange-600" />,
            description: "Se solicitan aclaraciones adicionales para una respuesta precisa.",
            details: [
                "👤 Acción Humana",
                "El especialista solicita más detalles.",
                "El colaborador responde desde su WhatsApp.",
                "El historial queda registrado en la consulta."
            ],
            color: "border-orange-500 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-800",
            type: "HUMAN"
        },
        {
            id: 6,
            title: "6. Conformidad & Cierre",
            icon: <CheckCircle size={32} className="text-green-600" />,
            description: "El Colaborador confirma que su consulta fue resuelta y cierra el ciclo.",
            details: [
                "👤 Acción Humana (Usuario Final)",
                "El especialista marca 'Resuelto' (Propuesta).",
                "El usuario recibe: '¿Estás conforme?'.",
                "El usuario responde 'SI' -> La consulta se cierra."
            ],
            color: "border-green-500 bg-green-50 dark:bg-green-900/10 dark:border-green-800",
            type: "USER"
        }
    ];

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Ciclo de Vida de la Consulta</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Visualización del proceso de atención desde la inquietud hasta la conformidad del usuario.</p>
                <div className="flex gap-4 text-sm font-medium">
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                        <Users size={14} /> Acción Humana
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                        <Bot size={14} /> Automatización / IA
                    </span>
                </div>
            </div>

            <div className="relative">
                {/* Connecting Line (Desktop) */}
                <div className="hidden lg:block absolute top-1/2 left-0 w-full h-1 bg-gray-200 dark:bg-slate-700 -z-10 transform -translate-y-1/2 rounded"></div>

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    {steps.map((step, index) => (
                        <div key={step.id} className="relative group hover:-translate-y-2 transition-transform duration-300">
                            {/* Arrow Indicator for Mobile */}
                            {index < steps.length - 1 && (
                                <div className="lg:hidden flex justify-center my-2">
                                    <ArrowRight className="text-gray-300" />
                                </div>
                            )}

                            <Card className={`h-full border-2 ${step.color} shadow-lg relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:scale-[1.02]`}>
                                {/* Actor Badge */}
                                <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg
                                    ${step.type === 'BOT' ? 'bg-blue-600 text-white' :
                                        step.type === 'HUMAN' && step.id !== 1 && step.id !== 6 ? 'bg-orange-500 text-white' :
                                            'bg-gray-500 text-white'}`}>
                                    {step.type === 'BOT' ? 'AUTOMATIZADO' : step.id === 1 ? 'USUARIO' : 'HUMANO'}
                                </div>

                                <div className="flex flex-col items-center text-center space-y-4 pt-6">
                                    <div className={`p-4 rounded-full bg-white shadow-md ring-4 ring-opacity-20 ${step.color.replace('border-', 'ring-').replace('bg-', 'text-')}`}>
                                        {step.icon}
                                    </div>

                                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg">{step.title}</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed min-h-[60px] px-2">
                                        {step.description}
                                    </p>

                                    <div className="w-full bg-white/60 dark:bg-black/20 rounded-lg p-3 text-left space-y-2 text-xs text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-slate-700">
                                        {step.details.map((detail, i) => (
                                            <div key={i} className="flex items-start gap-2">
                                                <CheckCircle size={12} className={`mt-0.5 flex-shrink-0 ${step.type === 'BOT' ? 'text-blue-500' : 'text-orange-500'}`} />
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

            <Card className="bg-gray-800 dark:bg-slate-900 text-white p-6 mt-8 border border-gray-700 dark:border-slate-700">
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
