import { useEffect, useState } from 'react';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import CreateConfigModal from '../components/CreateConfigModal';
import SolicitudModal from '../components/SolicitudModal';
import Navbar from '../components/Navbar';
import dashboardService from '../services/dashboardService';
import {
    LayoutDashboard,
    FileSpreadsheet,
    RefreshCw,
    Plus,
    ChevronRight,
    Search,
    DollarSign,
    MapPin,
    TrendingUp,
    PieChart as PieIcon,
    BarChart3
} from 'lucide-react';

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    PieChart,
    Pie,
    Cell
} from 'recharts';

export default function DashboardPage() {
    const [configs, setConfigs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncingId, setSyncingId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();
    const navigate = useNavigate();

    // Estados del Auditor (Etapa 10)
    const [stats, setStats] = useState(null);
    const [filterType, setFilterType] = useState('ALL');
    const [filterYear, setFilterYear] = useState(new Date().getFullYear());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showResultsDropdown, setShowResultsDropdown] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [isSolicitudModalOpen, setIsSolicitudModalOpen] = useState(false);

    const isAuditor = user?.role === 'AUDITOR';
    const isAdmin = user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN';

    useEffect(() => {
        if (isAdmin) {
            fetchConfigs();
        } else if (isAuditor) {
            fetchAuditorStats();
        } else if (user && user.role !== 'ADMINISTRADOR' && user.role !== 'AUDITOR') {
            navigate('/mis-solicitudes', { replace: true });
        } else {
            setLoading(false);
        }
    }, [user, navigate, filterType, filterYear]);

    const fetchConfigs = async () => {
        setLoading(true);
        try {
            const response = await api.get('/api/config');
            setConfigs(response.data);
        } catch (error) {
            console.error("Error fetching configs", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuditorStats = async () => {
        setLoading(true);
        try {
            const data = await dashboardService.getStats(filterType, filterYear);
            setStats(data);
        } catch (error) {
            console.error("Failed to fetch dashboard stats", error);
        } finally {
            setLoading(false);
        }
    };

    // Buscador global de solicitudes
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            setShowResultsDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setSearching(true);
            try {
                const response = await api.get('/api/solicitudes', {
                    params: { search: searchQuery, size: 5 }
                });
                setSearchResults(response.data?.content || []);
                setShowResultsDropdown(true);
            } catch (error) {
                console.error("Search failed", error);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery]);

    const handleSync = async (id) => {
        setSyncingId(id);
        try {
            await api.post(`/api/sync/${id}`);
            fetchConfigs();
            fetchAuditorStats();
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

    const handleOpenSolicitud = (solicitud) => {
        setSelectedSolicitud(solicitud);
        setIsSolicitudModalOpen(true);
        setShowResultsDropdown(false);
        setSearchQuery('');
    };

    const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#a855f7', '#06b6d4', '#3b82f6'];

    const renderAuditorView = () => {
        if (!stats) return null;

        const total = stats.totalSolicitudes || 0;
        const calculatePct = (val) => total > 0 ? Math.round((val / total) * 100) : 0;

        const monthlyData = stats.solicitudesMensuales || [];
        const monthlyAmountData = stats.montosMensualesSubsidios || [];
        
        const mergedMonthlyData = monthlyData.map(d => {
            const amtObj = monthlyAmountData.find(a => a.mes === d.mes);
            return {
                mes: d.mes,
                cantidad: d.cantidad,
                monto: amtObj ? parseFloat(amtObj.monto) : 0
            };
        });

        const locationData = Object.entries(stats.solicitudesPorLocalidad || {}).map(([key, val]) => ({
            name: key,
            cantidad: val
        })).sort((a, b) => b.cantidad - a.cantidad).slice(0, 8);

        const barrioData = Object.entries(stats.solicitudesPorBarrioSantaFe || {}).map(([key, val]) => ({
            name: key,
            value: val
        })).sort((a, b) => b.value - a.value).slice(0, 5);

        const subsidyTypeData = (stats.estadisticasPorTipoSubsidio || []).map(s => ({
            tipo: s.tipo,
            cantidad: s.cantidad,
            monto: parseFloat(s.monto || 0)
        }));

        return (
            <div className="space-y-8 mt-6">
                {/* Panel de Filtros y Buscador */}
                <div className="bg-gray-800/40 border border-gray-700/80 p-6 rounded-2xl backdrop-blur-xl flex flex-col md:flex-row gap-6 justify-between items-center z-20 relative">
                    <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Tipo Solicitud</label>
                            <select
                                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                            >
                                <option value="ALL">Todas las solicitudes</option>
                                <option value="SUBSIDIO">Subsidios</option>
                                <option value="AGENDA">Agendas</option>
                                <option value="PEDIDO">Declaración de Interés / Pedidos</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Año</label>
                            <select
                                className="bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={filterYear}
                                onChange={(e) => setFilterYear(Number(e.target.value))}
                            >
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                            </select>
                        </div>
                    </div>

                    {/* Buscador Global Integrado */}
                    <div className="relative w-full md:w-96">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-widest mb-1.5">Buscador de Solicitud</label>
                        <div className="relative">
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Escribe Nº Solicitud o Beneficiario..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setShowResultsDropdown(searchResults.length > 0)}
                            />
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            {searching && (
                                <RefreshCw className="absolute right-3 top-2.5 h-4 w-4 text-indigo-400 animate-spin" />
                            )}
                        </div>

                        {/* Dropdown de Resultados con Glassmorphism */}
                        {showResultsDropdown && searchResults.length > 0 && (
                            <div className="absolute right-0 left-0 mt-2 bg-gray-900/95 border border-gray-700/80 rounded-xl shadow-2xl backdrop-blur-xl z-50 overflow-hidden divide-y divide-gray-800 animate-in slide-in-from-top-2 duration-200">
                                {searchResults.map((sol) => (
                                    <button
                                        key={sol.id}
                                        onClick={() => handleOpenSolicitud(sol)}
                                        className="w-full text-left p-3.5 hover:bg-gray-800/60 transition-colors flex justify-between items-center group"
                                    >
                                        <div className="space-y-1 pr-4 truncate">
                                            <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1.5">
                                                <span># {sol.id}</span>
                                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-gray-800 text-gray-300 font-bold tracking-widest uppercase">
                                                    {sol.type}
                                                </span>
                                            </div>
                                            <div className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                                                {sol.person?.name || 'Sin Beneficiario'}
                                            </div>
                                            <div className="text-[10px] text-gray-500 truncate mt-0.5">
                                                {sol.description}
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                                                sol.status === 'completadas' ? 'bg-green-950/30 text-green-400 border-green-800' :
                                                sol.status === 'rechazada' ? 'bg-red-950/30 text-red-400 border-red-800' :
                                                sol.status === 'consideracion' ? 'bg-purple-950/30 text-purple-400 border-purple-800' :
                                                'bg-gray-850 text-gray-400 border-gray-750'
                                            }`}>
                                                {sol.status}
                                            </span>
                                            <ChevronRight className="h-4 w-4 text-gray-500 group-hover:text-white transition-colors" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {showResultsDropdown && searchResults.length === 0 && searchQuery.length >= 2 && !searching && (
                            <div className="absolute right-0 left-0 mt-2 bg-gray-900/90 border border-gray-700/80 rounded-xl p-4 text-center text-xs text-gray-400 z-50">
                                ❌ No se encontraron solicitudes coincidentes.
                            </div>
                        )}
                    </div>
                </div>

                {/* Tarjetas de Métricas de Control */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    {[
                        { title: "Solicitudes Totales", value: total, pct: "100%", color: "text-indigo-400", bg: "bg-indigo-950/30", border: "border-indigo-900/50" },
                        { title: "Pendientes", value: stats.pendingSolicitudes, pct: `${calculatePct(stats.pendingSolicitudes)}%`, color: "text-yellow-400", bg: "bg-yellow-950/30", border: "border-yellow-900/50" },
                        { title: "En Resolución", value: stats.inResolutionSolicitudes || 0, pct: `${calculatePct(stats.inResolutionSolicitudes)}%`, color: "text-purple-400", bg: "bg-purple-950/30", border: "border-purple-900/50" },
                        { title: "Completadas", value: stats.completedSolicitudes, pct: `${calculatePct(stats.completedSolicitudes)}%`, color: "text-green-400", bg: "bg-green-950/30", border: "border-green-900/50" },
                        { title: "Rechazadas", value: stats.rejectedSolicitudes || 0, pct: `${calculatePct(stats.rejectedSolicitudes)}%`, color: "text-red-400", bg: "bg-red-950/30", border: "border-red-900/50" }
                    ].map((card, i) => (
                        <div key={i} className={`bg-gray-800/40 rounded-2xl border ${card.border} p-6 shadow-xl backdrop-blur-md flex flex-col justify-between`}>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{card.title}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${card.bg} ${card.color} border border-current/25`}>{card.pct}</span>
                            </div>
                            <div className="text-3xl font-black text-white">{card.value}</div>
                        </div>
                    ))}
                </div>

                {/* Suite de Gráficos Recharts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Gráfico 1: Evolución Mensual (Área) */}
                    <div className="bg-gray-800/40 border border-gray-700/60 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-indigo-400" /> Evolución Mensual de Demandas
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">Cantidad por Mes</span>
                        </div>
                        <div className="h-72">
                            {mergedMonthlyData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={mergedMonthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
                                        <YAxis stroke="#9ca3af" fontSize={10} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                                        <Area type="monotone" dataKey="cantidad" name="Solicitudes" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-500">Sin datos de evolución para los filtros aplicados.</div>
                            )}
                        </div>
                    </div>

                    {/* Gráfico 2: Montos Mensuales de Subsidio (Líneas / Área) */}
                    <div className="bg-gray-800/40 border border-gray-700/60 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <DollarSign className="h-5 w-5 text-emerald-400" /> Presupuesto Mensual de Subsidios
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">Totales Entregados (ARS)</span>
                        </div>
                        <div className="h-72">
                            {monthlyAmountData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={mergedMonthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis dataKey="mes" stroke="#9ca3af" fontSize={10} />
                                        <YAxis stroke="#9ca3af" fontSize={10} tickFormatter={(tick) => `$${tick / 1000}k`} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} formatter={(val) => [`$${parseFloat(val).toLocaleString()}`, 'Presupuesto']} />
                                        <Area type="monotone" dataKey="monto" name="Monto" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAmount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-500">Sin datos de montos entregados para este período.</div>
                            )}
                        </div>
                    </div>

                    {/* Gráfico 3: Demandas por Localidad (Barras Horizontales) */}
                    <div className="bg-gray-800/40 border border-gray-700/60 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-pink-400" /> Top Localidades con Mayor Demanda
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">Top 8</span>
                        </div>
                        <div className="h-72">
                            {locationData.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={locationData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis type="number" stroke="#9ca3af" fontSize={10} />
                                        <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={10} width={80} />
                                        <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                                        <Bar dataKey="cantidad" fill="#ec4899" radius={[0, 4, 4, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-gray-500">Sin datos geográficos disponibles.</div>
                            )}
                        </div>
                    </div>

                    {/* Gráfico 4: Detalle de Santa Fe por Barrio (Circular) */}
                    <div className="bg-gray-800/40 border border-gray-700/60 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-base font-bold text-white flex items-center gap-2">
                                <PieIcon className="h-5 w-5 text-amber-400" /> Distribución en Santa Fe (Barrios/Zonas)
                            </h3>
                            <span className="text-xs text-gray-500 font-medium">Top 5</span>
                        </div>
                        <div className="h-72 flex flex-col md:flex-row items-center justify-around gap-4">
                            {barrioData.length > 0 ? (
                                <>
                                    <div className="h-52 w-52">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={barrioData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={45}
                                                    outerRadius={75}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {barrioData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="space-y-2.5">
                                        {barrioData.map((entry, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                                <span className="text-xs font-semibold text-gray-300 truncate w-32" title={entry.name}>{entry.name}</span>
                                                <span className="text-xs text-gray-500">({entry.value})</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="text-xs text-gray-500">Sin solicitudes dentro de la localidad Santa Fe.</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Desglose Especial: Tipos de Subsidios (Culturales, Deportes, etc.) */}
                <div className="bg-gray-800/40 border border-gray-700/60 p-6 rounded-2xl shadow-xl backdrop-blur-md space-y-4">
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-violet-400" /> Clasificación y Presupuesto por Categoría de Subsidios
                    </h3>
                    <div className="h-72">
                        {subsidyTypeData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={subsidyTypeData} margin={{ top: 10, right: 10, left: -10, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                    <XAxis dataKey="tipo" stroke="#9ca3af" fontSize={10} />
                                    <YAxis stroke="#9ca3af" fontSize={10} yAxisId="left" />
                                    <YAxis stroke="#9ca3af" fontSize={10} yAxisId="right" orientation="right" tickFormatter={(tick) => `$${tick / 1000}k`} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '12px' }} />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="cantidad" name="Cantidad Solicitudes" fill="#818cf8" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="monto" name="Monto Presupuestado (ARS)" fill="#34d399" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-xs text-gray-500">No hay subsidios cargados en este período para visualizar la clasificación.</div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white pb-12">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-2">
                            <LayoutDashboard className="text-indigo-500 h-8 w-8" />
                            {isAuditor ? 'Control y Seguimiento' : 'Panel de Control'}
                        </h1>
                        <p className="text-xs text-gray-400 mt-1 font-medium">
                            {isAuditor ? 'Análisis estadístico, evolución temporal de demandas e información presupuestaria.' : 'Acceso a planillas conectadas y visión general de solicitudes.'}
                        </p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            <Plus className="h-5 w-5" />
                            Nueva Planilla
                        </button>
                    )}
                    {isAuditor && (
                        <Link
                            to="/mis-solicitudes"
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-lg font-medium transition-colors"
                        >
                            Ver Todas las Solicitudes
                        </Link>
                    )}
                </div>

                {loading && !stats ? (
                    <div className="flex justify-center p-12">
                        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
                    </div>
                ) : isAuditor ? (
                    renderAuditorView()
                ) : (
                    <div className="space-y-8">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            <Link
                                to="/mis-solicitudes"
                                className="bg-gray-800 rounded-xl border border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)] overflow-hidden hover:border-indigo-400 transition-all duration-300 group flex flex-col justify-between"
                            >
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="p-3 bg-indigo-900/50 rounded-lg">
                                            <LayoutDashboard className="h-6 w-6 text-indigo-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 text-white group-hover:text-indigo-400 transition-colors">
                                        Todas las Solicitudes
                                    </h3>
                                    <p className="text-gray-400 text-xs mb-6">
                                        Gestión integral de solicitudes cargadas de forma manual o sincronizadas.
                                    </p>
                                </div>
                                <div className="flex items-center justify-end p-6 pt-4 border-t border-gray-700/50">
                                    <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 flex items-center gap-1">
                                        Ver Listado <ChevronRight className="h-4 w-4" />
                                    </span>
                                </div>
                            </Link>

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
                                            <button
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(config.id); }}
                                                className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Eliminar"
                                            >
                                                <Plus className="h-4 w-4 rotate-45 text-red-500" />
                                            </button>
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

                {isSolicitudModalOpen && selectedSolicitud && (
                    <SolicitudModal
                        isOpen={isSolicitudModalOpen}
                        onClose={() => {
                            setIsSolicitudModalOpen(false);
                            setSelectedSolicitud(null);
                        }}
                        onSuccess={fetchAuditorStats}
                        initialData={selectedSolicitud}
                    />
                )}
            </main>
        </div>
    );
}
