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
                                <tr className="bg-gray-900/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <th className="p-3">N° Orden</th>
                                    <th onClick={() => handleSort('entryDate')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                        Fecha Ingreso {sortConfig.key === 'entryDate' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                    </th>
                                    <th className="p-3">Mes</th>
                                    <th className="p-3">Origen</th>
                                    <th onClick={() => handleSort('person')} className="p-3 cursor-pointer hover:text-white transition-colors">Nombre / Institución</th>
                                    <th onClick={() => handleSort('location')} className="p-3 cursor-pointer hover:text-white transition-colors">Localidad</th>
                                    <th className="p-3">Barrio</th>
                                    <th className="p-3">Teléfono</th>
                                    <th className="p-3 min-w-[200px]">Solicitud</th>
                                    <th className="p-3 text-center">ZONA / EJE</th>
                                    <th className="p-3">RESPONSABLE</th>
                                    <th className="p-3">F. Contacto</th>
                                    <th className="p-3">F. Resolución</th>
                                    <th className="p-3">Resolución</th>
                                    <th className="p-3 min-w-[150px]">Detalle</th>
                                    <th className="p-3 min-w-[150px]">Observación</th>
                                    <th className="p-3 text-right">Monto</th>
                                    <th className="p-3 text-center">CONTROL 1er C.</th>
                                    <th className="p-3 text-right sticky right-0 bg-gray-900/90 shadow-xl">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {currentRows.map((s) => {
                                    const entryDate = s.entryDate ? new Date(s.entryDate) : null;
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

                                    return (
                                        <tr key={s.id} className="group hover:bg-gray-700/20 transition-all text-xs border-b border-gray-800">
                                            <td className="p-3 font-mono text-gray-500">#{s.id}</td>
                                            <td className="p-3 text-gray-300 whitespace-nowrap">
                                                {entryDate ? entryDate.toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-gray-400 capitalize">{monthName}</td>
                                            <td className="p-3 text-gray-400">{s.origin || '-'}</td>
                                            <td className="p-3 font-bold text-white whitespace-nowrap">{s.person?.name || '-'}</td>
                                            <td className="p-3 text-gray-400">{localidad}</td>
                                            <td className="p-3 text-gray-400">{barrio}</td>
                                            <td className="p-3 font-mono text-gray-500">{s.person?.phone || '-'}</td>
                                            <td className="p-3 text-gray-300 font-medium leading-snug">
                                                <div className="line-clamp-2" title={s.description}>{s.description}</div>
                                            </td>
                                            <td className="p-3 text-center font-mono text-indigo-400 font-bold">{s.zone || '-'}</td>
                                            <td className="p-3 text-indigo-300 font-bold uppercase whitespace-nowrap">{s.responsable?.name || '-'}</td>
                                            <td className="p-3 text-gray-400 whitespace-nowrap">
                                                {s.contactDate ? new Date(s.contactDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-gray-400 whitespace-nowrap">
                                                {s.resolutionDate ? new Date(s.resolutionDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-3 text-gray-300">
                                                {s.resolution || <StatusBadge status={s.status} />}
                                            </td>
                                            <td className="p-3 text-gray-400 italic">
                                                <div className="line-clamp-2" title={s.detail}>{s.detail || '-'}</div>
                                            </td>
                                            <td className="p-3 text-yellow-500/80 italic">
                                                <div className="line-clamp-2" title={s.observation}>{s.observation || '-'}</div>
                                            </td>
                                            <td className="p-3 text-right font-mono text-emerald-400">
                                                {s.amount ? `$${s.amount.toLocaleString()}` : '-'}
                                            </td>
                                            <td className="p-3 text-center">
                                                {s.firstContactControl ?
                                                    <Check className="inline h-4 w-4 text-emerald-500" /> :
                                                    <span className="text-gray-700">-</span>
                                                }
                                            </td>
                                            <td className="p-3 sticky right-0 bg-gray-900/90 shadow-xl group-hover:bg-gray-800 transition-colors">
                                                <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                                                    <button onClick={() => handleOpenDetail(s)} title="Ver Detalle" className="p-1.5 hover:bg-indigo-600 rounded text-gray-400 hover:text-white"><Eye className="h-3 w-3" /></button>
                                                    <button onClick={() => handleOpenABM(s)} title="Editar" className="p-1.5 hover:bg-emerald-600 rounded text-gray-400 hover:text-white"><Edit3 className="h-3 w-3" /></button>
                                                    <button onClick={() => handleDelete(s.id)} title="Eliminar" className="p-1.5 hover:bg-red-600 rounded text-gray-400 hover:text-white"><Trash2 className="h-3 w-3" /></button>
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
            <SolicitudDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                solicitud={selectedSolicitud}
            />
        </div>
    );
}
