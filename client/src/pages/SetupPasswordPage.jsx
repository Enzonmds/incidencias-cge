import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

const SetupPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Las contraseñas no coinciden');
            return;
        }

        if (password.length < 6) {
            setError('La contraseña debe tener al menos 6 caracteres');
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/setup-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('¡Contraseña establecida con éxito!');
                navigate('/login');
            } else {
                setError(data.message || 'Error al establecer contraseña');
            }
        } catch (err) {
            setError('Error de conexión con el servidor');
        } finally {
            setLoading(false);
        }
    };

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Card className="p-8 text-center max-w-md">
                    <h2 className="text-xl font-bold text-red-600 mb-2">Enlace Inválido</h2>
                    <p className="text-gray-600">No se ha proporcionado un token de invitación válido.</p>
                    <Button className="mt-4 w-full" onClick={() => navigate('/login')}>Ir al Login</Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-cge-bg bg-cover bg-center">
            <div className="absolute inset-0 bg-black bg-opacity-60"></div>
            <Card className="relative z-10 w-full max-w-md p-8 shadow-2xl">
                <div className="text-center mb-6">
                    <h1 className="text-2xl font-bold text-cge-primary">Bienvenido a Incidencias CGE</h1>
                    <p className="text-gray-500 mt-2">Por favor, define tu contraseña para activar tu cuenta.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nueva Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="Confirmar Contraseña"
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Guardando...' : 'Activar Cuenta'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default SetupPasswordPage;
