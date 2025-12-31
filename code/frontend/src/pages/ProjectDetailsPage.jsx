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
    ChevronRight
} from 'lucide-react';

export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI States
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;

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

    // Data Processing
    const { headers, filteredRows } = useMemo(() => {
        if (!project || !project.dataJson) return { headers: [], filteredRows: [] };

        try {
            const rawData = JSON.parse(project.dataJson);
            if (rawData.length === 0) return { headers: [], filteredRows: [] };

            const headers = rawData[0];
            const dataRows = rawData.slice(1);

            if (!searchTerm) return { headers, filteredRows: dataRows };

            const lowerTerm = searchTerm.toLowerCase();
            const filtered = dataRows.filter(row =>
                row.some(cell => String(cell).toLowerCase().includes(lowerTerm))
            );

            return { headers, filteredRows: filtered };
        } catch (e) {
            console.error("JSON Parse error", e);
            return { headers: [], filteredRows: [] };
        }
    }, [project, searchTerm]);

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

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

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
                                    {filteredRows.length} Registros encontrados
                                </span>
                                <span className="flex items-center">
                                    <Calendar className="mr-1 h-3.5 w-3.5" />
                                    {project?.updatedAt ? new Date(project.updatedAt).toLocaleString() : '-'}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 transition-all flex items-center text-sm font-medium">
                                <DownloadCloud className="mr-2 h-4 w-4" /> Exportar CSV
                            </button>
                        </div>
                    </div>
                </div>

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
                                            <th key={index} className="p-4 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                                {header}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {currentRows.length > 0 ? (
                                        currentRows.map((row, rowIndex) => (
                                            <tr key={rowIndex} className="hover:bg-gray-700/50 transition-colors group">
                                                {row.map((cell, cellIndex) => (
                                                    <td key={cellIndex} className="p-4 text-sm text-gray-300 whitespace-nowrap group-hover:text-white">
                                                        {cell}
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
