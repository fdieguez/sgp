import { useEffect, useState } from 'react';
import api from '../config/axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
    ArrowLeft,
    Eye,
    Save,
    Trash2,
    RefreshCw,
    Database,
    Clock,
    Calendar,
    AlertTriangle,
    CheckCircle,
    FileSpreadsheet
} from 'lucide-react';

export default function ProjectSettingsPage() {
    const { configId } = useParams();
    const { colorblindMode, setColorblindMode } = useTheme();
    const navigate = useNavigate();
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [syncing, setSyncing] = useState(null); // 'FULL' or 'INCREMENTAL'

    useEffect(() => {
        fetchConfig();
    }, [configId]);

    const fetchConfig = async () => {
        try {
            const res = await api.get(`/api/config/${configId}`);
            setConfig(res.data);
        } catch (err) {
            console.error(err);
            alert('Error cargando configuración');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put(`/api/config/${configId}`, config);
            alert('Configuración guardada correctamente');
            fetchConfig(); // Refresh
        } catch (err) {
            console.error(err);
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const handleSync = async (type) => {
        if (type === 'FULL' && !confirm('¿Estás seguro de realizar una Sincronización Completa? Esto procesará TODAS las filas de la hoja de cálculo. Esta acción puede tardar.')) {
            return;
        }

        setSyncing(type);
        try {
            const isFull = type === 'FULL';
            await api.post(`/api/sync/${configId}?full=${isFull}`);
            alert('Sincronización completada exitosamente.');
            fetchConfig();
        } catch (err) {
            console.error(err);
            alert('Error durante la sincronización');
        } finally {
            setSyncing(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm('PELIGRO: ¿Estás seguro de eliminar este Proyecto y toda su configuración? Esta acción no se puede deshacer.')) return;

        try {
            await api.delete(`/api/config/${configId}`);
            navigate('/dashboard');
        } catch (err) {
            alert('Error al eliminar proyecto');
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    if (!config) return <div className="text-white text-center p-10">Configuración no encontrada</div>;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link to={`/projects/config/${configId}`} className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-2 group">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Volver al Proyecto
                        </Link>
                        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                            <FileSpreadsheet className="h-8 w-8 text-green-500" />
                            Configuración: {config.sheetName}
                        </h1>
                    </div>
                    <div className="bg-gray-800 px-4 py-2 rounded-xl border border-gray-700">
                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Estado</div>
                        <div className={`font-mono font-bold ${config.status === 'SUCCESS' ? 'text-green-400' : 'text-yellow-400'}`}>
                            {config.status}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Main Settings Form */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Database className="h-5 w-5 text-indigo-400" /> Parámetros de Conexión
                            </h2>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Google Spreadsheet ID</label>
                                    <input
                                        type="text"
                                        value={config.spreadsheetId}
                                        onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm text-gray-300 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">El ID único de la hoja de cálculo (parte larga de la URL).</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-400 mb-2">Nombre de Hoja (Tab)</label>
                                    <input
                                        type="text"
                                        value={config.sheetName}
                                        onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                                        className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">El nombre exacto de la pestaña inferior en Google Sheets.</p>
                                </div>

                                <div className="h-px bg-gray-700 my-6"></div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                                            <Clock className="h-4 w-4" /> Frecuencia (Min)
                                        </label>
                                        <input
                                            type="number"
                                            value={config.syncFrequencyMinutes || 60}
                                            onChange={(e) => setConfig({ ...config, syncFrequencyMinutes: parseInt(e.target.value) })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-400 mb-2 flex items-center gap-2">
                                            <Calendar className="h-4 w-4" /> Ventana Sync (Días)
                                        </label>
                                        <input
                                            type="number"
                                            value={config.syncWindowDays || 30}
                                            onChange={(e) => setConfig({ ...config, syncWindowDays: parseInt(e.target.value) })}
                                            className="w-full bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-sm text-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        <p className="text-[10px] text-gray-500 mt-2 leading-tight">Días hacia atrás para sync incremental.</p>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
                                    >
                                        {saving ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                                        Guardar Cambios
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>

                    {/* Sidebar Actions */}
                    <div className="space-y-6">
                        <section className="bg-gray-800 rounded-3xl border border-gray-700 p-6 shadow-xl">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Eye className="h-4 w-4 text-emerald-400" /> Preferencias Visuales
                            </h3>
                            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                <div className="pr-2">
                                    <div className="font-bold text-white text-sm">Modo para Daltónicos</div>
                                    <div className="text-xs text-gray-400 mt-1">Mejora constraste (Protanopía)</div>
                                </div>
                                <button
                                    onClick={() => setColorblindMode(!colorblindMode)}
                                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors ${colorblindMode ? 'bg-indigo-500' : 'bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${colorblindMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </section>

                        <section className="bg-gray-800 rounded-3xl border border-gray-700 p-6 shadow-xl">
                            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Acciones de Sincronización</h3>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleSync('INCREMENTAL')}
                                    disabled={syncing !== null}
                                    className="w-full bg-gray-700 hover:bg-gray-600 text-white p-4 rounded-xl flex items-center justify-between group transition-colors disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-bold flex items-center gap-2">
                                            <RefreshCw className={`h-4 w-4 ${syncing === 'INCREMENTAL' ? 'animate-spin' : ''}`} /> Sync Incremental
                                        </div>
                                        <div className="text-xs text-gray-400 mt-1">Solo últimos {config.syncWindowDays || 30} días</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleSync('FULL')}
                                    disabled={syncing !== null}
                                    className="w-full bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 text-indigo-300 p-4 rounded-xl flex items-center justify-between group transition-colors disabled:opacity-50"
                                >
                                    <div className="text-left">
                                        <div className="font-bold flex items-center gap-2">
                                            <Database className={`h-4 w-4 ${syncing === 'FULL' ? 'animate-spin' : ''}`} /> Sync Completo
                                        </div>
                                        <div className="text-xs text-indigo-400/70 mt-1">Reprocesa TODO (Lento)</div>
                                    </div>
                                </button>
                            </div>

                            <div className="mt-6 p-4 bg-gray-900/50 rounded-xl border border-gray-800">
                                <span className="text-xs text-gray-500 font-mono">Última sinc: {config.lastSync ? new Date(config.lastSync).toLocaleString() : 'Nunca'}</span>
                            </div>
                        </section>

                        <section className="bg-red-900/10 rounded-3xl border border-red-900/30 p-6">
                            <h3 className="text-sm font-black text-red-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" /> Zona de Peligro
                            </h3>
                            <p className="text-xs text-red-400/80 mb-4 leading-relaxed">
                                Eliminar este proyecto borrará permanentemente la configuración pero NO afectará tus datos en Google Sheets.
                            </p>
                            <button
                                onClick={handleDelete}
                                className="w-full border border-red-500/50 text-red-400 hover:bg-red-500 hover:text-white p-3 rounded-xl font-bold text-sm transition-all"
                            >
                                <Trash2 className="h-4 w-4 inline mr-2" />
                                Eliminar Proyecto
                            </button>
                        </section>
                    </div>
                </div>
            </div>
        </div>
    );
}
