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
    AlertCircle,
    Briefcase,
    Users
} from 'lucide-react';

export default function UsersPage() {
    const [activeTab, setActiveTab] = useState('users'); // 'users' or 'responsables'
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Users State
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({ email: '', password: '', role: 'USER' });

    // Responsables State
    const [responsables, setResponsables] = useState([]);
    const [showRespModal, setShowRespModal] = useState(false);
    const [editingResp, setEditingResp] = useState(null);
    const [respFormData, setRespFormData] = useState({ name: '', email: '', phone: '', zone: '', userId: '' });

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [usersRes, respRes] = await Promise.all([
                api.get('/api/users'),
                api.get('/api/responsables')
            ]);
            setUsers(usersRes.data);
            setResponsables(respRes.data);
        } catch (err) {
            console.error(err);
            setError('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    // --- User Handlers ---
    const handleUserSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, userFormData);
            } else {
                await api.post('/api/users', userFormData);
            }
            setShowUserModal(false);
            setUserFormData({ email: '', password: '', role: 'USER' });
            setEditingUser(null);
            fetchAll();
        } catch (err) {
            alert(err.response?.data || 'Error al guardar usuario');
        }
    };

    const handleUserDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?')) return;
        try {
            await api.delete(`/api/users/${id}`);
            fetchAll();
        } catch (err) {
            alert('Error al eliminar usuario');
        }
    };

    const openEditUser = (user) => {
        setEditingUser(user);
        setUserFormData({ email: user.email, password: '', role: user.role });
        setShowUserModal(true);
    };

    // --- Responsable Handlers ---
    const handleRespSubmit = async (e, forceOverride = false) => {
        if (e) e.preventDefault();
        try {
            const { userId, ...rest } = respFormData;
            const payload = { ...rest, user: userId ? { id: userId } : null };
            const config = { params: { forceOverride } };

            if (editingResp) {
                await api.put(`/api/responsables/${editingResp.id}`, payload, config);
            } else {
                await api.post('/api/responsables', payload, config);
            }
            setShowRespModal(false);
            setRespFormData({ name: '', email: '', phone: '', zone: '', userId: '' });
            setEditingResp(null);
            fetchAll();
        } catch (err) {
            if (err.response?.status === 409 && typeof err.response.data === 'string' && err.response.data.startsWith('ALREADY_ASSIGNED:')) {
                const otherName = err.response.data.split(':')[1];
                if (window.confirm(`El usuario ya está asignado al responsable "${otherName}". ¿Deseas desvincularlo y asignarlo a este?`)) {
                    await handleRespSubmit(null, true);
                    return;
                }
            } else {
                const serverMsg = typeof err.response?.data === 'string' ? err.response.data : 'Error al guardar responsable';
                alert(serverMsg);
            }
        }
    };

    const handleRespDelete = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este responsable?')) return;
        try {
            await api.delete(`/api/responsables/${id}`);
            fetchAll();
        } catch (err) {
            alert('Error al eliminar responsable');
        }
    };

    const openEditResp = (resp) => {
        setEditingResp(resp);
        setRespFormData({
            name: resp.name,
            email: resp.email || '',
            phone: resp.phone || '',
            zone: resp.zone || '',
            userId: resp.user?.id || ''
        });
        setShowRespModal(true);
    };

    if (loading && users.length === 0) return (
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

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h1 className="text-3xl font-bold text-white tracking-tight">Gestión de Accesos y Personal</h1>

                        <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                            <button
                                onClick={() => setActiveTab('users')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'users' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Users className="h-4 w-4" /> Usuarios Sistema
                            </button>
                            <button
                                onClick={() => setActiveTab('responsables')}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'responsables' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                <Briefcase className="h-4 w-4" /> Responsables
                            </button>
                        </div>

                        <button
                            onClick={activeTab === 'users' ? () => {
                                setEditingUser(null);
                                setUserFormData({ email: '', password: '', role: 'USER' });
                                setShowUserModal(true);
                            } : () => {
                                setEditingResp(null);
                                setRespFormData({ name: '', email: '', phone: '', zone: '', userId: '' });
                                setShowRespModal(true);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors shadow-lg active:scale-95"
                        >
                            <UserPlus className="h-4 w-4" />
                            {activeTab === 'users' ? 'Nuevo Usuario' : 'Nuevo Responsable'}
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

                {/* Main Content */}
                <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-xl overflow-hidden min-h-[400px]">
                    {activeTab === 'users' ? (
                        /* USERS TABLE */
                        <table className="w-full">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Email</th>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Rol</th>
                                    <th className="p-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-indigo-400" />
                                                <span className="text-sm text-gray-200 font-medium">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${user.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border-purple-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                                {user.role === 'ADMIN' && <Shield className="h-3 w-3" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditUser(user)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil className="h-4 w-4" /></button>
                                                <button onClick={() => handleUserDelete(user.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {users.length === 0 && (
                                    <tr><td colSpan="3" className="p-12 text-center text-gray-500">No hay usuarios registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* RESPONSABLES TABLE */
                        <table className="w-full">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Nombre y Zona</th>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Contacto / Usuario</th>
                                    <th className="p-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {responsables.map(resp => (
                                    <tr key={resp.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Briefcase className="h-4 w-4 text-emerald-400" />
                                                <span className="text-sm text-gray-200 font-bold">{resp.name}</span>
                                            </div>
                                            {resp.zone && (
                                                <span className="inline-block px-2 py-0.5 bg-emerald-900/30 text-emerald-400 border border-emerald-800 rounded text-xs font-medium">
                                                    Zona: {resp.zone}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm text-gray-400">
                                            <div className="flex flex-col gap-1">
                                                {resp.email && <div>{resp.email}</div>}
                                                {resp.phone && <div className="text-xs text-gray-500">{resp.phone}</div>}
                                                {resp.user && (
                                                    <div className="flex items-center gap-1 mt-1 text-xs text-indigo-400 font-medium bg-indigo-900/20 px-2 py-1 rounded w-fit border border-indigo-500/20">
                                                        <UserIcon className="h-3 w-3" /> Vinculado a: {resp.user.email}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => openEditResp(resp)} className="p-2 text-blue-400 hover:bg-blue-900/20 rounded-lg transition-colors"><Pencil className="h-4 w-4" /></button>
                                                <button onClick={() => handleRespDelete(resp.id)} className="p-2 text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {responsables.length === 0 && (
                                    <tr><td colSpan="3" className="p-12 text-center text-gray-500">No hay responsables registrados</td></tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* User Modal */}
            {showUserModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
                        </h2>
                        <form onSubmit={handleUserSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña {editingUser && <span className="normal-case font-normal">(opcional)</span>}</label>
                                <input type="password" required={!editingUser} value={userFormData.password} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Rol</label>
                                <select value={userFormData.role} onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                    <option value="USER">USER</option>
                                    <option value="ADMIN">ADMIN</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-bold text-white">{editingUser ? 'Actualizar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Responsable Modal */}
            {showRespModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl border border-gray-700 shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95">
                        <h2 className="text-xl font-bold text-white mb-6">
                            {editingResp ? 'Editar Responsable' : 'Nuevo Responsable'}
                        </h2>
                        <form onSubmit={handleRespSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre Completo</label>
                                <input type="text" required value={respFormData.name} onChange={(e) => setRespFormData({ ...respFormData, name: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                                <input type="email" value={respFormData.email} onChange={(e) => setRespFormData({ ...respFormData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono (Opcional)</label>
                                <input type="text" value={respFormData.phone} onChange={(e) => setRespFormData({ ...respFormData, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Zona Asignada</label>
                                    <input type="text" placeholder="Ej: Norte" value={respFormData.zone} onChange={(e) => setRespFormData({ ...respFormData, zone: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Vincular Usuario</label>
                                    <select value={respFormData.userId} onChange={(e) => setRespFormData({ ...respFormData, userId: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                                        <option value="">Ninguno</option>
                                        {users.filter(u => u.role === 'USER').map(u => (
                                            <option key={u.id} value={u.id}>{u.email}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowRespModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-bold text-white">{editingResp ? 'Actualizar' : 'Crear'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
