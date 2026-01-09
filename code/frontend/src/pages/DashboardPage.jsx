import { useEffect, useState } from 'react';
import axios from 'axios';
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
    CheckCircle2,
    AlertCircle,
    Users
} from 'lucide-react';

export default function DashboardPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncingId, setSyncingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await axios.get('http://localhost:8080/api/config');
            setConfigs(response.data);
        } catch (error) {
            console.error("Error fetching configs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async (id) => {
        setSyncingId(id);
        try {
            await axios.post(`http://localhost:8080/api/sync/${id}`);
            fetchConfigs(); // Refresh status
        } catch (error) {
            console.error("Sync failed", error);
            alert("Error al sincronizar");
        } finally {
            setSyncingId(null);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            {/* Navbar */}
            <nav className="bg-gray-800 border-b border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <LayoutDashboard className="h-8 w-8 text-indigo-500" />
                            <span className="ml-2 text-xl font-bold tracking-tight">SGP Dashboard</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => navigate('/users')}
                                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            >
                                <Users className="h-5 w-5" />
                                <span>Usuarios</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Salir</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-2xl font-bold">Mis Planillas</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium transition-colors"
                    >
                        <Plus className="h-5 w-5" />
                        Nueva Planilla
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : configs.length === 0 ? (
                    <div className="text-center py-20 bg-gray-800 rounded-2xl border border-gray-700 bg-opacity-50">
                        <FileSpreadsheet className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                        <h3 className="text-xl font-medium text-gray-300">No hay planillas configuradas</h3>
                        <p className="text-gray-500 mt-2">Agrega tu primera conexión a Google Sheets para comenzar.</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="mt-6 border border-indigo-500 text-indigo-400 hover:bg-indigo-900/30 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Crear Configuración
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {configs.map((config) => (
                            <div key={config.id} className="bg-gray-800 rounded-xl border border-gray-700 shadow-lg overflow-hidden hover:border-indigo-500/50 transition-all duration-300 group">
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

                                    <h3 className="text-lg font-semibold mb-1 truncate" title={config.sheetName}>
                                        {config.sheetName}
                                    </h3>
                                    <p className="text-gray-400 text-xs mb-6 truncate" title={config.spreadsheetId}>
                                        ID: {config.spreadsheetId}
                                    </p>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-700">
                                        <div className="text-xs text-gray-500">
                                            {config.lastSync ? `Updated: ${new Date(config.lastSync).toLocaleTimeString()}` : 'Never synced'}
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleSync(config.id)}
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
                            </div>
                        ))}
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
