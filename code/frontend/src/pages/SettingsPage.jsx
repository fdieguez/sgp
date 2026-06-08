import { useState } from 'react';
import Navbar from '../components/Navbar';
import UsersPage from './UsersPage';
import TiposResolucionABM from '../components/TiposResolucionABM';
import AtributosABM from '../components/AtributosABM';
import { Users, FileText, Settings, Key, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import api from '../config/axios';

export default function SettingsPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'ADMINISTRADOR';
    const [activeTab, setActiveTab] = useState('USERS');

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Configuración</h1>
                        <p className="text-gray-500 font-medium">Panel de administración global del sistema</p>
                    </div>
                </div>

                <div className="flex border-b border-gray-700/50 mb-8 space-x-8">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'USERS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Users className="h-4 w-4" />
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('TIPOS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'TIPOS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <FileText className="h-4 w-4" />
                        Tipos de Resolución
                    </button>
                    <button
                        onClick={() => setActiveTab('ATRIBUTOS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'ATRIBUTOS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Settings className="h-4 w-4" />
                        Catálogo de Atributos
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('MAINTENANCE')}
                            className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'MAINTENANCE' ? 'text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <ShieldAlert className="h-4 w-4" />
                            Mantenimiento
                        </button>
                    )}
                </div>

                <div className="animate-in fade-in duration-500">
                    {activeTab === 'USERS' && (
                        <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm shadow-xl min-h-[500px]">
                           <UsersPage isEmbedded={true} />
                        </div>
                    )}
                    {activeTab === 'TIPOS' && <TiposResolucionABM />}
                    {activeTab === 'ATRIBUTOS' && <AtributosABM />}
                    {activeTab === 'MAINTENANCE' && isAdmin && <MaintenancePanel />}
                </div>
            </div>
        </div>
    );
}

function MaintenancePanel() {
    const [password, setPassword] = useState('');
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    const handleClear = async (e) => {
        e.preventDefault();
        if (confirmText !== 'LIMPIAR') {
            toast.error('Debe escribir exactamente "LIMPIAR" para confirmar.');
            return;
        }

        if (!password) {
            toast.error('Debe ingresar su contraseña.');
            return;
        }

        if (!window.confirm('¿ESTÁ ABSOLUTAMENTE SEGURO? Esta acción eliminará permanentemente todas las solicitudes, pedidos, subsidios, adjuntos y tickets. Esta acción es irreversible.')) {
            return;
        }

        try {
            setLoading(true);
            const res = await api.post('/api/admin/maintenance/clear-transactions', { password, confirmText });
            toast.success(res.data.message || 'Limpieza completada con éxito.');
            setPassword('');
            setConfirmText('');
        } catch (err) {
            const errMsg = err.response?.data?.error || err.response?.data?.message || 'Error al limpiar la base de datos';
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 shadow-xl min-h-[500px]">
            <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-red-400">
                    <ShieldAlert className="h-5 w-5" /> Vaciado y Mantenimiento del Sistema
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                    Operaciones avanzadas de base de datos destinadas únicamente a administración y restablecimiento de entornos.
                </p>
            </div>

            <div className="mt-8 max-w-xl bg-red-950/20 border border-red-500/30 p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
                    ¡ADVERTENCIA DE SEGURIDAD!
                </h3>
                <p className="text-sm text-gray-300 leading-relaxed mb-4">
                    Esta acción es <strong className="text-red-400 uppercase">Irreversible</strong> y realizará las siguientes operaciones:
                </p>
                <ul className="list-disc list-inside text-xs text-gray-400 space-y-1 mb-6">
                    <li>Eliminará de forma permanente todas las <strong>Solicitudes</strong> (Pedidos y Subsidios).</li>
                    <li>Eliminará todos los <strong>Tickets de Seguimiento</strong> e <strong>Historial de Asignaciones</strong>.</li>
                    <li>Eliminará físicamente todos los archivos de <strong>Documentos Adjuntos</strong> de la carpeta uploads.</li>
                    <li><strong className="text-gray-300">PRESERVARÁ:</strong> Usuarios, Localidades, Catálogo de Atributos, Formularios Dinámicos y Configuración de Sincronización.</li>
                </ul>

                <form onSubmit={handleClear} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Contraseña del Administrador Actual</label>
                        <input
                            type="password"
                            required
                            placeholder="Ingrese su contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-600 bg-gray-950 rounded-xl text-white outline-none focus:border-red-500 text-sm"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                            Confirmación de Seguridad (Escriba <span className="text-red-400 font-extrabold">LIMPIAR</span>)
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="LIMPIAR"
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-600 bg-gray-950 rounded-xl text-white outline-none focus:border-red-500 text-sm uppercase"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg ${
                            loading 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-red-500/10'
                        }`}
                    >
                        {loading ? 'Procesando limpieza...' : 'EJECUTAR LIMPIEZA PERMANENTE'}
                    </button>
                </form>
            </div>
        </div>
    );
}
