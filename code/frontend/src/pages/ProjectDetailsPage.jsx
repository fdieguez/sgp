import { useEffect, useState, useMemo } from 'react';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Database,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    BarChart3,
    PieChart as PieChartIcon,
    Maximize2,
    Filter,
    X,
    FilterX,
    Plus,
    Edit3,
    Trash2,
    Eye,
    Check,
    Settings,
    Download
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';

import SolicitudModal from '../components/SolicitudModal';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

// --- Helpers ---
const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr.includes('T')) return new Date(dateStr);
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d);
};

// --- UI Components ---
const STATUS_MAP = {
    'pendiente': 'Pendiente',
    'en proceso': 'Asignadas',
    'en resolucion': 'En Resolución',
    'completadas': 'Resueltas',
    'rechazada': 'Rechazado'
};

const StatusBadge = ({ status }) => {
    const s = status?.trim().toLowerCase();
    const styles = {
        completadas: 'bg-green-900/30 text-green-400 border-green-800',
        pendiente: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
        'en proceso': 'bg-blue-900/30 text-blue-400 border-blue-800',
        'en resolucion': 'bg-purple-900/30 text-purple-400 border-purple-800',
        rechazada: 'bg-red-900/30 text-red-400 border-red-800'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[s] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
            {STATUS_MAP[s] || status}
        </span>
    );
};

export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const { user } = useAuth();
    const [solicitudes, setSolicitudes] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [isABMOpen, setIsABMOpen] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [visColumn, setVisColumn] = useState('status'); // Default chart by status
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [responsablesList, setResponsablesList] = useState([]);
    const [locationsList, setLocationsList] = useState([]);
    const [stats, setStats] = useState({
        pendiente: 0,
        enProceso: 0,
        enResolucion: 0,
        completadas: 0,
        rechazada: 0,
        totalSubsidios: 0
    });

    useEffect(() => {
        fetchResponsables();
        fetchLocations();
    }, []);

    const fetchResponsables = async () => {
        try {
            const res = await api.get('/api/responsables');
            setResponsablesList(res.data);
        } catch (err) {
            console.error("Error fetching responsables", err);
        }
    };

    const fetchLocations = async () => {
        try {
            const res = await api.get('/api/locations');
            setLocationsList(res.data.filter(l => l.type === 'CITY' || l.type === 'LOCALITY'));
        } catch (err) {
            console.error("Error fetching locations", err);
        }
    };

    useEffect(() => {
        fetchData();
        if (configId && (user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN')) fetchConfig();
    }, [configId, user?.id, user?.role, filters, searchTerm, currentPage, sortConfig, rowsPerPage]);

    const fetchConfig = async () => {
        try {
            const res = await api.get(`/api/config/${configId}`);
            setConfig(res.data);
        } catch (err) {
            console.error("Error fetching config", err);
        }
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                status: filters.status || null,
                search: searchTerm || null,
                origin: filters.origin || null,
                responsableId: filters.responsableId || null,
                locationId: filters.locationId || null,
                page: currentPage - 1, // API es 0-indexed
                size: rowsPerPage,
                sort: `${sortConfig.key},${sortConfig.direction}`
            };

            // Date Range Logic for Server
            if (filters.dateRange) {
                const today = new Date();
                let dateFrom = null;
                let dateTo = null;

                if (filters.dateRange === '1M') {
                    dateFrom = new Date(); dateFrom.setMonth(today.getMonth() - 1);
                } else if (filters.dateRange === '6M') {
                    dateFrom = new Date(); dateFrom.setMonth(today.getMonth() - 6);
                } else if (filters.dateRange === '1Y') {
                    dateFrom = new Date(); dateFrom.setFullYear(today.getFullYear() - 1);
                } else if (filters.dateRange === '2Y') {
                    dateFrom = new Date(); dateFrom.setFullYear(today.getFullYear() - 2);
                } else if (filters.dateRange === 'CUSTOM') {
                    if (filters.customStartDate) dateFrom = new Date(filters.customStartDate);
                    if (filters.customEndDate) dateTo = new Date(filters.customEndDate);
                }

                if (dateFrom) params.dateFrom = dateFrom.toISOString().split('T')[0];
                if (dateTo) params.dateTo = dateTo.toISOString().split('T')[0];
            }

            const endpoint = configId ? `/api/solicitudes/config/${configId}` : `/api/solicitudes`;
            const endpointStats = configId ? `/api/solicitudes/config/${configId}/stats` : `/api/solicitudes/stats`;

            const statsParams = {
                search: searchTerm || null,
                origin: filters.origin || null,
                responsableId: filters.responsableId || null,
                locationId: filters.locationId || null,
            };
            if (params.dateFrom) statsParams.dateFrom = params.dateFrom;
            if (params.dateTo) statsParams.dateTo = params.dateTo;

            const [response, statsResponse] = await Promise.all([
                api.get(endpoint, { params }),
                api.get(endpointStats, { params: statsParams })
            ]);

            setSolicitudes(response.data.content);
            setTotalPages(response.data.totalPages);
            setStats(statsResponse.data);
        } catch (err) {
            console.error(err);
            setError("Error cargando las solicitudes.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("¿Seguro que deseas eliminar esta solicitud?")) return;
        try {
            await api.delete(`/api/solicitudes/${id}`);
            toast.success("Solicitud eliminada con éxito");
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar la solicitud.");
        }
    };

    const handleAprobarRapido = async (solicitudId) => {
        if (!window.confirm("¿Confirmas la aprobación de esta solicitud?")) return;
        try {
            await api.post(`/api/solicitudes/${solicitudId}/aprobar`, { observaciones: "Aprobación rápida desde grilla" });
            toast.success("Solicitud aprobada");
            fetchData();
        } catch (err) {
            console.error("Error approving assignment", err);
            toast.error("Error al aprobar la solicitud");
        }
    };

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedRows(processedData.rows.map(s => s.id));
        } else {
            setSelectedRows([]);
        }
    };

    const handleSelectRow = (id) => {
        setSelectedRows(prev => prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]);
    };

    const handleBulkAssign = async (responsableId) => {
        if (!window.confirm(`¿Asignar ${selectedRows.length} solicitudes al responsable seleccionado?`)) return;
        try {
            await api.post(`/api/solicitudes/bulk-assign`, { ids: selectedRows, responsableId: Number(responsableId) });
            toast.success("Asignación masiva exitosa");
            setSelectedRows([]);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Error en asignación masiva");
        }
    };

    const handleBulkDelete = async () => {
        if (!window.confirm(`¿Seguro que deseas eliminar ${selectedRows.length} solicitudes? Esta acción no se puede deshacer.`)) return;
        try {
            await api.post(`/api/solicitudes/bulk-delete`, { ids: selectedRows });
            toast.success("Eliminación masiva exitosa");
            setSelectedRows([]);
            fetchData();
        } catch (err) {
            console.error(err);
            toast.error("Error al eliminar solicitudes");
        }
    };

    const handleExportCSV = async () => {
        try {
            const params = {
                status: filters.status || null,
                search: searchTerm || null,
                origin: filters.origin || null,
                responsableId: filters.responsableId || null,
                locationId: filters.locationId || null,
                page: 0,
                size: 10000,
                sort: `${sortConfig.key},${sortConfig.direction}`
            };

            const endpoint = configId ? `/api/solicitudes/config/${configId}` : `/api/solicitudes`;
            const response = await api.get(endpoint, { params });
            const dataToExport = response.data.content;
            
            if (!dataToExport.length) {
                toast.error("No hay datos para exportar");
                return;
            }

            const headers = ["ID", "Fecha", "Origen", "Beneficiario", "Localidad", "Barrio", "Estado", "Responsable", "Monto"];
            const csvRows = [headers.join(",")];

            dataToExport.forEach(s => {
                const localidad = s.location?.type === 'NEIGHBORHOOD' ? (s.location?.parent?.name || '') : (s.location?.name || '');
                const barrio = s.location?.type === 'NEIGHBORHOOD' ? s.location?.name : '';
                const row = [
                    s.id,
                    s.entryDate,
                    s.origin,
                    `"${s.person?.name || ''}"`,
                    `"${localidad}"`,
                    `"${barrio}"`,
                    s.status,
                    `"${s.responsable?.name || ''}"`,
                    s.amount || 0
                ];
                csvRows.push(row.join(","));
            });

            const csvString = csvRows.join("\n");
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `exportacion_solicitudes_${new Date().getTime()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success("Exportación exitosa");
        } catch (err) {
            console.error("Error exporting", err);
            toast.error("Error al exportar los datos");
        }
    };

    // Data Processing Pipeline
    const processedData = useMemo(() => {
        let result = [...solicitudes];

        // 1. Ya no se filtra por search local si se hace por servidor, pero lo dejamos por si acaso
        // 2. Sort ya no se hace localmente
        
        // 4. Chart Data with Percentages
        const total = result.length;
        const counts = {};
        result.forEach(s => {
            let val = '(Vacío)';
            if (visColumn === 'status') val = STATUS_MAP[s.status] || s.status;
            else if (visColumn === 'location') val = s.location?.name || '(Vacío)';
            else if (visColumn === 'responsable') val = s.responsable?.name || 'Sin Asignar';
            else if (visColumn === 'origin') val = s.origin;

            counts[val] = (counts[val] || 0) + 1;
        });

        const chartData = Object.entries(counts)
            .map(([name, value]) => ({
                name,
                value,
                percentage: total > 0 ? Math.round((value / total) * 100) : 0
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10);

        // 5. Totals (always from base list for cards)
        const stats = {
            pendiente: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'pendiente').length,
            enProceso: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'en proceso').length,
            enResolucion: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'en resolucion').length,
            completadas: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'completadas').length,
            rechazada: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'rechazada').length,
            totalSubsidios: solicitudes.reduce((acc, s) => s.status?.trim().toLowerCase() === 'completadas' ? acc + (s.amount || 0) : acc, 0)
        };

        return { rows: result, chartData, uniqueResponsables: [], uniqueOrigins: [], uniqueLocations: [], stats };
    }, [solicitudes, visColumn]);

    // Pagination is handled by server now
    const currentRows = processedData.rows;

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
        // Reiniciar página a 1 cuando se ordena
        setCurrentPage(1);
    };

    const handleOpenABM = (solicitud = null) => {
        setSelectedSolicitud(solicitud);
        setIsABMOpen(true);
    };


    if (loading && !solicitudes.length) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            
            <div className="p-8 max-w-7xl mx-auto space-y-8">
                {/* Top Nav */}
                <div className="flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Inicio
                    </Link>
                    <div className="flex gap-3">
                            <button
                                onClick={handleExportCSV}
                                className="px-4 py-2 bg-green-600 hover:bg-green-500 border border-green-500 rounded-xl text-white font-bold flex items-center gap-2 transition-all text-sm shadow-lg shadow-green-900/20"
                            >
                                <Download className="h-4 w-4" /> Exportar CSV
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <Filter className="h-5 w-5" />
                        </button>
                        <button
                            onClick={() => handleOpenABM()}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            Nueva Solicitud
                        </button>
                        {(configId && (user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN')) && (
                            <Link
                                to={`/projects/config/${configId}/settings`}
                                className="bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white p-2.5 rounded-xl border border-gray-700 transition-all"
                                title="Configuración Avanzada"
                            >
                                <Settings className="h-5 w-5" />
                            </Link>
                        )}
                    </div>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <div className="bg-gray-800 border border-gray-700 p-6 rounded-3xl shadow-xl animate-in slide-in-from-top-4 mb-8">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                <Filter className="h-4 w-4" /> Filtros Activos
                            </h3>
                            <button
                                onClick={() => setFilters({})}
                                className="text-xs text-gray-500 hover:text-white flex items-center gap-1 transition-colors"
                            >
                                <FilterX className="h-3 w-3" /> Limpiar todo
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Rango de Fecha</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none mb-2"
                                    value={filters.dateRange || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                                >
                                    <option value="">Todos</option>
                                    <option value="1M">Último mes</option>
                                    <option value="6M">Últimos 6 meses</option>
                                    <option value="1Y">Último año</option>
                                    <option value="2Y">Últimos 2 años</option>
                                    <option value="CUSTOM">Personalizar...</option>
                                </select>
                                {filters.dateRange === 'CUSTOM' && (
                                    <div className="flex gap-2 animate-in slide-in-from-top-2">
                                        <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-xs text-white"
                                            value={filters.customStartDate || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, customStartDate: e.target.value }))}
                                            title="Desde" />
                                        <input type="date" className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-xs text-white"
                                            value={filters.customEndDate || ''}
                                            onChange={(e) => setFilters(prev => ({ ...prev, customEndDate: e.target.value }))}
                                            title="Hasta" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Estado</label>
                                <select
                                    className="bg-gray-900 text-sm border border-gray-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                    value={filters.status || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="">Todos los Estados</option>
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en proceso">Asignadas</option>
                                    <option value="en resolucion">En Resolución</option>
                                    <option value="completadas">Resueltas</option>
                                    <option value="rechazada">Rechazado</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Localidad</label>
                                <select
                                    className="bg-gray-900 text-sm border border-gray-700 rounded-xl px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full"
                                    value={filters.locationId || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, locationId: e.target.value }))}
                                >
                                    <option value="">Todas las Localidades</option>
                                    {locationsList.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Origen</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={filters.origin || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, origin: e.target.value }))}
                                >
                                    <option value="">Todos</option>
                                    <option value="MANUAL">MANUAL</option>
                                    <option value="SINCRO">SINCRO</option>
                                    <option value="WEB">WEB</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Responsable</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={filters.responsableId || ''}
                                    onChange={(e) => setFilters(prev => ({ ...prev, responsableId: e.target.value }))}
                                >
                                    <option value="">Todos</option>
                                    <option value="0">(Sin Asignar)</option>
                                    {responsablesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Header Info & Stats */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                                {configId ? (config?.sheetName || 'Cargando...') : 'Mis Solicitudes'}
                            </h1>
                            <p className="text-gray-500 flex items-center gap-2 font-medium">
                                <Database className="h-4 w-4" />
                                Mostrar {processedData.rows.length} registros
                            </p>
                        </div>
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar por N° Orden, nombre, DNI, localidad..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'pendiente' ? '' : 'pendiente' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'pendiente' ? 'bg-yellow-900/40 border-2 border-yellow-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]"></div> Pendiente
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.pendiente}
                            </div>
                        </button>
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'en proceso' ? '' : 'en proceso' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'en proceso' ? 'bg-blue-900/40 border-2 border-blue-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> Asignadas
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.enProceso || stats.en_proceso || 0}
                            </div>
                        </button>
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'en resolucion' ? '' : 'en resolucion' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'en resolucion' ? 'bg-purple-900/40 border-2 border-purple-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div> En Resolución
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.enResolucion || stats.en_resolucion || 0}
                            </div>
                        </button>
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'completadas' ? '' : 'completadas' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'completadas' ? 'bg-green-900/40 border-2 border-green-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div> Resueltas
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.completadas}
                            </div>
                        </button>
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'rechazada' ? '' : 'rechazada' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'rechazada' ? 'bg-red-900/40 border-2 border-red-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div> Rechazados
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.rechazada}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm shadow-xl">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4 text-indigo-500" /> Analítica de Distribución
                            </h3>
                            <select
                                className="bg-gray-900 border border-gray-700 text-[10px] font-bold uppercase rounded-lg px-3 py-1 text-gray-400"
                                value={visColumn}
                                onChange={(e) => setVisColumn(e.target.value)}
                            >
                                <option value="status">Por Estado</option>
                                <option value="location">Por Localidad</option>
                                {(user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN') && (
                                    <option value="responsable">Por Responsable</option>
                                )}
                                <option value="origin">Por Origen</option>
                            </select>
                        </div>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={processedData.chartData} margin={{ bottom: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" />
                                    <YAxis stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                    <RechartsTooltip
                                        content={({ active, payload }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-gray-900 border border-gray-700 p-3 rounded-xl shadow-2xl">
                                                        <p className="text-xs font-bold text-white mb-1">{data.name}</p>
                                                        <p className="text-lg font-black text-indigo-400">{data.value} <span className="text-xs text-gray-500">({data.percentage}%)</span></p>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                        {processedData.chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="bg-gray-800/50 rounded-[2rem] border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-xl relative">
                    {/* Floating Action Bar */}
                    {selectedRows.length > 0 && (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-500 p-2 px-4 rounded-full shadow-2xl z-[50] flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-300">
                            <span className="text-white font-bold text-xs">{selectedRows.length} seleccionadas</span>
                            <div className="h-4 w-px bg-indigo-400"></div>
                            <select 
                                className="bg-indigo-700 border-none text-xs rounded-full px-3 py-1 text-white outline-none cursor-pointer hover:bg-indigo-800 transition-colors"
                                onChange={(e) => {
                                    handleBulkAssign(e.target.value);
                                    e.target.value = "";
                                }}
                                defaultValue=""
                            >
                                <option value="" disabled>Asignar Responsable...</option>
                                <option value="0">(Quitar Asignación)</option>
                                {responsablesList.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            {user?.role === 'ADMINISTRADOR' && (
                                <button onClick={handleBulkDelete} className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm">
                                    Eliminar
                                </button>
                            )}
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-3 w-10 text-center">
                                        <input 
                                            type="checkbox" 
                                            className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                            onChange={handleSelectAll}
                                            checked={currentRows.length > 0 && selectedRows.length === currentRows.length}
                                        />
                                    </th>
                                    <th className="p-3">N° Orden</th>
                                    <th onClick={() => handleSort('entryDate')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                        Fecha {sortConfig.key === 'entryDate' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th onClick={() => handleSort('origin')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                        Origen {sortConfig.key === 'origin' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th onClick={() => handleSort('person')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                        Beneficiario {sortConfig.key === 'person' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th className="p-3">Ubicación</th>
                                    <th className="p-3 min-w-[200px]">Solicitud</th>
                                    <th className="p-3">RESPONSABLE</th>
                                    <th onClick={() => handleSort('status')} className="p-3 cursor-pointer hover:text-white transition-colors min-w-[120px]">
                                        Estado {sortConfig.key === 'status' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th className="p-3 min-w-[250px]">Detalles de Resolución</th>
                                    <th className="p-3 text-right sticky right-0 bg-gray-900/90 shadow-xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {currentRows.map((s) => {
                                    const entryDate = parseLocalDate(s.entryDate);
                                    const monthName = entryDate ? entryDate.toLocaleString('es-ES', { month: 'long' }) : '-';

                                    // Location Logic
                                    let localidad = '-';
                                    let barrio = '-';
                                    if (s.location) {
                                        if (s.location.type === 'NEIGHBORHOOD') {
                                            barrio = s.location.name;
                                            localidad = s.location.parent ? s.location.parent.name : '-';
                                        } else {
                                            localidad = s.location.name;
                                        }
                                    }

                                    // Renderizar detalles de resolucion
                                    let resolucionContent = '-';
                                    let hasPendingApproval = false;

                                    if (s.resolutorAssignments && s.resolutorAssignments.length > 0) {
                                        resolucionContent = s.resolutorAssignments.map((assignment, index) => {
                                            let text = `${assignment.tipoResolucion}: `;
                                            try {
                                                const parsed = JSON.parse(assignment.detalle);
                                                text += Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                                            } catch (e) {
                                                text += assignment.detalle;
                                            }
                                            
                                            if (assignment.resolutor?.email === user?.email && !assignment.approved) {
                                                hasPendingApproval = true;
                                            }
                                            
                                            return (
                                                <div key={index} className="mb-1 pb-1 border-b border-gray-700/50 last:border-0">
                                                    <span className="font-bold text-indigo-300">{assignment.resolutor?.name || assignment.resolutorEmail}:</span> {text}
                                                    {assignment.approved && <Check className="inline h-3 w-3 text-emerald-500 ml-1" title="Aprobado" />}
                                                </div>
                                            );
                                        });
                                    }

                                    return (
                                        <tr key={s.id} className={`group transition-all text-xs border-b border-gray-800 ${selectedRows.includes(s.id) ? 'bg-indigo-900/20' : 'hover:bg-gray-700/20'}`}>
                                            <td className="p-3 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                                    checked={selectedRows.includes(s.id)}
                                                    onChange={() => handleSelectRow(s.id)}
                                                />
                                            </td>
                                            <td className="p-3 font-mono text-gray-500">#{s.id}</td>
                                            <td className="p-3 text-gray-300 whitespace-nowrap">
                                                {entryDate ? entryDate.toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-gray-400">{s.origin || '-'}</td>
                                            <td className="p-3 font-bold text-white whitespace-nowrap">
                                                {s.person?.name || '-'}<br/>
                                                <span className="font-mono text-gray-500 text-[10px]">{s.person?.phone || ''}</span>
                                            </td>
                                            <td className="p-3 text-gray-400">
                                                {localidad}<br/>
                                                <span className="text-gray-500 text-[10px]">{barrio}</span>
                                            </td>
                                            <td className="p-3 text-gray-300 font-medium leading-snug">
                                                <div className="line-clamp-2" title={s.description}>{s.description}</div>
                                            </td>
                                            <td className="p-3 text-indigo-300 font-bold uppercase whitespace-nowrap">
                                                {s.responsable?.name || '-'}<br/>
                                                <span className="text-indigo-500/50 text-[10px]">{s.zone || ''}</span>
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                <StatusBadge status={s.status} />
                                            </td>
                                            <td className="p-3 text-gray-300 text-[11px] leading-tight">
                                                {resolucionContent}
                                            </td>
                                            <td className="p-3 sticky right-0 bg-gray-900/90 shadow-xl group-hover:bg-gray-800 transition-colors">
                                                <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                                                    {hasPendingApproval && (
                                                        <button onClick={() => handleAprobarRapido(s.id)} title="Aprobar Rápidamente" className="p-1.5 hover:bg-emerald-600 bg-emerald-900/30 rounded text-emerald-400 hover:text-white transition-colors">
                                                            <Check className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                    <button onClick={() => handleOpenABM(s)} title="Ver / Editar Detalles" className="p-1.5 hover:bg-indigo-600 bg-gray-800 rounded text-indigo-400 hover:text-white transition-colors">
                                                        <Edit3 className="h-4 w-4" />
                                                    </button>
                                                    {user?.role === 'ADMINISTRADOR' && (
                                                        <button onClick={() => handleDelete(s.id)} title="Eliminar" className="p-1.5 hover:bg-red-600 rounded text-gray-400 hover:text-white transition-colors">
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination Controls */}
                <div className="flex items-center justify-between px-4 pb-8 text-sm text-gray-500 font-black uppercase tracking-widest">
                    <div>Página {currentPage} de {totalPages || 1}</div>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(p => p - 1)}
                            className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl disabled:opacity-20 hover:bg-gray-700 transition-all"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={currentPage === totalPages}
                            onClick={() => setCurrentPage(p => p + 1)}
                            className="bg-gray-800 border border-gray-700 px-4 py-2 rounded-xl disabled:opacity-20 hover:bg-gray-700 transition-all"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <SolicitudModal
                isOpen={isABMOpen}
                onClose={() => setIsABMOpen(false)}
                onSuccess={fetchData}
                initialData={selectedSolicitud}
                configId={configId}
            />
        </div>
    );
}
