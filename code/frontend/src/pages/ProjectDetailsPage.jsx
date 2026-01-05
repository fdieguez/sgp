import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Database,
    DownloadCloud,
    Search,
    ChevronLeft,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    AlertCircle,
    Info,
    Maximize2
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

// --- Helper Components ---

const TruncatedCell = ({ content }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const text = String(content);

    // Only truncate if longer than X chars
    const shouldTruncate = text.length > 30;

    if (!shouldTruncate) return <span className="text-sm text-gray-300">{text}</span>;

    return (
        <div className="relative group">
            <div
                className="max-w-[200px] truncate text-sm text-gray-300 cursor-help border-b border-dotted border-gray-600 hover:text-white transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {text}
            </div>

            {/* Popover on Hover/Focus */}
            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-50 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 text-sm text-white animate-in fade-in zoom-in duration-200">
                <div className="mb-1 font-semibold text-xs text-indigo-400 flex items-center gap-1">
                    <Maximize2 className="h-3 w-3" /> Vista Completa
                </div>
                <p className="whitespace-normal break-words">{text}</p>
            </div>
        </div>
    );
};

// --- Sorting Helpers ---

const parseDate = (str) => {
    if (!str) return -Infinity;
    // Try DD/MM/YYYY format commonly used in sheets
    const parts = String(str).split('/');
    if (parts.length === 3) {
        // Assume DD/MM/YYYY
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    return String(str).toLowerCase();
};

const isDateColumn = (headerName) => {
    return /fecha|date|creado|updated/i.test(headerName);
};

// --- Main Page ---

export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const rowsPerPage = 50;

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await axios.get(`http://localhost:8080/api/projects/by-config/${configId}`);
                setProject(response.data);
            } catch (err) {
                console.error(err);
                if (err.response?.status === 404) {
                    setError("No se encontraron datos sincronizados. Ve al Dashboard y pulsa Sincronizar.");
                } else {
                    setError("Error cargando los datos del proyecto.");
                }
            } finally {
                setLoading(false);
            }
        };
        fetchProject();
    }, [configId]);

    // Data Processing & Stats
    const { headers, filteredRows, stats } = useMemo(() => {
        if (!project || !project.dataJson) return { headers: [], filteredRows: [], stats: null };

        try {
            const rawData = JSON.parse(project.dataJson);
            if (rawData.length === 0) return { headers: [], filteredRows: [], stats: null };

            const headers = rawData[0];
            const dataRows = rawData.slice(1);

            // 1. Filter
            let processedRows = dataRows;
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                processedRows = processedRows.filter(row =>
                    row.some(cell => String(cell).toLowerCase().includes(lowerTerm))
                );
            }

            // 2. Sort
            if (sortConfig.key !== null) {
                processedRows = [...processedRows].sort((a, b) => {
                    const headerName = headers[sortConfig.key];
                    let aValue = a[sortConfig.key];
                    let bValue = b[sortConfig.key];

                    if (isDateColumn(headerName)) {
                        aValue = parseDate(aValue);
                        bValue = parseDate(bValue);
                    } else if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
                        // Numeric sort
                        aValue = Number(aValue);
                        bValue = Number(bValue);
                    }

                    if (aValue < bValue) {
                        return sortConfig.direction === 'asc' ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return sortConfig.direction === 'asc' ? 1 : -1;
                    }
                    return 0;
                });
            }

            // 3. Generate Stats
            // Try to find specific columns by name
            const zonaIndex = headers.findIndex(h => /zona/i.test(h));
            const respIndex = headers.findIndex(h => /responsable/i.test(h));
            const locIndex = headers.findIndex(h => /localidad/i.test(h));

            const calculateDistribution = (idx) => {
                if (idx === -1) return [];
                const counts = {};
                processedRows.forEach(row => {
                    const val = row[idx] || 'N/A';
                    counts[val] = (counts[val] || 0) + 1;
                });
                return Object.entries(counts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10); // Top 10
            };

            const stats = {
                byZona: calculateDistribution(zonaIndex),
                byResponsable: calculateDistribution(respIndex),
                byLocalidad: calculateDistribution(locIndex),
                total: processedRows.length
            };

            return { headers, filteredRows: processedRows, stats };
        } catch (e) {
            console.error("JSON Parse error", e);
            return { headers: [], filteredRows: [], stats: null };
        }
    }, [project, searchTerm, sortConfig]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const currentRows = filteredRows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1); // Reset to first page on search
    };

    const handleSort = (columnIndex) => {
        let direction = 'asc';
        if (sortConfig.key === columnIndex && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key: columnIndex, direction });
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    const COLORS = ['#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#eab308'];

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Navigation & Header */}
                <div>
                    <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </Link>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">{project?.name || 'Detalle de Proyecto'}</h1>
                            <div className="flex items-center gap-4 text-gray-400 text-sm mt-1">
                                <span className="flex items-center">
                                    <Database className="mr-1 h-3.5 w-3.5" />
                                    {filteredRows.length} Registros
                                </span>
                                <span className="flex items-center">
                                    <Calendar className="mr-1 h-3.5 w-3.5" />
                                    {project?.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* VISUALIZATION SECTION */}
                {!error && stats && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* KPI Card */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
                            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-2">Total Registros</h3>
                            <div className="text-4xl font-bold text-white">{stats.total}</div>
                            <div className="mt-4 text-xs text-gray-500">
                                Datos filtrados actuales
                            </div>
                        </div>

                        {/* Chart: Por Zona */}
                        {stats.byZona.length > 0 && (
                            <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg col-span-1 md:col-span-2">
                                <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4">Distribución por Zona</h3>
                                <div className="h-48 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={stats.byZona}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                            <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                                            <RechartsTooltip
                                                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                                itemStyle={{ color: '#fff' }}
                                                cursor={{ fill: '#374151', opacity: 0.4 }}
                                            />
                                            <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Toolbar */}
                {!error && (
                    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center shadow-sm">
                        <div className="relative w-full sm:w-96">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full pl-10 pr-3 py-2 border border-gray-600 rounded-lg leading-5 bg-gray-900 text-gray-300 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                placeholder="Buscar en la planilla..."
                                value={searchTerm}
                                onChange={handleSearch}
                            />
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Página {currentPage} de {totalPages || 1}</span>
                            <div className="flex rounded-md shadow-sm">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-600 bg-gray-700 text-sm font-medium text-gray-200 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                {error && (
                    <div className="bg-red-900/20 border border-red-800 text-red-200 p-8 rounded-xl text-center">
                        <AlertCircle className="h-10 w-10 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">{error}</p>
                    </div>
                )}

                {!error && (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-xl overflow-hidden flex flex-col">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-900/50 border-b border-gray-700">
                                        {headers.map((header, index) => (
                                            <th
                                                key={index}
                                                onClick={() => handleSort(index)}
                                                className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap cursor-pointer hover:text-white hover:bg-gray-800 transition-colors select-none group sticky top-0 bg-gray-900 z-10"
                                            >
                                                <div className="flex items-center gap-1">
                                                    {header}
                                                    {sortConfig.key === index ? (
                                                        sortConfig.direction === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />
                                                    ) : (
                                                        <ArrowUpDown className="h-3 w-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {currentRows.length > 0 ? (
                                        currentRows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-700/50 transition-colors group">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="p-4 align-middle">
                                                        <TruncatedCell content={cell} />
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={headers.length || 1} className="p-12 text-center text-gray-500">
                                                {searchTerm ? 'No se encontraron resultados para tu búsqueda' : 'No hay datos disponibles'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
