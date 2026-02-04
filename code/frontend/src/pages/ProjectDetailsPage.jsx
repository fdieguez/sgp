import { useEffect, useState, useMemo } from 'react';
import api from '../config/axios';
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
    Check
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
import SolicitudDetailModal from '../components/SolicitudDetailModal';

// --- UI Components ---
const StatusBadge = ({ status }) => {
    const styles = {
        COMPLETED: 'bg-green-900/30 text-green-400 border-green-800',
        PENDING: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
        IN_PROGRESS: 'bg-blue-900/30 text-blue-400 border-blue-800',
        REJECTED: 'bg-red-900/30 text-red-400 border-red-800'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[status] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
            {status}
        </span>
    );
};

export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const [solicitudes, setSolicitudes] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Modal States
    const [isABMOpen, setIsABMOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: 'entryDate', direction: 'desc' });
    const [visColumn, setVisColumn] = useState('status'); // Default chart by status
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        fetchData();
        fetchConfig();
    }, [configId]);

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
            const response = await api.get(`/api/solicitudes/config/${configId}`);
            setSolicitudes(response.data);
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
            fetchData();
        } catch (err) {
            alert("Error al eliminar");
        }
    };

    // Data Processing Pipeline
    const processedData = useMemo(() => {
        let result = [...solicitudes];

        // 1. Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(s =>
                s.description?.toLowerCase().includes(term) ||
                s.person?.name?.toLowerCase().includes(term) ||
                s.location?.name?.toLowerCase().includes(term)
            );
        }

        // 2. Filters
        Object.entries(filters).forEach(([key, val]) => {
            if (!val) return;
            if (key === 'year') {
                result = result.filter(s => s.entryDate && s.entryDate.startsWith(val));
            } else if (key === 'status') {
                result = result.filter(s => s.status === val);
            } else if (key === 'location') {
                result = result.filter(s => s.location?.name === val);
            } else if (key === 'responsable') {
                result = result.filter(s => s.responsable?.name === val);
            }
        });

        // 3. Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                let valA = a[sortConfig.key];
                let valB = b[sortConfig.key];

                // Nested fields
                if (sortConfig.key === 'person') valA = a.person?.name;
                if (sortConfig.key === 'person') valB = b.person?.name;
                if (sortConfig.key === 'location') valA = a.location?.name;
                if (sortConfig.key === 'location') valB = b.location?.name;

                if (!valA) return 1;
                if (!valB) return -1;

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 4. Chart Data with Percentages
        const total = result.length;
        const counts = {};
        result.forEach(s => {
            let val = '(Vacío)';
            if (visColumn === 'status') val = s.status;
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

        return { rows: result, chartData };
    }, [solicitudes, searchTerm, filters, sortConfig, visColumn]);

    // Pagination
    const totalPages = Math.ceil(processedData.rows.length / rowsPerPage);
    const currentRows = processedData.rows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleSort = (key) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleOpenABM = (solicitud = null) => {
        setSelectedSolicitud(solicitud);
        setIsABMOpen(true);
    };

    const handleOpenDetail = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setIsDetailOpen(true);
    };

    if (loading && !solicitudes.length) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Top Nav */}
                <div className="flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Dashboard
                    </Link>
                    <div className="flex gap-3">
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
                    </div>
                </div>

                {/* Header Info */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                            {config?.sheetName || 'Solicitudes'}
                        </h1>
                        <p className="text-gray-500 flex items-center gap-2 font-medium">
                            <Database className="h-4 w-4" />
                            {processedData.rows.length} registros encontrados
                        </p>
                    </div>

                    {/* Compact Filter Stats */}
                    <div className="flex gap-4">
                        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-2xl min-w-[120px]">
                            <div className="text-[10px] uppercase font-black text-gray-500 mb-1">Pendientes</div>
                            <div className="text-2xl font-bold text-yellow-500">
                                {processedData.rows.filter(s => s.status === 'PENDING').length}
                            </div>
                        </div>
                        <div className="bg-gray-800/50 border border-gray-700 p-4 rounded-2xl min-w-[120px]">
                            <div className="text-[10px] uppercase font-black text-gray-500 mb-1">Completados</div>
                            <div className="text-2xl font-bold text-green-500">
                                {processedData.rows.filter(s => s.status === 'COMPLETED').length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm shadow-xl">
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
                                <option value="responsable">Por Responsable</option>
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

                    {/* Activity Feed / Search */}
                    <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm flex flex-col justify-between">
                        <div className="relative mb-6">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Buscar solicitudes..."
                                className="w-full bg-gray-900 border border-gray-700 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="space-y-4">
                            <div className="bg-indigo-900/10 border border-indigo-500/20 p-4 rounded-2xl">
                                <p className="text-[10px] font-black uppercase text-indigo-400 tracking-tighter mb-2">Monto Total Subsidios</p>
                                <p className="text-2xl font-black text-white">
                                    ${processedData.rows.reduce((acc, s) => acc + (s.amount || 0), 0).toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-gray-900/30 p-4 rounded-2xl border border-gray-700/30">
                                <p className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">Promedio por Solicitud</p>
                                <p className="text-lg font-bold text-gray-300">
                                    {(processedData.rows.length > 0 ? (processedData.rows.reduce((acc, s) => acc + (s.amount || 0), 0) / processedData.rows.length) : 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Table Section */}
                <div className="bg-gray-800/50 rounded-[2rem] border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-900/80">
                                    <th onClick={() => handleSort('entryDate')} className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                                        Fecha {sortConfig.key === 'entryDate' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th onClick={() => handleSort('person')} className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">
                                        Beneficiario
                                    </th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Desc. / Obs.</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Zona</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Seguimiento</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">1er C.</th>
                                    <th onClick={() => handleSort('location')} className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Ubicación</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">Responsable</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">Estado</th>
                                    <th className="p-3 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {currentRows.map((s) => (
                                    <tr key={s.id} className="group hover:bg-gray-700/20 transition-all">
                                        <td className="p-3 text-xs font-medium text-gray-400">
                                            {s.entryDate ? new Date(s.entryDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="p-3">
                                            <div className="font-bold text-white text-xs">{s.person?.name}</div>
                                            <div className="text-[10px] text-gray-500 font-mono">{s.person?.phone}</div>
                                        </td>
                                        <td className="p-3 max-w-[200px]">
                                            <div className="text-xs text-gray-300 truncate font-medium" title={s.description}>{s.description}</div>
                                            {s.observation && <div className="text-[10px] text-yellow-500/80 truncate mt-1 italic" title={s.observation}>{s.observation}</div>}
                                            {s.amount > 0 && <div className="text-[10px] text-emerald-500 font-black tracking-tight mt-1">SUBSIDIO: ${s.amount.toLocaleString()}</div>}
                                        </td>
                                        <td className="p-3 text-xs text-gray-400 font-mono">
                                            {s.zone || '-'}
                                        </td>
                                        <td className="p-3 text-[10px] text-gray-400">
                                            {s.contactDate && <div><span className="text-gray-600">C:</span> {new Date(s.contactDate).toLocaleDateString()}</div>}
                                            {s.resolutionDate && <div><span className="text-gray-600">R:</span> {new Date(s.resolutionDate).toLocaleDateString()}</div>}
                                        </td>
                                        <td className="p-3 text-center">
                                            {s.firstContactControl ?
                                                <span className="inline-flex items-center justify-center w-5 h-5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                                                    <Check className="w-3 h-3" />
                                                </span>
                                                : <span className="text-gray-700">-</span>
                                            }
                                        </td>
                                        <td className="p-3 text-xs text-gray-400 font-medium">
                                            {s.location?.name || '-'}
                                        </td>
                                        <td className="p-3 text-[10px] text-indigo-300/80 font-bold uppercase">
                                            {s.responsable?.name || '-'}
                                        </td>
                                        <td className="p-3 text-center">
                                            <StatusBadge status={s.status} />
                                        </td>
                                        <td className="p-3">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleOpenDetail(s)} className="p-1.5 bg-gray-900 rounded-lg text-gray-400 hover:text-white hover:bg-indigo-600 transition-all border border-gray-700">
                                                    <Eye className="h-3 w-3" />
                                                </button>
                                                <button onClick={() => handleOpenABM(s)} className="p-1.5 bg-gray-900 rounded-lg text-gray-400 hover:text-white hover:bg-emerald-600 transition-all border border-gray-700">
                                                    <Edit3 className="h-3 w-3" />
                                                </button>
                                                <button onClick={() => handleDelete(s.id)} className="p-1.5 bg-gray-900 rounded-lg text-gray-400 hover:text-white hover:bg-red-600 transition-all border border-gray-700">
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
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
            <SolicitudDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                solicitud={selectedSolicitud}
            />
        </div>
    );
}
