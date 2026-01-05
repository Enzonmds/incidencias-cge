import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

const VerifyWhatsAppPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const { user, login } = useAuth(); // Assuming login function is available
    const navigate = useNavigate();

    const [status, setStatus] = useState('idle'); // idle, verifying, success, error, waiting_login
    const [message, setMessage] = useState('');
    const [canLogout, setCanLogout] = useState(false);

    // Login State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Token inválido o faltante.');
            return;
        }

        if (user) {
            // Already logged in, proceed to verify
            verifyLink();
        } else {
            // Need to login first
            setStatus('waiting_login');
        }
    }, [user, token]);

    const verifyLink = async () => {
        setStatus('verifying');
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            const response = await fetch(`${apiUrl}/api/auth/verify-whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}` // Send user session
                },
                body: JSON.stringify({
                    whatsappToken: token,
                    userId: user?.id
                })
            });

            const data = await response.json();

            if (response.ok) {
                setStatus('success');
                setMessage('Su identidad ha sido verificada correctamente. Redirigiendo a WhatsApp...');
                // Auto-redirect to WhatsApp
                setTimeout(() => {
                    const botNumber = import.meta.env.VITE_BOT_NUMBER;
                    if (botNumber) {
                        window.location.href = `https://wa.me/${botNumber}`;
                    } else {
                        // Fallback if number not configured
                        window.location.href = `https://web.whatsapp.com`;
                    }
                }, 2000);
            } else {
                setStatus('error');
                setMessage(data.message || 'Error al verificar.');
                // If Forbidden (403), allow logout
                if (response.status === 403) {
                    setCanLogout(true);
                }
            }
        } catch (error) {
            console.error(error);
            setStatus('error');
            setMessage('Error de conexión con el servidor.');
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');
        try {
            const result = await login(email, password);
            if (!result.success) {
                setLoginError(result.error || 'Credenciales incorrectas');
            }
        } catch (err) {
            console.error(err);
            setLoginError('Ocurrió un error inesperado');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">

                {status === 'waiting_login' && (
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-4">Verificación de WhatsApp</h2>
                        <p className="text-slate-600 mb-6">Por favor, inicie sesión con su cuenta del CGE para vincular su número.</p>

                        <form onSubmit={handleLogin} className="space-y-4 text-left">
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Email o DNI</label>
                                <input
                                    type="text"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    placeholder="usuario@cge.mil.ar o DNI"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                                    required
                                />
                            </div>

                            {loginError && (
                                <div className="text-red-500 text-sm bg-red-50 p-2 rounded-md border border-red-200">
                                    {loginError}
                                </div>
                            )}
                            <button
                                type="submit"
                                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                            >
                                Ingresar y Verificar
                            </button>
                        </form>
                    </div>
                )}

                {status === 'verifying' && (
                    <div className="flex flex-col items-center">
                        <Loader2 className="h-12 w-12 text-indigo-600 animate-spin mb-4" />
                        <h3 className="text-xl font-semibold text-slate-700">Verificando...</h3>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex flex-col items-center">
                        <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">¡Verificación Exitosa!</h3>
                        <p className="text-slate-600">{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex flex-col items-center">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Error</h3>
                        <p className="text-red-500 whitespace-pre-line mb-4">{message}</p>

                        {canLogout && (
                            <button
                                onClick={() => {
                                    localStorage.removeItem('token');
                                    localStorage.removeItem('user');
                                    window.location.reload();
                                }}
                                className="mt-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700"
                            >
                                Cerrar Sesión
                            </button>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default VerifyWhatsAppPage;
