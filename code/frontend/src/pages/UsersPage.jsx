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

export default function UsersPage({ isEmbedded = false }) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userFormData, setUserFormData] = useState({ 
        email: '', password: '', role: 'OPERADOR', 
        firstName: '', lastName: '', phone: '', zone: '', dni: '',
        tipoResolucionIds: []
    });
    const [resolutionTypes, setResolutionTypes] = useState([]);

    useEffect(() => {
        fetchAll();
        fetchResolutionTypes();
    }, []);

    const fetchResolutionTypes = async () => {
        try {
            const res = await api.get('/api/tipos-resolucion');
            setResolutionTypes(res.data);
        } catch (err) {
            console.error('Error fetching resolution types', err);
        }
    };

    const fetchAll = async () => {
        setLoading(true);
        try {
            const usersRes = await api.get('/api/users');
            setUsers(usersRes.data);
        } catch (err) {
            console.error(err);
            setError('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    const handleUserSubmit = async (e) => {
        e.preventDefault();
        
        if (userFormData.role.includes('RESPONSABLE') && (!userFormData.zone || !userFormData.zone.trim())) {
            alert('La zona es obligatoria para el rol Responsable');
            return;
        }

        try {
            // Asegurarse de que tipoResolucionIds solo se envíe si el rol contiene RESOLUTOR
            const payload = {
                ...userFormData,
                tipoResolucionIds: userFormData.role.includes('RESOLUTOR') ? userFormData.tipoResolucionIds : []
            };
            if (editingUser) {
                await api.put(`/api/users/${editingUser.id}`, payload);
            } else {
                await api.post('/api/users', payload);
            }
            setShowUserModal(false);
            setUserFormData({ email: '', password: '', role: 'OPERADOR', firstName: '', lastName: '', phone: '', zone: '', dni: '', tipoResolucionIds: [] });
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
        setUserFormData({ 
            email: user.email, 
            password: '', 
            role: user.role,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            phone: user.phone || '',
            zone: user.zone || '',
            dni: user.dni || '',
            tipoResolucionIds: user.tiposResolucion ? user.tiposResolucion.map(t => t.id) : []
        });
        setShowUserModal(true);
    };

    if (loading && users.length === 0) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    return (
        <div className={isEmbedded ? "w-full" : "min-h-screen bg-gray-900 text-white p-8"}>
            <div className="w-full mx-auto space-y-6">
                {!isEmbedded && (
                    <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </Link>
                )}

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight">Gestión de Usuarios</h2>

                        <button
                            onClick={() => {
                                setEditingUser(null);
                                setUserFormData({ email: '', password: '', role: 'OPERADOR', firstName: '', lastName: '', phone: '', zone: '', dni: '', tipoResolucionIds: [] });
                                setShowUserModal(true);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 transition-colors shadow-lg active:scale-95"
                        >
                            <UserPlus className="h-4 w-4" />
                            Nuevo Usuario
                        </button>
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
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-900/50 border-b border-gray-700">
                                <tr>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Nombre Completo</th>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Email</th>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Rol</th>
                                    <th className="p-4 text-left text-xs font-black text-gray-500 uppercase tracking-widest">Datos de Perfil</th>
                                    <th className="p-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700">
                                {users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <UserIcon className="h-4 w-4 text-indigo-400" />
                                                <span className="text-sm text-gray-200 font-bold">{user.firstName} {user.lastName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-sm text-gray-400">{user.email}</span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${user.role === 'ADMINISTRADOR' ? 'bg-purple-900/30 text-purple-400 border-purple-700' : 'bg-gray-700 text-gray-300 border-gray-600'}`}>
                                                {user.role === 'ADMINISTRADOR' && <Shield className="h-3 w-3" />}
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {user.phone || user.zone || (user.tiposResolucion && user.tiposResolucion.length > 0) ? (
                                                <div className="flex flex-col gap-1 text-xs">
                                                    {user.zone && <span className="text-emerald-400 bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-800 w-fit">Zona: {user.zone}</span>}
                                                    {user.phone && <span className="text-gray-400">Tel: {user.phone}</span>}
                                                    {user.tiposResolucion && user.tiposResolucion.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mt-1">
                                                            {user.tiposResolucion.map(tr => (
                                                                <span key={tr.id} className="text-indigo-300 bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-800 text-[10px]">
                                                                    {tr.tipo}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-600 italic">Sin datos extra</span>
                                            )}
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
                    </div>
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
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                                    <input type="text" required value={userFormData.firstName} onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Apellido</label>
                                    <input type="text" required value={userFormData.lastName} onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                                <input type="email" required value={userFormData.email} onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contraseña</label>
                                <input type="password" required={!editingUser} onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })} placeholder={editingUser ? 'Dejar vacío para no cambiar' : ''} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Roles del Sistema</label>
                                <div className="grid grid-cols-2 gap-2 bg-gray-900 p-3 rounded-xl border border-gray-600">
                                    {[
                                        { val: 'OPERADOR', lbl: 'Operador' },
                                        { val: 'DISTRIBUIDOR', lbl: 'Distribuidor' },
                                        { val: 'RESPONSABLE', lbl: 'Responsable' },
                                        { val: 'RESOLUTOR', lbl: 'Resolutor' },
                                        { val: 'ADMINISTRADOR', lbl: 'Administrador' }
                                    ].map(r => (
                                        <label key={r.val} className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={userFormData.role.includes(r.val)}
                                                onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    const currentRoles = userFormData.role.split(',').filter(Boolean);
                                                    let newRoles;
                                                    if (checked) {
                                                        newRoles = [...currentRoles, r.val];
                                                    } else {
                                                        newRoles = currentRoles.filter(x => x !== r.val);
                                                    }
                                                    setUserFormData({ ...userFormData, role: newRoles.join(',') });
                                                }}
                                                className="rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-800"
                                            />
                                            <span className="text-sm text-gray-300">{r.lbl}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">DNI (Opcional)</label>
                                    <input type="text" value={userFormData.dni || ''} onChange={(e) => setUserFormData({ ...userFormData, dni: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Teléfono (Obligatorio)</label>
                                    <input type="tel" required value={userFormData.phone} onChange={(e) => setUserFormData({ ...userFormData, phone: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                                </div>
                            </div>

                            {userFormData.role.includes('RESPONSABLE') && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-emerald-500 uppercase mb-1">Zona Territorial</label>
                                    <input type="text" placeholder="Ej: Norte, Sur..." required value={userFormData.zone} onChange={(e) => setUserFormData({ ...userFormData, zone: e.target.value })} className="w-full px-4 py-2 bg-gray-900 border border-emerald-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                                </div>
                            )}

                            {userFormData.role.includes('RESOLUTOR') && (
                                <div className="animate-in fade-in slide-in-from-top-2 space-y-2">
                                    <label className="block text-xs font-bold text-indigo-400 uppercase mb-1">Tipos de Resolución Asignados</label>
                                    <div className="grid grid-cols-2 gap-2 bg-gray-900 p-3 rounded-xl border border-gray-600">
                                        {resolutionTypes.map(type => {
                                            const isChecked = userFormData.tipoResolucionIds?.includes(type.id);
                                            return (
                                                <label key={type.id} className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            const checked = e.target.checked;
                                                            let newIds = [...(userFormData.tipoResolucionIds || [])];
                                                            if (checked) {
                                                                if (!newIds.includes(type.id)) {
                                                                    newIds.push(type.id);
                                                                }
                                                            } else {
                                                                newIds = newIds.filter(id => id !== type.id);
                                                            }
                                                            setUserFormData({ ...userFormData, tipoResolucionIds: newIds });
                                                        }}
                                                        className="rounded border-gray-600 text-indigo-600 focus:ring-indigo-500 bg-gray-800"
                                                    />
                                                    <span className="text-sm text-gray-300">{type.tipo}</span>
                                                </label>
                                            );
                                        })}
                                        {resolutionTypes.length === 0 && (
                                            <span className="text-xs text-gray-500 col-span-2 italic">No hay tipos de resolución activos</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setShowUserModal(false)} className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium">Cancelar</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors font-bold text-white">{editingUser ? 'Guardar Cambios' : 'Crear Usuario'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
