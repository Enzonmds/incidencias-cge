import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

import logo from '../assets/logo_cge.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-cge-sidebar">
            <Card className="w-full max-w-md p-8">
                <div className="text-center mb-8">
                    <img src={logo} alt="CGE Logo" className="w-24 h-24 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-bold text-cge-sidebar mb-2">Consultas CGE</h1>
                    <p className="text-gray-500">Ingrese sus credenciales para continuar</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <Input
                        label="Email o DNI"
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="admin@cge.mil.ar o DNI"
                        required
                        autoFocus
                    />

                    <Input
                        label="Contraseña"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    {error && (
                        <div className="bg-red-50 text-cge-red p-3 rounded-lg text-sm text-center">
                            {error}
                        </div>
                    )}

                    <Button type="submit" className="w-full py-3">
                        Ingresar
                    </Button>

                    <div className="text-center text-xs text-gray-400 mt-4">
                        Sistema de Gestión de Consultas v1.0 - División Sistemas Informáticos - CGE
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default Login;
