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
    AlertCircle,
    BarChart3,
    PieChart as PieChartIcon,
    Maximize2,
    Filter,
    X,
    FilterX
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

// --- Type Detection & Parsing Helpers ---

const detectType = (value) => {
    if (value === null || value === undefined || value === '') return 'empty';
    const str = String(value).trim();
    if (!isNaN(Number(str))) return 'number';
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(str)) return 'date-dmy';
    if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) return 'date-iso';
    return 'string';
};

const parseVal = (value, type) => {
    if (value === null || value === undefined) return -Infinity;
    const str = String(value).trim();
    if (type === 'number') return Number(str);
    if (type === 'date-dmy') {
        const parts = str.split('/');
        return new Date(parts[2], parts[1] - 1, parts[0]).getTime();
    }
    if (type === 'date-iso') return new Date(str).getTime();
    return str.toLowerCase();
};

const getColumnType = (rows, colIndex) => {
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const val = rows[i][colIndex];
        const type = detectType(val);
        if (type !== 'empty' && type !== 'string') return type;
    }
    return 'string';
};

const getYearFromValue = (value, type) => {
    if (!value) return null;
    if (type === 'date-dmy') {
        const parts = String(value).split('/');
        return parts.length === 3 ? parts[2] : null;
    }
    if (type === 'date-iso') {
        return String(value).substring(0, 4);
    }
    return null;
}


// --- UI Components ---

const TruncatedCell = ({ content, rowIndex }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const text = String(content || '');
    const shouldTruncate = text.length > 30;

    if (!shouldTruncate) return <span className="text-sm text-gray-300">{text}</span>;

    // Logic: If it's one of the first 2 rows, show popover BELOW (top-full). Otherwise show ABOVE (bottom-full).
    const isTopRow = rowIndex < 2;
    const positionClasses = isTopRow ? 'top-full mt-2' : 'bottom-full mb-2';

    return (
        <div className="relative group">
            <div
                className="max-w-[200px] truncate text-sm text-gray-300 cursor-help border-b border-dotted border-gray-600 hover:text-white transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                {text}
            </div>

            <div className={`absolute left-0 ${positionClasses} hidden group-hover:block z-[60] w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl p-4 text-sm text-white animate-in fade-in zoom-in duration-200 pointer-events-none max-h-80 overflow-y-auto`}>
                <div className="mb-2 font-semibold text-xs text-indigo-400 flex items-center gap-1 border-b border-gray-700 pb-1">
                    <Maximize2 className="h-3 w-3" /> Vista Completa
                </div>
                <p className="whitespace-pre-wrap break-words leading-relaxed">{text}</p>
            </div>
        </div>
    );
};



export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [visColumn, setVisColumn] = useState('');
    const [filters, setFilters] = useState({}); // { colIndex: 'value' }
    const [showFilters, setShowFilters] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(50);

    useEffect(() => {
        const fetchProject = async () => {
            try {
                const response = await api.get(`/api/projects/by-config/${configId}`);
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

    // Data Processing
    const { headers, filteredRows, chartData, categoricalColumns, filterOptions } = useMemo(() => {
        if (!project || !project.dataJson) return {
            headers: [], filteredRows: [], chartData: [], categoricalColumns: [], filterOptions: {}
        };

        try {
            const rawData = JSON.parse(project.dataJson);
            if (rawData.length === 0) return { headers: [], filteredRows: [], chartData: [], categoricalColumns: [], filterOptions: {} };

            // Sanitize headers: prevent empty strings
            const headers = rawData[0].map((h, i) => (h && String(h).trim() !== '') ? h : `Campo ${i + 1}`);
            const dataRows = rawData.slice(1);
            const colTypes = headers.map((_, idx) => getColumnType(dataRows, idx));

            // Generate Filter Options
            const filterOptions = {};
            headers.forEach((header, idx) => {
                const type = colTypes[idx];
                const values = new Set();
                dataRows.forEach(row => {
                    let val = row[idx];
                    if (type.startsWith('date')) {
                        // For dates, extract Year
                        const year = getYearFromValue(val, type);
                        if (year) values.add(year);
                    } else {
                        if (val !== null && val !== undefined && val !== '') values.add(String(val));
                    }
                });
                // Only enable filtering if reasonable number of options (e.g., < 50 for text, or any for dates/years)
                if (values.size > 0 && (values.size < 100 || type.startsWith('date'))) {
                    filterOptions[idx] = {
                        name: header,
                        type: type,
                        values: Array.from(values).sort()
                    };
                }
            });

            // Categorical Cols for Charts
            const catCols = headers.map((header, index) => {
                const uniqueValues = new Set(dataRows.map(row => row[index]));
                return { name: header, index, uniqueCount: uniqueValues.size };
            }).filter(col => col.uniqueCount > 1 && col.uniqueCount <= 100);

            // --- FILTERING PIPELINE ---
            let processedRows = dataRows;

            // 1. Global Search
            if (searchTerm) {
                const lowerTerm = searchTerm.toLowerCase();
                processedRows = processedRows.filter(row =>
                    row.some(cell => String(cell).toLowerCase().includes(lowerTerm))
                );
            }

            // 2. Column Filters
            Object.entries(filters).forEach(([colIdx, filterVal]) => {
                if (!filterVal) return;
                const idx = Number(colIdx);
                const type = colTypes[idx];

                processedRows = processedRows.filter(row => {
                    const cellVal = row[idx];
                    if (type.startsWith('date')) {
                        const year = getYearFromValue(cellVal, type);
                        return String(year) === String(filterVal);
                    }
                    return String(cellVal) === String(filterVal);
                });
            });

            // 3. Sort
            if (sortConfig.key !== null) {
                const type = colTypes[sortConfig.key];
                processedRows = [...processedRows].sort((a, b) => {
                    const aRaw = a[sortConfig.key];
                    const bRaw = b[sortConfig.key];
                    const aVal = parseVal(aRaw, type);
                    const bVal = parseVal(bRaw, type);

                    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                    return 0;
                });
            }

            // 4. Chart Data
            let chartData = [];
            let targetColIndex = -1;

            if (visColumn) {
                targetColIndex = headers.indexOf(visColumn);
            } else if (catCols.length > 0) {
                const preferred = catCols.find(c => /zona|estado|status|responsable|region|categoria/i.test(c.name));
                targetColIndex = preferred ? preferred.index : catCols[0].index;
            }

            if (targetColIndex !== -1) {
                const counts = {};
                processedRows.forEach(row => {
                    let val = row[targetColIndex];
                    if (val === null || val === undefined || val === '') val = '(Vacío)';
                    counts[val] = (counts[val] || 0) + 1;
                });

                chartData = Object.entries(counts)
                    .map(([name, value]) => ({ name, value }))
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 20);
            }

            return { headers, filteredRows: processedRows, chartData, categoricalColumns: catCols, filterOptions };
        } catch (e) {
            console.error("JSON Parse error", e);
            return { headers: [], filteredRows: [], chartData: [], categoricalColumns: [], filterOptions: {} };
        }
    }, [project, searchTerm, sortConfig, visColumn, filters]);

    // Pagination
    const totalPages = Math.ceil(filteredRows.length / rowsPerPage);
    const currentRows = filteredRows.slice(
        (currentPage - 1) * rowsPerPage,
        currentPage * rowsPerPage
    );

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const handleFilterChange = (colIndex, val) => {
        setFilters(prev => {
            const next = { ...prev };
            if (val) next[colIndex] = val;
            else delete next[colIndex];
            return next;
        });
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({});
        setSearchTerm('');
        setCurrentPage(1);
    }

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

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6'];
    const activeFilterCount = Object.keys(filters).length;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
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
                                {(activeFilterCount > 0 || searchTerm) && (
                                    <span className="flex items-center text-indigo-400 cursor-pointer hover:text-indigo-300" onClick={clearFilters}>
                                        <FilterX className="mr-1 h-3.5 w-3.5" />
                                        Limpiar filtros
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`px-4 py-2 rounded-lg border transition-all flex items-center text-sm font-medium gap-2 ${showFilters || activeFilterCount > 0 ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}
                        >
                            <Filter className="h-4 w-4" />
                            Filtros {activeFilterCount > 0 && <span className="bg-white text-indigo-600 text-xs rounded-full px-1.5 font-bold">{activeFilterCount}</span>}
                        </button>
                    </div>
                </div>

                {/* FILTERS PANEL */}
                {showFilters && (
                    <div className="bg-gray-800 p-6 rounded-xl border border-gray-600 shadow-2xl grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-in slide-in-from-top-2 duration-300 relative">
                        <button
                            onClick={() => setShowFilters(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-white p-1 rounded-full hover:bg-gray-700 transition-colors"
                            title="Ocultar filtros"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {Object.entries(filterOptions).map(([idx, option]) => (
                            <div key={idx} className="flex flex-col">
                                <label className="block text-sm font-semibold text-gray-200 mb-2 truncate" title={option.name}>
                                    {option.type.startsWith('date') ? `Año de ${option.name}` : option.name}
                                </label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-500 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow shadow-sm"
                                    value={filters[idx] || ''}
                                    onChange={(e) => handleFilterChange(idx, e.target.value)}
                                >
                                    <option value="" className="text-gray-400">Todos</option>
                                    {option.values.map(val => (
                                        <option key={val} value={val}>{val}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                )}

                {/* VISUALIZATION SECTION */}
                {!error && chartData.length > 0 && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Control Panel */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg flex flex-col justify-center">
                            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                                <PieChartIcon className="h-4 w-4" /> Configuración de Gráficos
                            </h3>

                            <label className="block text-sm text-gray-500 mb-2">Analizar distribución por:</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                value={visColumn}
                                onChange={(e) => setVisColumn(e.target.value)}
                            >
                                <option value="">Auto-detectar</option>
                                {categoricalColumns.map(col => (
                                    <option key={col.index} value={col.name}>{col.name} ({col.uniqueCount} val)</option>
                                ))}
                            </select>

                            <div className="mt-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700/50 text-center">
                                <div className="text-3xl font-bold text-indigo-400">{filteredRows.length}</div>
                                <div className="text-xs text-gray-500 uppercase tracking-widest mt-1">Total Registros Filtrados</div>
                            </div>
                        </div>

                        {/* Main Bar Chart */}
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg lg:col-span-2">
                            <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider mb-4 flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> Distribución: {visColumn || (categoricalColumns.length > 0 ? categoricalColumns[0].name : 'Datos')}
                            </h3>
                            <div className="h-64 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 50 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                        <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" />
                                        <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                                        <RechartsTooltip
                                            cursor={{ fill: '#374151', opacity: 0.4 }}
                                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', borderRadius: '8px' }}
                                        />
                                        <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                            {chartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
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

                        <div className="flex items-center gap-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <span>Mostrar:</span>
                                <select
                                    value={rowsPerPage}
                                    onChange={(e) => {
                                        setRowsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-1.5"
                                >
                                    <option value={10}>10</option>
                                    <option value={20}>20</option>
                                    <option value={50}>50</option>
                                    <option value={100}>100</option>
                                </select>
                            </div>

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
                                                        <TruncatedCell content={cell} rowIndex={rowIndex} />
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
        </div >
    );
}
