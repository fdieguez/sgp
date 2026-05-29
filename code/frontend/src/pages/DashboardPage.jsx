import { useEffect, useState } from 'react';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import CreateConfigModal from '../components/CreateConfigModal';
import {
    LayoutDashboard,
    FileSpreadsheet,
    RefreshCw,
    Plus,
    LogOut,
    ChevronRight,
    Users,
    Trash2,
    HelpCircle,
    ClipboardList,
    Globe
} from 'lucide-react';

import DashboardStats from '../components/DashboardStats';
import Navbar from '../components/Navbar';

export default function DashboardPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncingId, setSyncingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [statsKey, setStatsKey] = useState(0);

    useEffect(() => {
        if (user?.role === 'ADMINISTRADOR') {
            fetchConfigs();
        } else if (user) {
            navigate('/mis-solicitudes', { replace: true });
        } else {
            setLoading(false);
        }
    }, [user, navigate]);

    const fetchConfigs = async () => {
        try {
            const response = await api.get('/api/config');
            setConfigs(response.data);
        } catch (error) {
            console.error("Error fetching configs", error);
        } finally {
            setLoading(false);
        }
    }

    const handleSync = async (id) => {
        setSyncingId(id);
        try {
            await api.post(`/api/sync/${id}`);
            fetchConfigs(); // Refresh status
            setStatsKey(prev => prev + 1); // Trigger stats refresh
        } catch (error) {
            console.error("Sync failed", error);
            alert("Error al sincronizar");
        } finally {
            setSyncingId(null);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta planilla?")) return;

        try {
            await api.delete(`/api/config/${id}`);
            fetchConfigs();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Error al eliminar");
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Navbar */}
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <DashboardStats key={statsKey} />

                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">{user?.role === 'ADMINISTRADOR' ? 'Mis Planillas' : 'Panel de Control'}</h1>
                    {user?.role === 'ADMINISTRADOR' && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Nueva Planilla
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : user?.role !== 'ADMINISTRADOR' ? (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Link to="/mis-solicitudes" className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group">
                            <div className="p-6">
                                <div className="p-3 bg-indigo-900/50 rounded-lg inline-block mb-4">
                                    <ClipboardList className="h-6 w-6 text-indigo-400" />
                                </div>
                                <h3 className="text-lg font-semibold mb-1 text-white group-hover:text-indigo-400 transition-colors">Ver Mis Solicitudes</h3>
                                <p className="text-gray-400 text-sm">Gestiona tus trámites y subsidios asignados o de tu zona.</p>
                            </div>
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {user?.role === 'ADMINISTRADOR' && (
                                <Link
                                    to="/mis-solicitudes"
                                    className="bg-gray-800 rounded-xl border border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] overflow-hidden hover:border-indigo-400 transition-all duration-300 group flex flex-col justify-between"
                                >
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-indigo-900/50 rounded-lg">
                                                <Globe className="h-6 w-6 text-indigo-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-lg font-bold mb-1 text-white group-hover:text-indigo-400 transition-colors">
                                            Todas las Solicitudes
                                        </h3>
                                        <p className="text-gray-400 text-xs mb-6" title="Sincronizadas y Manuales">
                                            Visión Global de Sincronizadas y Manuales
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-700/50">
                                        <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                                            Ver Listado <ChevronRight className="h-4 w-4" />
                                        </span>
                                    </div>
                                </Link>
                            )}

                            {configs.map((config) => (
                                <div key={config.id} className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group flex flex-col justify-between">
                                    <div className="p-6">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="p-3 bg-gray-900/50 rounded-lg">
                                                <FileSpreadsheet className="h-6 w-6 text-green-400" />
                                            </div>
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${config.status === 'SUCCESS'
                                                ? 'bg-green-900/30 text-green-400 border-green-800'
                                                : config.status === 'ERROR'
                                                    ? 'bg-red-900/30 text-red-400 border-red-800'
                                                    : 'bg-gray-700 text-gray-300 border-gray-600'
                                                }`}>
                                                {config.status || 'PENDING'}
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-semibold mb-1 truncate text-white" title={config.sheetName}>
                                            {config.sheetName}
                                        </h3>
                                        <p className="text-gray-400 text-xs mb-6 truncate" title={config.spreadsheetId}>
                                            ID: {config.spreadsheetId}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between p-6 pt-4 border-t border-gray-700/50">
                                        <div className="text-xs text-gray-500">
                                            {config.lastSync ? `Updated: ${new Date(config.lastSync).toLocaleTimeString()}` : 'Never synced'}
                                        </div>
                                        <div className="flex gap-2">
                                            {user?.role === 'ADMINISTRADOR' && (
                                                <button
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(config.id); }}
                                                    className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSync(config.id); }}
                                                disabled={syncingId === config.id}
                                                className={`p-2 rounded-lg transition-colors ${syncingId === config.id ? 'cursor-wait text-indigo-400 bg-indigo-900/20' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                                                title="Sincronizar ahora"
                                            >
                                                <RefreshCw className={`h-4 w-4 ${syncingId === config.id ? 'animate-spin' : ''}`} />
                                            </button>
                                            <Link
                                                to={`/projects/config/${config.id}`}
                                                className="p-2 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                title="Ver Datos"
                                            >
                                                <ChevronRight className="h-4 w-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {configs.length === 0 && (
                            <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-gray-700/50">
                                <FileSpreadsheet className="h-12 w-16 mx-auto text-gray-600 mb-4" />
                                <h3 className="text-lg font-medium text-gray-400">No hay planillas de Google Sheets conectadas</h3>
                                <p className="text-gray-500 text-sm mt-1">Puedes conectar hojas de cálculo haciendo clic en el botón "Nueva Planilla" arriba a la derecha.</p>
                            </div>
                        )}
                    </div>
                )}

                <CreateConfigModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSuccess={fetchConfigs}
                />
            </main>
        </div>
    );
}
