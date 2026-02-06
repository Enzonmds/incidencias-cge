import React, { useState, useEffect, useContext } from 'react';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { UserPlus, Search, Shield, User, Edit, Trash2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const UsersPage = () => {
    const { token } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('internal');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [internalUsers, setInternalUsers] = useState([]);
    const [adUsers, setAdUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const ROLES = [
        { value: 'ADMIN', label: 'Administrador' },
        { value: 'AGENT', label: 'Agente General' },
        { value: 'HUMAN_ATTENTION', label: 'Mesa de Ayuda (Triaje)' },
        { value: 'TECHNICAL_SUPPORT', label: 'Soporte Técnico' },
        { value: 'USER', label: 'Usuario Final' }
    ];

    const fetchUsers = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setInternalUsers(data.map(u => ({ ...u, status: 'ACTIVE' })));
            }
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const fetchAdUsers = async () => {
        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/ad`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                setAdUsers(await response.json());
            }
        } catch (error) {
            console.error('Error fetching AD users:', error);
        }
    };

    const fetchAllData = async () => {
        setLoading(true);
        await Promise.all([fetchUsers(), fetchAdUsers()]);
        setLoading(false);
    };

    useEffect(() => {
        if (token) fetchAllData();
    }, [token]);

    const handleSaveUser = async (e) => {
        e.preventDefault();
        const formData = {
            name: e.target.name.value,
            dni: e.target.dni.value, // Added DNI
            email: e.target.email.value,
            role: e.target.role.value
        };

        if (editingUser) {
            // Update
            try {
                const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${editingUser.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });

                if (response.ok) {
                    setShowCreateModal(false);
                    setEditingUser(null);
                    fetchUsers();
                    alert('Usuario actualizado correctamente');
                } else {
                    alert('Error al actualizar usuario');
                }
            } catch (error) { console.error(error); alert('Error de conexión'); }
        } else {
            // Create
            formData.password = 'Cge.1234'; // Default temp password since field is removed
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
                    fetchUsers();
                    e.target.reset();
                    alert('Usuario creado. Se ha enviado un correo al usuario para establecer su contraseña.');
                } else {
                    alert('Error al crear usuario');
                }
            } catch (error) {
                alert('Error de conexión por favor verifique que la VPN esté conectada');
            }
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("¿Seguro que deseas eliminar este usuario?")) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                alert('Usuario eliminado correctamente.');
                fetchUsers();
            } else {
                const data = await response.json();
                alert(data.message || 'Error al eliminar usuario.');
            }
        } catch (error) {
            console.error(error);
            alert('Error de conexión');
        }
    };

    const handleResetPassword = async () => {
        if (!editingUser) return;
        if (!confirm(`¿Enviar email de restablecimiento a ${editingUser.email}?`)) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_URL}/api/users/${editingUser.id}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                alert('Email de restablecimiento enviado correctamente.');
            } else {
                alert('Error al enviar email.');
            }
        } catch (error) {
            console.error(error);
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
                    <UserPlus size={18} /> Nuevo Usuario
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
                <input
                    placeholder="Buscar por nombre, email o legajo..."
                    className="flex-1 outline-none text-sm"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </Card>

            {/* List */}
            <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th className="p-4">Usuario</th>
                                <th className="p-4">DNI</th>
                                <th className="p-4">Email</th>
                                <th className="p-4">Rol / Unidad</th>
                                <th className="p-4">Estado</th>
                                {activeTab === 'internal' && <th className="p-4">Acciones</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {loading && activeTab === 'internal' ? (
                                <tr><td colSpan="5" className="p-4 text-center">Cargando usuarios...</td></tr>
                            ) : (activeTab === 'internal' ? internalUsers : adUsers)
                                .filter(u =>
                                    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    u.email.toLowerCase().includes(searchTerm.toLowerCase())
                                )
                                .map((u) => (
                                    <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                                {u.role ? <Shield size={14} /> : <User size={14} />}
                                            </div>
                                            <span className="font-medium text-gray-900">{u.name}</span>
                                        </td>
                                        <td className="p-4 text-gray-600 font-mono">{u.dni || '-'}</td>
                                        <td className="p-4 text-gray-600">{u.email}</td>
                                        <td className="p-4">
                                            {u.role ? (
                                                <Badge variant={u.role}>{u.role}</Badge>
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
                                            <td className="p-4 flex gap-2">
                                                <button onClick={() => { setEditingUser(u); setShowCreateModal(true); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <Card className="w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <Input name="name" label="Nombre Completo" defaultValue={editingUser?.name} required />
                            <Input name="dni" label="DNI" defaultValue={editingUser?.dni} placeholder="Opcional" />
                            <Input name="email" label="Email CGE" type="email" defaultValue={editingUser?.email} required />

                            {/* Password field removed/hidden as per requirements */}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                                <select name="role" defaultValue={editingUser?.role || 'USER'} className="w-full border border-gray-300 rounded-lg p-2 text-sm">
                                    {ROLES.map(r => (
                                        <option key={r.value} value={r.value}>{r.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex justify-end gap-2 mt-6">
                                <Button type="button" variant="secondary" onClick={() => { setShowCreateModal(false); setEditingUser(null); }}>Cancelar</Button>
                                {editingUser && (
                                    <Button type="button" className="bg-yellow-500 hover:bg-yellow-600 text-white" onClick={handleResetPassword}>
                                        Restablecer Clave
                                    </Button>
                                )}
                                <Button type="submit">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                            </div>
                        </form>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
