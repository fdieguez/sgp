import { useEffect, useState } from 'react';
import api from '../config/axios';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    UserPlus,
    Pencil,
    Trash2,
    Shield,
    User as UserIcon,
    AlertCircle
} from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [formData, setFormData] = useState({ email: '', password: '', role: 'USER' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/users');
            setUsers(response.data);
        } catch (err) {
            console.error(err);
            setError('Error cargando usuarios');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (editingUser) {
                // Update
                await api.put(`/api/users/${editingUser.id}`, formData);
            } else {
                // Create
                await api.post('/api/users', formData);
            }
            setShowModal(false);
            setFormData({ email: '', password: '', role: 'USER' });
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            alert(err.response?.data || 'Error al guardar usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

        try {
            await api.delete(`/api/users/${id}`);
            fetchUsers();
        } catch (err) {
            alert('Error al eliminar usuario');
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setFormData({ email: user.email, password: '', role: user.role });
        setShowModal(true);
    };

    const openCreateModal = () => {
        setEditingUser(null);
        setFormData({ email: '', password: '', role: 'USER' });
        setShowModal(true);
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-5xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </Link>

                    <div className="flex justify-between items-center">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Usuarios</h1>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors"
                        >
                            <UserPlus className="h-4 w-4" />
                            Nuevo Usuario
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 flex items-center gap-2 text-red-400">
                        <AlertCircle className="h-5 w-5" />
                        {error}
                    </div>
                )}

                {/* Users Table */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-900/50 border-b border-gray-700">
                            <tr>
                                <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                                <th className="p-4 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Rol</th>
                                <th className="p-4 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <UserIcon className="h-4 w-4 text-gray-400" />
                                            <span className="text-sm text-gray-300">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border border-purple-700' : 'bg-gray-700 text-gray-300 border border-gray-600'}`}>
                                            {user.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => openEditModal(user)}
                                                className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Editar"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id)}
                                                className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {users.length === 0 && (
                        <div className="p-12 text-center text-gray-500">
                            No hay usuarios registrados
                        </div>
                    )}
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold text-white mb-4">
                            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Contraseña {editingUser && <span className="text-gray-500">(dejar vacío para no cambiar)</span>}
                                </label>
                                <input
                                    type="password"
                                    required={!editingUser}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Rol</label>
                                <select
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
                                >
                                    {editingUser ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
