import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { UserPlus, Search, Shield, User } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const UsersPage = () => {
    const { token } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('internal');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [internalUsers, setInternalUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const [adUsers, setAdUsers] = useState([
        { id: 101, name: 'Capitán Gutierrez', email: 'jgutierrez@ejercito.cl', unit: 'Regimiento de Infantería 1', status: 'SYNCED' },
        { id: 102, name: 'Sargento Mendez', email: 'mmendez@ejercito.cl', unit: 'Batallón Logístico', status: 'SYNCED' },
        { id: 103, name: 'Suboficial Perez', email: 'pperez@ejercito.cl', unit: 'Comando de Personal', status: 'SYNCED' },
    ]);

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Add status 'ACTIVE' for UI consistency if missing from API
                const formattedUsers = data.map(u => ({
                    ...u,
                    status: 'ACTIVE' // Default status for now
                }));
                setInternalUsers(formattedUsers);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchUsers();
        }
    }, [token]);

    const handleCreateAdmin = async (e) => {
        e.preventDefault();
        const formData = {
            name: e.target.name.value,
            email: e.target.email.value,
            password: e.target.password.value,
            role: 'ADMIN'
        };

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setShowCreateModal(false);
                fetchUsers(); // Refresh list
                e.target.reset();
            } else {
                alert('Error al crear usuario');
            }
        } catch (error) {
            console.error('Error creating user:', error);
            alert('Error de conexión');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Gestión de Usuarios</h1>
                    <p className="text-gray-500">Administración de accesos y sincronización AD</p>
                </div>
                <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
                    <UserPlus size={18} /> Nuevo Admin
                </Button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-gray-200">
                <button
                    className={`pb-2 px-1 font-medium ${activeTab === 'internal' ? 'text-cge-sidebar border-b-2 border-cge-sidebar' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('internal')}
                >
                    Administradores & Agentes
                </button>
                <button
                    className={`pb-2 px-1 font-medium ${activeTab === 'external' ? 'text-cge-sidebar border-b-2 border-cge-sidebar' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('external')}
                >
                    Usuarios AD (Active Directory)
                </button>
            </div>

            {/* Search Bar */}
            <Card className="p-4 flex gap-4 items-center">
                <Search className="text-gray-400" />
                <input placeholder="Buscar por nombre, email o legajo..." className="flex-1 outline-none text-sm" />
            </Card>

            {/* List */}
            <Card className="overflow-hidden">
                <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                        <tr>
                            <th className="p-4">Usuario</th>
                            <th className="p-4">Email</th>
                            <th className="p-4">Rol / Unidad</th>
                            <th className="p-4">Estado</th>
                            {activeTab === 'internal' && <th className="p-4">Acciones</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {loading && activeTab === 'internal' ? (
                            <tr><td colSpan="5" className="p-4 text-center">Cargando usuarios...</td></tr>
                        ) : (activeTab === 'internal' ? internalUsers : adUsers).map((u) => (
                            <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                                <td className="p-4 flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                        {u.role ? <Shield size={14} /> : <User size={14} />}
                                    </div>
                                    <span className="font-medium text-gray-900">{u.name}</span>
                                </td>
                                <td className="p-4 text-gray-600">{u.email}</td>
                                <td className="p-4">
                                    {u.role ? (
                                        <span className={`text-xs font-bold px-2 py-1 rounded bg-opacity-10 ${u.role === 'ADMIN' ? 'bg-purple-600 text-purple-700' : 'bg-blue-600 text-blue-700'}`}>
                                            {u.role}
                                        </span>
                                    ) : (
                                        <span className="text-gray-500 italic">{u.unit}</span>
                                    )}
                                </td>
                                <td className="p-4">
                                    <Badge variant={u.status === 'ACTIVE' || u.status === 'SYNCED' ? 'RESOLVED' : 'LOW'}>
                                        {u.status}
                                    </Badge>
                                </td>
                                {activeTab === 'internal' && (
                                    <td className="p-4">
                                        <button className="text-cge-blue hover:underline">Editar</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Create Admin Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <Card className="w-96 p-6">
                        <h2 className="text-xl font-bold mb-4">Alta de Administrador</h2>
                        <form onSubmit={handleCreateAdmin} className="space-y-4">
                            <Input name="name" label="Nombre Completo" required />
                            <Input name="email" label="Email CGE" type="email" required />
                            <Input name="password" label="Contraseña Temporal" type="password" required />
                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="secondary" onClick={() => setShowCreateModal(false)}>Cancelar</Button>
                                <Button type="submit">Crear Usuario</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
