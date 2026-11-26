import { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    Calendar,
    Database,
    Search,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
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
    Download,
    FileSpreadsheet,
    FileText,
    UserCheck
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
import AsociarPlanillaModal from '../components/AsociarPlanillaModal';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';

// --- Funciones de ayuda ---
const parseLocalDate = (dateStr) => {
    if (!dateStr) return null;
    let dVal = null;
    if (dateStr instanceof Date) {
        dVal = dateStr;
    } else if (Array.isArray(dateStr)) {
        const [y, m, d] = dateStr;
        dVal = new Date(y, m - 1, d);
    } else if (typeof dateStr === 'string') {
        if (dateStr.includes('T')) {
            dVal = new Date(dateStr);
        } else {
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                const [y, m, d] = parts;
                dVal = new Date(y, m - 1, d);
            } else {
                dVal = new Date(dateStr);
            }
        }
    } else if (typeof dateStr === 'object') {
        // Por si Jackson serializa como objeto { year, monthValue, dayOfMonth } o similar
        const y = dateStr.year || dateStr.yearValue;
        const m = dateStr.monthValue || dateStr.month;
        const d = dateStr.dayOfMonth || dateStr.day;
        if (y && m && d) {
            dVal = new Date(y, m - 1, d);
        }
    }
    
    if (dVal && dVal instanceof Date && !isNaN(dVal.getTime())) {
        return dVal;
    }
    return null;
};

// --- Componentes de interfaz de usuario ---
const STATUS_MAP = {
    'pendiente': 'Pendiente',
    'en proceso': 'Asignadas',
    'en resolucion': 'En Resolución',
    'completadas': 'Resueltas',
    'rechazada': 'Rechazado',
    'consideracion': 'Consideración'
};

const StatusBadge = ({ status }) => {
    const s = status?.trim().toLowerCase();
    const styles = {
        completadas: 'bg-green-900/30 text-green-400 border-green-800',
        pendiente: 'bg-yellow-900/30 text-yellow-400 border-yellow-800',
        'en proceso': 'bg-blue-900/30 text-blue-400 border-blue-800',
        'en resolucion': 'bg-purple-900/30 text-purple-400 border-purple-800',
        rechazada: 'bg-red-900/30 text-red-400 border-red-800',
        consideracion: 'bg-orange-900/30 text-orange-400 border-orange-850'
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${styles[s] || 'bg-gray-700 text-gray-300 border-gray-600'}`}>
            {STATUS_MAP[s] || status}
        </span>
    );
};

export default function ProjectDetailsPage() {
    const { configId } = useParams();
    const [searchParams] = useSearchParams();
    const { user, activeTipoResolucion } = useAuth();
    const [solicitudes, setSolicitudes] = useState([]);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados de modales
    const [isABMOpen, setIsABMOpen] = useState(false);
    const [openApproveOnMount, setOpenApproveOnMount] = useState(false);
    const [selectedSolicitud, setSelectedSolicitud] = useState(null);
    const [selectedRows, setSelectedRows] = useState([]);
    const [isAsociarModalOpen, setIsAsociarModalOpen] = useState(false);
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
    const [soloMisPendientes, setSoloMisPendientes] = useState(false);
    const [importPreviewModal, setImportPreviewModal] = useState({ open: false, items: [], ids: null, warning: null });

    // Apertura automática de solicitud si viene referenciada por URL (?id=...)
    useEffect(() => {
        const urlId = searchParams.get('id');
        if (urlId) {
            api.get(`/api/solicitudes/${urlId}`)
                .then(res => {
                    if (res.data) {
                        setSelectedSolicitud(res.data);
                        setIsABMOpen(true);
                    }
                })
                .catch(err => {
                    console.error("Error al cargar solicitud referenciada en URL:", err);
                });
        }
    }, [searchParams]);

    // Estados de la interfaz
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalElements, setTotalElements] = useState(0);
    const [sortConfig, setSortConfig] = useState({ key: 'id', direction: 'desc' });
    const [localSortConfig, setLocalSortConfig] = useState({ key: null, direction: 'asc' });
    const [visColumn, setVisColumn] = useState('status'); // Gráfico por defecto por estado
    const [filters, setFilters] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [rowsPerPage, setRowsPerPage] = useState(() => {
        const saved = Number(localStorage.getItem('sgp-rows-per-page'));
        return [10, 50, 100, 500].includes(saved) ? saved : 10;
    });
    const [responsablesList, setResponsablesList] = useState([]);
    const [locationsList, setLocationsList] = useState([]);
    const [stats, setStats] = useState({
        pendiente: 0,
        enProceso: 0,
        enResolucion: 0,
        completadas: 0,
        rechazada: 0,
        consideracion: 0,
        totalSubsidios: 0
    });

    const SPREADSHEET_ID = config?.spreadsheetId || "1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g";
    const activeTipoUpper = activeTipoResolucion ? activeTipoResolucion.trim().toUpperCase() : null;
    const isResolutorSubsidio = user?.role === 'RESOLUTOR' && (
        activeTipoUpper
            ? activeTipoUpper.includes('SUBSIDIO')
            : user?.tiposResolucion?.some(t => t.tipo?.toUpperCase().includes('SUBSIDIO'))
    );
    const isResolutorSubsidioDinero = user?.role === 'RESOLUTOR' && (
        activeTipoUpper
            ? (activeTipoUpper.includes('SUBSIDIO') && activeTipoUpper.includes('DINERO'))
            : user?.tiposResolucion?.some(t => t.tipo?.toUpperCase().includes('SUBSIDIO') && t.tipo?.toUpperCase().includes('DINERO'))
    );

    // Extrae el detalle JSON de la asignación de subsidio y resuelve el Tipo de Pedido con fallback
    const extractSubsidioData = (s) => {
        const assignmentSubsidio = s.resolutorAssignments?.find(a => a.tipoResolucion?.toUpperCase().includes('SUBSIDIO'));
        let subsidioMap = {};
        if (assignmentSubsidio && assignmentSubsidio.detalle) {
            try {
                subsidioMap = JSON.parse(assignmentSubsidio.detalle);
            } catch (e) {
                console.error("Error al parsear detalle de resolucion SUBSIDIO", e);
            }
        }
        const explicitTipo = subsidioMap['Tipo de pedido'] ? subsidioMap['Tipo de pedido'].toString().trim() : '';
        let tipoPedido = explicitTipo;
        if (!tipoPedido && assignmentSubsidio) {
            const tipoRes = (assignmentSubsidio.tipoResolucion || '').toUpperCase();
            if (tipoRes === 'SUBSIDIO EN ESPECIE') tipoPedido = 'Institucional en especie';
            else if ((s.person?.type || '').toLowerCase() === 'personal') tipoPedido = 'Personal';
            else if (tipoRes.includes('SUBSIDIO')) tipoPedido = 'Institucional en dinero';
        }
        return { assignmentSubsidio, subsidioMap, tipoPedido: tipoPedido || '-' };
    };

    // Previsualiza las solicitudes a importar desde la planilla externa antes de confirmar
    const handleRequestImportPreview = async (ids = null) => {
        setLoading(true);
        try {
            const payload = ids && ids.length > 0
                ? { spreadsheetId: SPREADSHEET_ID, ids }
                : { spreadsheetId: SPREADSHEET_ID };
            const res = await api.post('/api/planilla-salida/import/preview', payload);
            setImportPreviewModal({
                open: true,
                items: res.data?.items || [],
                ids: ids && ids.length > 0 ? ids : null,
                warning: res.data?.warning || null
            });
        } catch (err) {
            console.error("Error al previsualizar importación desde planilla:", err);
            toast.error(err.response?.data?.error || "Error al leer la planilla externa para previsualizar.");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmImport = async () => {
        const idsToImport = importPreviewModal.ids;
        setImportPreviewModal({ open: false, items: [], ids: null, warning: null });
        setLoading(true);
        try {
            const payload = idsToImport && idsToImport.length > 0
                ? { spreadsheetId: SPREADSHEET_ID, ids: idsToImport }
                : { spreadsheetId: SPREADSHEET_ID };
            const res = await api.post('/api/planilla-salida/import', payload);
            toast.success(res.data.message || "Importación desde planilla de salida finalizada con éxito.");
            if (idsToImport && idsToImport.length > 0) {
                setSelectedRows([]);
            }
            fetchData();
        } catch (err) {
            console.error("Error al importar desde planilla:", err);
            toast.error(err.response?.data?.error || "Error al importar desde la planilla externa.");
        } finally {
            setLoading(false);
        }
    };

    // Exporta a planilla externa SIN cambiar el estado de las solicitudes indicadas
    const handleSoloExportarIds = async (idsToExport, clearSelection = false) => {
        if (!idsToExport || idsToExport.length === 0) {
            toast.error("No hay solicitudes listadas para exportar.");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/api/planilla-salida/export', {
                spreadsheetId: SPREADSHEET_ID,
                ids: idsToExport
            });
            toast.success(res.data.message || `Se exportaron ${idsToExport.length} solicitudes a la planilla sin cambiar su estado.`);
            if (clearSelection) setSelectedRows([]);
            fetchData();
        } catch (err) {
            console.error("Error al exportar solicitudes sin cambio de estado:", err);
            toast.error(err.response?.data?.error || "Error al exportar a la planilla externa.");
        } finally {
            setLoading(false);
        }
    };

    // Pone en consideración y exporta a la planilla externa las solicitudes indicadas
    const handleConsideracionYExportarIds = async (idsToProcess, clearSelection = false) => {
        if (!idsToProcess || idsToProcess.length === 0) {
            toast.error("No hay solicitudes listadas para poner en consideración y exportar.");
            return;
        }
        if (!window.confirm(`¿Deseas poner en consideración y exportar a la planilla externa ${idsToProcess.length} solicitud(es)?`)) return;
        setLoading(true);
        try {
            await api.post('/api/solicitudes/consideracion/batch', { ids: idsToProcess });
            toast.success(`Se pusieron en consideración y exportaron ${idsToProcess.length} solicitud(es).`);
            if (clearSelection) setSelectedRows([]);
            fetchData();
        } catch (err) {
            console.error("Error al poner en consideración y exportar:", err);
            toast.error(err.response?.data?.error || "Error al poner en consideración y exportar.");
        } finally {
            setLoading(false);
        }
    };

    const handleExportPlanilla = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/planilla-salida/export', { spreadsheetId: SPREADSHEET_ID });
            toast.success(res.data.message || "Exportación a planilla de salida finalizada con éxito.");
            fetchData();
        } catch (err) {
            console.error("Error al exportar a planilla:", err);
            toast.error(err.response?.data?.error || "Error al exportar a la planilla externa.");
        } finally {
            setLoading(false);
        }
    };

    const handleImportPlanilla = () => handleRequestImportPreview(null);

    const handleBulkExport = () => handleSoloExportarIds(selectedRows, true);

    const handleBulkImport = () => {
        if (selectedRows.length === 0) return;
        handleRequestImportPreview(selectedRows);
    };

    const handleBulkConsideracion = () => handleConsideracionYExportarIds(selectedRows, true);

    const handleConsideracion = async (id) => {
        if (!window.confirm("¿Deseas poner esta solicitud en consideración para la planilla externa?")) return;
        try {
            await api.post(`/api/solicitudes/${id}/consideracion`);
            toast.success("Solicitud puesta en consideración correctamente.");
            fetchData();
        } catch (err) {
            console.error("Error al poner en consideración:", err);
            toast.error("Error al poner la solicitud en consideración.");
        }
    };

    const handleTomarSolicitud = async (id) => {
        if (!window.confirm(`¿Deseas tomar y asignarte la solicitud #${id}?`)) return;
        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${id}/tomar`);
            toast.success(`¡Solicitud #${id} asignada a tu bandeja con éxito!`);
            fetchData();
        } catch (err) {
            console.error("Error al tomar solicitud:", err);
            const errorMsg = err.response?.data?.message || err.response?.data?.error || "Error al tomar la solicitud.";
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

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
        console.log("[DEBUG EFFECT TRIGGERED] configId:", configId, "isResolutorSubsidio:", isResolutorSubsidio, "userEmail:", user ? user.email : "null", "userRole:", user ? user.role : "null", "tiposResolucion:", user && user.tiposResolucion ? JSON.stringify(user.tiposResolucion) : "undefined");
        fetchData();
        if (configId) {
            fetchConfig();
        } else if (isResolutorSubsidio) {
            fetchConfigForSubsidios();
        }
    }, [configId, user?.id, user?.role, isResolutorSubsidio, filters, searchTerm, currentPage, sortConfig, rowsPerPage]);

    const fetchConfig = async () => {
        if (!configId) return;
        try {
            const res = await api.get(`/api/config/${configId}`);
            setConfig(res.data);
        } catch (err) {
            console.error("Error fetching config", err);
        }
    }

    const fetchConfigForSubsidios = async () => {
        try {
            const res = await api.get('/api/config');
            // Filtrar la configuración que no sea de Agenda ni Declaración de Interés, para obtener la de Subsidios
            const subsidioConfig = res.data.find(c => c.sheetName && 
                c.sheetName.toUpperCase() !== 'AGENDA' && 
                c.sheetName.toUpperCase() !== 'DECLARACION' && 
                c.sheetName.toUpperCase() !== 'DECLARACIÓN'
            );
            if (subsidioConfig) {
                setConfig(subsidioConfig);
            }
        } catch (err) {
            console.error("Error al obtener la configuración de subsidios:", err);
        }
    }

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = {
                status: filters.status || null,
                search: searchTerm || null,
                origin: filters.origin || null,
                tipoPedido: filters.tipoPedido || null,
                responsableId: filters.responsableId || null,
                locationId: filters.locationId || null,
                page: currentPage - 1, // La API utiliza índice basado en 0
                size: rowsPerPage,
                sort: `${sortConfig.key},${sortConfig.direction}`
            };

            // Lógica de rango de fechas para el servidor
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
                tipoPedido: filters.tipoPedido || null,
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
            setTotalElements(response.data.totalElements ?? 0);
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

    /**
     * Aprueba rápidamente la resolución pendiente del usuario actual desde la grilla.
     * Si la resolución pendiente es AGENDA, abre directamente el modal de aprobación
     * porque requiere seleccionar asistencia obligatoria (y opcionalmente crear evento en Calendar).
     */
    const handleAprobarRapido = async (solicitud, pendingAssignment) => {
        const tipoPendiente = pendingAssignment?.tipoResolucion || '';
        if (tipoPendiente.toUpperCase() === 'AGENDA') {
            handleOpenABM(solicitud, true);
            return;
        }

        const labelTipo = tipoPendiente ? ` (${tipoPendiente})` : '';
        if (!window.confirm(`¿Confirmas la aprobación de tu resolución${labelTipo} en la solicitud #${solicitud.id}?`)) return;

        try {
            await api.post(`/api/solicitudes/${solicitud.id}/aprobar`, {
                assignmentId: pendingAssignment?.id || undefined,
                observaciones: ""
            });
            const otrasPendientes = (solicitud.resolutorAssignments || [])
                .filter(a => a.id !== pendingAssignment?.id && !a.approved)
                .map(a => a.tipoResolucion);

            if (otrasPendientes.length > 0) {
                toast.success(
                    `Tu resolución${labelTipo} quedó aprobada. El pedido #${solicitud.id} sigue En Resolución pendiente de: ${otrasPendientes.join(', ')}.`,
                    { duration: 6000 }
                );
            } else {
                toast.success(`Resolución aprobada. La solicitud #${solicitud.id} pasó a Resueltas.`);
            }
            fetchData();
        } catch (err) {
            console.error("Error al aprobar asignación:", err);
            toast.error(err.response?.data?.message || err.response?.data?.error || "Error al aprobar la solicitud");
        }
    };

    /**
     * Permite a un resolutor tomar una asignación disponible en el pool compartido de su tipo de resolución.
     */
    const handleTomarResolucion = async (solicitudId, assignment) => {
        if (!assignment?.id) return;
        if (!window.confirm(`¿Deseas tomar y asignarte la resolución (${assignment.tipoResolucion}) de la solicitud #${solicitudId}?`)) return;
        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${solicitudId}/asignaciones/${assignment.id}/tomar`);
            toast.success(`¡Resolución (${assignment.tipoResolucion}) de la solicitud #${solicitudId} asignada a tu bandeja!`);
            fetchData();
        } catch (err) {
            console.error("Error al tomar resolución:", err);
            toast.error(err.response?.data?.message || err.response?.data?.error || "Error al tomar la resolución.");
        } finally {
            setLoading(false);
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

    const exportDropdownRef = useRef(null);

    useEffect(() => {
        if (!isExportDropdownOpen) return;
        const handleClickOutside = (event) => {
            if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target)) {
                setIsExportDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isExportDropdownOpen]);

    /**
     * Devuelve el subconjunto de solicitudes a exportar según la regla unificada:
     * si hay filas chequeadas en la tabla exporta solo las seleccionadas;
     * en caso contrario, exporta todas las solicitudes actualmente listadas.
     */
    const getSolicitudesToExport = () => {
        if (selectedRows.length > 0) {
            return processedData.rows.filter(s => selectedRows.includes(s.id));
        }
        return processedData.rows;
    };

    /**
     * Construye los objetos planos normalizados para exportación en Excel y CSV.
     */
    const buildExportRows = (dataToExport) => {
        return dataToExport.map(s => {
            const localidad = s.location?.type === 'NEIGHBORHOOD'
                ? (s.location?.parent?.name || '')
                : (s.location?.name || '');
            const barrio = s.location?.type === 'NEIGHBORHOOD' ? (s.location?.name || '') : '';
            const statusNorm = s.status?.trim().toLowerCase();
            const estadoLegible = STATUS_MAP[statusNorm] || s.status || '';
            const resolucionesTexto = (s.resolutorAssignments || []).map(a => {
                let det = '';
                try {
                    const parsed = typeof a.detalle === 'string' ? JSON.parse(a.detalle) : a.detalle;
                    if (parsed && typeof parsed === 'object') {
                        det = Object.entries(parsed)
                            .filter(([k, v]) => !k.endsWith('_id') && !k.endsWith('_filename') && v !== '' && v != null)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' | ');
                    }
                } catch {
                    det = a.detalle || '';
                }
                const est = a.approved ? 'Aprobada' : 'Pendiente';
                return `[${a.tipoResolucion || 'Resolución'} - ${est}]${det ? ' ' + det : ''}`;
            }).join(' // ');

            return {
                'N° Orden': s.id,
                'Fecha Ingreso': s.entryDate || '',
                'Origen': s.origin || '',
                'Beneficiario': s.person?.name || '',
                'DNI': s.person?.dni || '',
                'Teléfono': s.person?.phone || '',
                'Localidad': localidad,
                'Barrio': barrio,
                'Dirección': s.direccion || '',
                'Fecha Evento': s.fechaEvento || '',
                'Descripción': s.description || '',
                'Estado': estadoLegible,
                'Responsable': s.responsable?.name || (s.zone ? `Pool: ${s.zone}` : 'Sin Asignar'),
                'Monto': s.amount || 0,
                'Resoluciones': resolucionesTexto
            };
        });
    };

    const handleExportCSV = () => {
        try {
            const dataToExport = getSolicitudesToExport();
            if (!dataToExport.length) {
                toast.error("No hay datos para exportar");
                return;
            }

            const rowsObj = buildExportRows(dataToExport);
            const headers = Object.keys(rowsObj[0]);
            const escapeCsv = (val) => {
                const str = String(val ?? '').replace(/"/g, '""');
                return `"${str}"`;
            };
            const csvRows = [
                headers.map(escapeCsv).join(","),
                ...rowsObj.map(r => headers.map(h => escapeCsv(r[h])).join(","))
            ];

            // Agregar BOM UTF-8 para compatibilidad con acentos al abrir en Excel
            const csvString = "\uFEFF" + csvRows.join("\n");
            const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            const today = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.setAttribute("download", `solicitudes_sgp_${today}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            const scopeMsg = selectedRows.length > 0 ? `${dataToExport.length} seleccionadas` : `${dataToExport.length} listadas`;
            toast.success(`CSV exportado correctamente (${scopeMsg})`);
        } catch (err) {
            console.error("Error al exportar CSV", err);
            toast.error("Error al exportar el archivo CSV");
        }
    };

    const handleExportExcel = () => {
        try {
            const dataToExport = getSolicitudesToExport();
            if (!dataToExport.length) {
                toast.error("No hay datos para exportar");
                return;
            }

            const rowsObj = buildExportRows(dataToExport);
            const worksheet = XLSX.utils.json_to_sheet(rowsObj);
            worksheet['!cols'] = [
                { wch: 10 }, // N° Orden
                { wch: 14 }, // Fecha Ingreso
                { wch: 16 }, // Origen
                { wch: 28 }, // Beneficiario
                { wch: 13 }, // DNI
                { wch: 16 }, // Teléfono
                { wch: 20 }, // Localidad
                { wch: 20 }, // Barrio
                { wch: 26 }, // Dirección
                { wch: 14 }, // Fecha Evento
                { wch: 42 }, // Descripción
                { wch: 16 }, // Estado
                { wch: 22 }, // Responsable
                { wch: 14 }, // Monto
                { wch: 48 }  // Resoluciones
            ];

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');
            const today = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(workbook, `solicitudes_sgp_${today}.xlsx`);
            const scopeMsg = selectedRows.length > 0 ? `${dataToExport.length} seleccionadas` : `${dataToExport.length} listadas`;
            toast.success(`Excel (.xlsx) exportado correctamente (${scopeMsg})`);
        } catch (err) {
            console.error("Error al exportar Excel", err);
            toast.error("Error al exportar el archivo Excel");
        }
    };

    // Tubería de procesamiento de datos
    const processedData = useMemo(() => {
        let result = [...solicitudes];

        // Filtro rápido para el rol Resolutor: mostrar solo pedidos donde SU resolución (tomada o en pool de su tipo) aún está pendiente
        if (soloMisPendientes && user?.role === 'RESOLUTOR' && user?.email) {
            const myEmail = user.email.toLowerCase();
            const myTipos = activeTipoUpper
                ? [activeTipoUpper]
                : (user?.tiposResolucion || []).map(t => (t?.tipo || '').trim().toUpperCase()).filter(Boolean);
            result = result.filter(s =>
                (s.resolutorAssignments || []).some(a =>
                    !a.approved && (
                        a.resolutor?.email?.toLowerCase() === myEmail ||
                        (!a.resolutor && myTipos.includes((a.tipoResolucion || '').trim().toUpperCase()))
                    )
                )
            );
        }

        // 1. Ya no se filtra por búsqueda local si se hace por servidor, pero lo dejamos por si acaso
        // 2. La ordenación ya no se hace localmente
        
        // 4. Datos para el gráfico con porcentajes
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

        // 5. Totales (siempre desde la lista base para las tarjetas)
        const stats = {
            pendiente: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'pendiente').length,
            enProceso: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'en proceso').length,
            enResolucion: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'en resolucion').length,
            completadas: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'completadas').length,
            rechazada: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'rechazada').length,
            consideracion: solicitudes.filter(s => s.status?.trim().toLowerCase() === 'consideracion').length,
            totalSubsidios: solicitudes.reduce((acc, s) => s.status?.trim().toLowerCase() === 'completadas' ? acc + (s.amount || 0) : acc, 0)
        };

            // Aplicar ordenamiento local si se seleccionó una columna JSON de Subsidio
            if (localSortConfig.key && isResolutorSubsidio) {
                result.sort((a, b) => {
                    const dataA = extractSubsidioData(a);
                    const dataB = extractSubsidioData(b);
                    const getSortField = (s, data) => {
                        if (localSortConfig.key === 'tipoPedido') return data.tipoPedido;
                        return data.subsidioMap[localSortConfig.key] || '';
                    };
                    const valA = String(getSortField(a, dataA)).toLowerCase();
                    const valB = String(getSortField(b, dataB)).toLowerCase();
                    const cmp = valA.localeCompare(valB, 'es');
                    return localSortConfig.direction === 'asc' ? cmp : -cmp;
                });
            }

            return { rows: result, chartData, uniqueResponsables: [], uniqueOrigins: [], uniqueLocations: [], stats };
    }, [solicitudes, visColumn, localSortConfig, isResolutorSubsidio, soloMisPendientes, user?.role, user?.email]);

    // La paginación ahora es gestionada por el servidor
    const currentRows = processedData.rows;

    const handleSort = (key) => {
        setLocalSortConfig({ key: null, direction: 'asc' });
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
        // Reiniciar página a 1 cuando se ordena
        setCurrentPage(1);
    };

    const handleLocalSort = (key) => {
        setLocalSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const handleOpenABM = async (solicitud = null, openApprove = false) => {
        setOpenApproveOnMount(Boolean(openApprove));
        if (!solicitud || !solicitud.id) {
            setSelectedSolicitud(solicitud);
            setIsABMOpen(true);
            return;
        }

        // Siempre cargar la versión fresca y aislada de la solicitud desde el backend
        // para garantizar que todas las relaciones (location, parent, person, adjuntos)
        // se deserialicen sin colisiones de identificadores compartidos de Jackson (@JsonIdentityInfo).
        try {
            const res = await api.get(`/api/solicitudes/${solicitud.id}`);
            setSelectedSolicitud(res.data || solicitud);
        } catch (err) {
            console.error("Error al obtener detalle fresco de la solicitud, usando datos de fila:", err);
            setSelectedSolicitud(solicitud);
        }
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
                {/* Navegación superior */}
                <div className="flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Inicio
                    </Link>
                    <div className="flex flex-wrap gap-2.5 text-xs md:text-sm">
                            {isResolutorSubsidioDinero && (
                                <button
                                    data-testid="btn-importar-planilla"
                                    onClick={handleImportPlanilla}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 border border-indigo-500 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/20 active:scale-95"
                                    title="Lee la planilla externa, muestra las solicitudes coincidentes del sistema y permite confirmar su importación (aprobar/desaprobar)"
                                >
                                    <Database className="h-4 w-4" /> Importar Planilla
                                </button>
                            )}
                            {(config && (isResolutorSubsidioDinero || user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN')) && (
                                <button
                                    onClick={() => setIsAsociarModalOpen(true)}
                                    className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-gray-900/20 active:scale-95"
                                    title="Configurar o cambiar la planilla externa de Google Sheets asociada"
                                >
                                    <Settings className="h-4 w-4" /> Asociar Planilla
                                </button>
                            )}
                            {isResolutorSubsidioDinero && (
                                <button
                                    data-testid="btn-consideracion-exportar-todos"
                                    onClick={() => {
                                        const ids = selectedRows.length > 0 ? selectedRows : currentRows.map(s => s.id);
                                        handleConsideracionYExportarIds(ids, selectedRows.length > 0);
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-500 border border-green-500 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg shadow-green-900/20 active:scale-95"
                                    title={selectedRows.length > 0
                                        ? `Pone en estado 'Consideración' y exporta a la planilla externa las ${selectedRows.length} solicitudes seleccionadas`
                                        : "Pone en estado 'Consideración' y exporta a la planilla externa todas las solicitudes listadas en la tabla inferior"}
                                >
                                    <Download className="h-4 w-4" /> Consideración
                                </button>
                            )}
                            <div className="relative" ref={exportDropdownRef}>
                                <button
                                    type="button"
                                    data-testid="btn-exportar-menu"
                                    onClick={() => setIsExportDropdownOpen(prev => !prev)}
                                    className={`px-4 py-2 rounded-xl text-white font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95 ${
                                        isResolutorSubsidioDinero
                                            ? 'bg-teal-700 hover:bg-teal-600 border border-teal-500 shadow-teal-900/20'
                                            : 'bg-green-600 hover:bg-green-500 border border-green-500 shadow-green-900/20'
                                    }`}
                                    title={selectedRows.length > 0
                                        ? `Exportar las ${selectedRows.length} solicitudes seleccionadas`
                                        : `Exportar las ${currentRows.length} solicitudes listadas en la tabla`}
                                >
                                    <Download className="h-4 w-4" />
                                    <span>Exportar</span>
                                    {selectedRows.length > 0 && (
                                        <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-white/20 font-black">
                                            {selectedRows.length}
                                        </span>
                                    )}
                                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                                {isExportDropdownOpen && (
                                    <div
                                        data-testid="exportar-dropdown-menu"
                                        className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden py-1"
                                    >
                                        <div className="px-4 py-2 text-[10px] font-black uppercase tracking-wider text-gray-400 border-b border-gray-700/80 bg-gray-900/40">
                                            {selectedRows.length > 0
                                                ? `Alcance: ${selectedRows.length} seleccionada(s)`
                                                : `Alcance: ${currentRows.length} listada(s) en tabla`}
                                        </div>
                                        {isResolutorSubsidioDinero && (
                                            <button
                                                type="button"
                                                data-testid="export-option-sheets"
                                                onClick={() => {
                                                    setIsExportDropdownOpen(false);
                                                    const ids = selectedRows.length > 0 ? selectedRows : currentRows.map(s => s.id);
                                                    handleSoloExportarIds(ids, selectedRows.length > 0);
                                                }}
                                                title="Exportar a la planilla externa de Google Sheets configurada SIN cambiar el estado"
                                                className="w-full text-left px-4 py-2.5 text-xs text-gray-100 hover:bg-gray-700 font-bold transition-all flex items-center gap-2.5 border-b border-gray-700/80"
                                            >
                                                <Database className="h-4 w-4 text-amber-400 shrink-0" />
                                                <div>
                                                    <div>Planilla Externa (Google Sheets)</div>
                                                    <div className="text-[10px] font-normal text-gray-400">Sin cambiar el estado actual</div>
                                                </div>
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            data-testid="export-option-xlsx"
                                            onClick={() => {
                                                handleExportExcel();
                                                setIsExportDropdownOpen(false);
                                            }}
                                            title="Descargar archivo de hoja de cálculo Excel (.xlsx)"
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-100 hover:bg-gray-700 font-bold transition-all flex items-center gap-2.5"
                                        >
                                            <FileSpreadsheet className="h-4 w-4 text-emerald-400 shrink-0" />
                                            <div>
                                                <div>Descargar Excel (.xlsx)</div>
                                                <div className="text-[10px] font-normal text-gray-400">Hoja de cálculo con columnas ajustadas</div>
                                            </div>
                                        </button>
                                        <button
                                            type="button"
                                            data-testid="export-option-csv"
                                            onClick={() => {
                                                handleExportCSV();
                                                setIsExportDropdownOpen(false);
                                            }}
                                            title="Descargar archivo de texto separado por comas (.csv)"
                                            className="w-full text-left px-4 py-2.5 text-xs text-gray-100 hover:bg-gray-700 font-bold transition-all flex items-center gap-2.5 border-t border-gray-700/60"
                                        >
                                            <FileText className="h-4 w-4 text-sky-400 shrink-0" />
                                            <div>
                                                <div>Descargar CSV (.csv)</div>
                                                <div className="text-[10px] font-normal text-gray-400">Compatible con cualquier planilla</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                            {user?.role === 'RESOLUTOR' && (
                                <button
                                    type="button"
                                    onClick={() => setSoloMisPendientes(prev => !prev)}
                                    className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                                        soloMisPendientes
                                            ? 'bg-amber-600/90 border-amber-400 text-white shadow-lg shadow-amber-900/30'
                                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                    }`}
                                    title="Filtra el listado para mostrar únicamente solicitudes donde tu resolución propia (tomada o en pool) todavía está pendiente de aprobar"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    Solo mis pendientes
                                </button>
                            )}
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                title="Mostrar u ocultar el panel de filtros avanzados"
                                className={`p-2 rounded-xl border transition-all ${showFilters ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                            >
                                <Filter className="h-5 w-5" />
                            </button>
                        {(user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN' || user?.role === 'OPERADOR' || user?.role === 'RESPONSABLE') && (
                            <button
                                onClick={() => handleOpenABM()}
                                title="Crear una nueva solicitud en el sistema"
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                            >
                                <Plus className="h-5 w-5" />
                                Nueva Solicitud
                            </button>
                        )}
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

                {/* Panel de filtros */}
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
                                <MultiSelectDropdown
                                    testId="filter-status"
                                    placeholder="Todos los Estados"
                                    value={filters.status || ''}
                                    onChange={(vals) => { setFilters(prev => ({ ...prev, status: vals.join(',') })); setCurrentPage(1); }}
                                    options={[
                                        { value: 'pendiente', label: 'Pendiente' },
                                        { value: 'en proceso', label: 'Asignadas' },
                                        { value: 'en resolucion', label: 'En Resolución' },
                                        { value: 'completadas', label: 'Resueltas' },
                                        { value: 'rechazada', label: 'Rechazado' },
                                        { value: 'consideracion', label: 'Consideración' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Localidad</label>
                                <MultiSelectDropdown
                                    testId="filter-location"
                                    placeholder="Todas las Localidades"
                                    searchable={true}
                                    value={filters.locationId || ''}
                                    onChange={(vals) => { setFilters(prev => ({ ...prev, locationId: vals.join(',') })); setCurrentPage(1); }}
                                    options={locationsList.map(l => ({ value: String(l.id), label: l.name }))}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Origen</label>
                                <MultiSelectDropdown
                                    testId="filter-origin"
                                    placeholder="Todos"
                                    value={filters.origin || ''}
                                    onChange={(vals) => { setFilters(prev => ({ ...prev, origin: vals.join(',') })); setCurrentPage(1); }}
                                    options={[
                                        { value: 'MANUAL', label: 'MANUAL' },
                                        { value: 'SINCRO', label: 'SINCRO' },
                                        { value: 'WEB', label: 'WEB' },
                                        { value: 'Directo de paco', label: 'Directo de paco' },
                                        { value: 'Territorio', label: 'Territorio' },
                                        { value: 'Facebook', label: 'Facebook' },
                                        { value: 'Instagram', label: 'Instagram' },
                                        { value: 'Whatsapp', label: 'Whatsapp' }
                                    ]}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Responsable</label>
                                <MultiSelectDropdown
                                    testId="filter-responsable"
                                    placeholder="Todos"
                                    searchable={true}
                                    value={filters.responsableId || ''}
                                    onChange={(vals) => { setFilters(prev => ({ ...prev, responsableId: vals.join(',') })); setCurrentPage(1); }}
                                    options={[
                                        { value: '0', label: '(Sin Asignar)' },
                                        ...responsablesList.map(r => ({ value: String(r.id), label: r.name }))
                                    ]}
                                />
                            </div>
                            {isResolutorSubsidio && (
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Tipo de Pedido</label>
                                    <MultiSelectDropdown
                                        testId="filter-tipo-pedido"
                                        placeholder="Todos los Tipos"
                                        value={filters.tipoPedido || ''}
                                        onChange={(vals) => { setFilters(prev => ({ ...prev, tipoPedido: vals.join(',') })); setCurrentPage(1); }}
                                        options={[
                                            { value: 'Personal', label: 'Personal' },
                                            { value: 'Institucional en dinero', label: 'Institucional en dinero' },
                                            { value: 'Institucional en especie', label: 'Institucional en especie' }
                                        ]}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Información de encabezado y estadísticas */}
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-4xl font-black tracking-tight text-white mb-2">
                                {configId ? (config?.sheetName || 'Cargando...') : 'Mis Solicitudes'}
                            </h1>
                            <div className="text-gray-500 flex flex-wrap items-center gap-3 font-medium text-sm">
                                <span className="flex items-center gap-2">
                                    <Database className="h-4 w-4" />
                                    Mostrando {processedData.rows.length} de {totalElements} registros
                                </span>
                                <label className="flex items-center gap-1.5 text-xs text-gray-400">
                                    <span>Filas por página:</span>
                                    <select
                                        data-testid="rows-per-page-select"
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            const nextSize = Number(e.target.value);
                                            setRowsPerPage(nextSize);
                                            localStorage.setItem('sgp-rows-per-page', String(nextSize));
                                            setCurrentPage(1);
                                        }}
                                        title="Seleccionar cantidad de filas a mostrar por página"
                                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs font-bold text-white outline-none focus:border-indigo-500 cursor-pointer"
                                    >
                                        <option value={10}>10</option>
                                        <option value={50}>50</option>
                                        <option value={100}>100</option>
                                        <option value={500}>500</option>
                                    </select>
                                </label>
                            </div>
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

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
                        <button onClick={() => setFilters(prev => ({ ...prev, status: prev.status === 'consideracion' ? '' : 'consideracion' }))} className={`text-left p-4 rounded-2xl flex flex-col justify-center shadow-lg transition-all ${filters.status === 'consideracion' ? 'bg-orange-900/40 border-2 border-orange-500 scale-105' : 'bg-gray-800/50 border border-gray-700 hover:bg-gray-700/50'}`}>
                            <div className="text-[10px] uppercase font-black text-gray-400 mb-1 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]"></div> Consideración
                            </div>
                            <div className="text-3xl font-black text-white">
                                {stats.consideracion || 0}
                            </div>
                        </button>
                    </div>
                </div>

                {/* Sección de gráficos */}
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

                {/* Sección principal de la tabla */}
                <div className="bg-gray-800/50 rounded-[2rem] border border-gray-700/50 overflow-hidden shadow-2xl backdrop-blur-xl relative">
                    {/* Barra de acciones flotante: para Resolutores solo aplica al Resolutor de Subsidio en Dinero */}
                    {selectedRows.length > 0 && user?.role !== 'AUDITOR' && (user?.role !== 'RESOLUTOR' || isResolutorSubsidioDinero) && (
                        <div
                            data-testid="bulk-actions-bar"
                            className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600 border border-indigo-500 p-2 px-4 rounded-full shadow-2xl z-[50] flex items-center gap-4 animate-in slide-in-from-top-4 fade-in duration-300"
                        >
                            <span className="text-white font-bold text-xs">{selectedRows.length} seleccionadas</span>
                            <div className="h-4 w-px bg-indigo-400"></div>
                            {user?.role !== 'RESOLUTOR' && (
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
                            )}
                            {(user?.role === 'ADMINISTRADOR' || isResolutorSubsidioDinero) && (
                                <button
                                    data-testid="btn-bulk-consideracion-exportar"
                                    onClick={handleBulkConsideracion}
                                    title="Pone en estado 'Consideración' y exporta a la planilla externa únicamente las solicitudes seleccionadas"
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm"
                                >
                                    Consideración
                                </button>
                            )}
                            {(user?.role === 'ADMINISTRADOR' || isResolutorSubsidioDinero) && (
                                <button
                                    data-testid="btn-bulk-solo-exportar"
                                    onClick={handleBulkExport}
                                    title="Exporta a la planilla externa únicamente las solicitudes seleccionadas SIN cambiar su estado"
                                    className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm"
                                >
                                    Exportar
                                </button>
                            )}
                            {(user?.role === 'ADMINISTRADOR' || isResolutorSubsidioDinero) && (
                                <button
                                    data-testid="btn-bulk-importar"
                                    onClick={handleBulkImport}
                                    title="Previsualiza e importa desde la planilla externa únicamente las solicitudes seleccionadas que coincidan en el sistema"
                                    className="bg-indigo-800 hover:bg-indigo-900 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm"
                                >
                                    Importar
                                </button>
                            )}
                            {user?.role === 'ADMINISTRADOR' && (
                                <button
                                    onClick={handleBulkDelete}
                                    title="Eliminar permanentemente las solicitudes seleccionadas"
                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold transition-colors shadow-sm"
                                >
                                    Eliminar
                                </button>
                            )}
                        </div>
                    )}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                {isResolutorSubsidio ? (
                                    <tr className="bg-gray-900/80 text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
                                        {user?.role !== 'AUDITOR' && (
                                            <th className="p-3 w-10 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                                    onChange={handleSelectAll}
                                                    checked={currentRows.length > 0 && selectedRows.length === currentRows.length}
                                                />
                                            </th>
                                        )}
                                        <th onClick={() => handleSort('id')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            ID {sortConfig.key === 'id' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('entryDate')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Fecha Ingreso {sortConfig.key === 'entryDate' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('origin')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Origen {sortConfig.key === 'origin' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('person')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Solicitante Nombre {sortConfig.key === 'person' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th className="p-3">Solicitante Teléfono</th>
                                        <th className="p-3">Localidad</th>
                                        <th className="p-3">Barrio</th>
                                        <th className="p-3">Descripción</th>
                                        <th onClick={() => handleSort('responsable')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Responsable {sortConfig.key === 'responsable' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('amount')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Monto Solicitado {sortConfig.key === 'amount' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('grantDate')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Fecha Otorgamiento {sortConfig.key === 'grantDate' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleSort('status')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Estado {sortConfig.key === 'status' && !localSortConfig.key && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleLocalSort('tipoPedido')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Tipo Pedido {localSortConfig.key === 'tipoPedido' && (localSortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleLocalSort('Nombre y apellido')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Nombre y Apellido {localSortConfig.key === 'Nombre y apellido' && (localSortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleLocalSort('DNI')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            DNI {localSortConfig.key === 'DNI' && (localSortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th onClick={() => handleLocalSort('Dirección de DNI')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Dirección de DNI {localSortConfig.key === 'Dirección de DNI' && (localSortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th className="p-3">DNI Frente</th>
                                        <th className="p-3">DNI Dorso</th>
                                        <th className="p-3">Constancia CBU</th>
                                        <th onClick={() => handleLocalSort('Nombre de institución')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            Nombre Inst. {localSortConfig.key === 'Nombre de institución' && (localSortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
                                        <th className="p-3">Dirección Inst.</th>
                                        <th className="p-3">Localidad Inst.</th>
                                        <th className="p-3">Resp 1: Nombre</th>
                                        <th className="p-3">Resp 1: DNI</th>
                                        <th className="p-3">Resp 1: Cargo</th>
                                        <th className="p-3">Resp 2: Nombre</th>
                                        <th className="p-3">Resp 2: DNI</th>
                                        <th className="p-3">Resp 2: Cargo</th>
                                        <th className="p-3">Nota Pedido</th>
                                        <th className="p-3">¿Por Donde?</th>
                                        <th className="p-3 text-right sticky right-0 bg-gray-900/90 shadow-xl">Acciones</th>
                                    </tr>
                                ) : (
                                    <tr className="bg-gray-900/80 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                        {user?.role !== 'AUDITOR' && (
                                            <th className="p-3 w-10 text-center">
                                                <input 
                                                    type="checkbox" 
                                                    className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                                    onChange={handleSelectAll}
                                                    checked={currentRows.length > 0 && selectedRows.length === currentRows.length}
                                                />
                                            </th>
                                        )}
                                        <th onClick={() => handleSort('id')} className="p-3 cursor-pointer hover:text-white transition-colors">
                                            N° Orden {sortConfig.key === 'id' && (sortConfig.direction === 'asc' ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />)}
                                        </th>
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
                                )}
                            </thead>
                            <tbody className="divide-y divide-gray-700/50">
                                {currentRows.map((s) => {
                                    const entryDate = parseLocalDate(s.entryDate);

                                    // Lógica para la ubicación
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

                                    // Renderizar detalles de resolución con estado individual claro (Aprobada / Pendiente / Pool)
                                    let resolucionContent = '-';
                                    const assignments = s.resolutorAssignments || [];
                                    const approvedCount = assignments.filter(a => a.approved).length;
                                    const pendingTypes = assignments
                                        .filter(a => !a.approved)
                                        .map(a => a.tipoResolucion)
                                        .filter(Boolean);
                                    const userTiposResolucion = (user?.tiposResolucion || [])
                                        .map(t => (t?.tipo || '').trim().toUpperCase())
                                        .filter(Boolean);
                                    const myPendingAssignment = assignments.find(
                                        a => a.resolutor?.email?.toLowerCase() === user?.email?.toLowerCase() && !a.approved
                                    );
                                    const myPoolAssignment = assignments.find(
                                        a => !a.resolutor && !a.approved && userTiposResolucion.includes((a.tipoResolucion || '').trim().toUpperCase())
                                    );
                                    const hasPendingApproval = Boolean(myPendingAssignment);

                                    if (assignments.length > 0) {
                                        resolucionContent = assignments.map((assignment, index) => {
                                            let detailText = '';
                                            try {
                                                const parsed = JSON.parse(assignment.detalle);
                                                detailText = Object.entries(parsed).map(([k, v]) => `${k}: ${v}`).join(' | ');
                                            } catch (e) {
                                                detailText = assignment.detalle || '';
                                            }

                                            return (
                                                <div key={assignment.id || index} className="mb-2 pb-2 border-b border-gray-700/50 last:border-0 last:mb-0 last:pb-0">
                                                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                                        {assignment.approved ? (
                                                            <span
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 text-[9px] font-bold uppercase"
                                                                title="Esta resolución ya fue aprobada"
                                                            >
                                                                <Check className="h-2.5 w-2.5" /> Aprobada
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-900/50 text-amber-300 border border-amber-700/60 text-[9px] font-bold uppercase"
                                                                title="Resolución pendiente de aprobación"
                                                            >
                                                                Pendiente
                                                            </span>
                                                        )}
                                                        {assignment.resolutor ? (
                                                            <span className="font-bold text-indigo-300">
                                                                {assignment.resolutor?.name || assignment.resolutor?.email}:
                                                            </span>
                                                        ) : (
                                                            <span
                                                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-700/60 text-[9px] font-bold uppercase"
                                                                title="Disponible en pool para todos los resolutores de este tipo"
                                                            >
                                                                Pool
                                                            </span>
                                                        )}
                                                        <span className="font-semibold text-gray-200">{assignment.tipoResolucion}</span>
                                                    </div>
                                                    {detailText && (
                                                        <div
                                                            data-testid="resolucion-detail-clamped"
                                                            title={detailText}
                                                            className="text-gray-300 text-xs leading-snug line-clamp-2 max-w-[340px] cursor-help"
                                                        >
                                                            {detailText}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    }

                                    // Subtítulo de avance cuando existen múltiples resoluciones y el pedido sigue En Resolución
                                    const multiResolutionProgress = assignments.length > 1 && s.status?.trim().toLowerCase() === 'en resolucion' ? (
                                        <div className="mt-1 text-[10px] leading-tight text-amber-300/90 font-semibold">
                                            {approvedCount}/{assignments.length} aprobadas
                                            {pendingTypes.length > 0 && (
                                                <span className="block text-gray-400 font-normal">
                                                    Falta: {pendingTypes.join(', ')}
                                                </span>
                                            )}
                                        </div>
                                    ) : null;

                                    if (isResolutorSubsidio) {
                                        const { subsidioMap, tipoPedido } = extractSubsidioData(s);

                                        const renderAttachmentLink = (val) => {
                                            if (!val) return <span className="text-gray-600">-</span>;
                                            let valStr = val.toString().trim();
                                            if (valStr === '' || valStr === '-') return <span className="text-gray-600">-</span>;
                                            
                                            // Extraer el ID del adjunto con regex si es una URL completa
                                            const match = valStr.match(/\/api\/solicitudes\/adjuntos\/(\d+)\/download/);
                                            if (match) {
                                                valStr = match[1];
                                            }

                                            return (
                                                <a 
                                                    href={`/descargar-adjunto/${valStr}`} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                                                >
                                                    <Download className="h-3 w-3" /> Descargar
                                                </a>
                                            );
                                        };

                                        const getVal = (key) => {
                                            const val = subsidioMap[key];
                                            return val !== undefined && val !== null ? val.toString().trim() : '-';
                                        };

                                        return (
                                            <tr key={s.id} className={`group transition-all text-xs border-b border-gray-800 whitespace-nowrap ${selectedRows.includes(s.id) ? 'bg-indigo-900/20' : 'hover:bg-gray-700/20'}`}>
                                                {user?.role !== 'AUDITOR' && (
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                                            checked={selectedRows.includes(s.id)}
                                                            onChange={() => handleSelectRow(s.id)}
                                                        />
                                                    </td>
                                                )}
                                                <td className="p-3 font-mono text-gray-500">#{s.id}</td>
                                                <td className="p-3 text-gray-300">
                                                    {entryDate ? entryDate.toLocaleDateString() : '-'}
                                                </td>
                                                <td className="p-3 text-gray-400">{s.origin || '-'}</td>
                                                <td className="p-3 font-bold text-white">
                                                    {s.person?.name || '-'}
                                                </td>
                                                <td className="p-3 text-gray-500">
                                                    {s.person?.phone || '-'}
                                                </td>
                                                <td className="p-3 text-gray-400">{localidad}</td>
                                                <td className="p-3 text-gray-400">{barrio}</td>
                                                <td className="p-3 text-gray-300 max-w-[200px] truncate" title={s.description}>
                                                    {s.description || '-'}
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    {s.responsable ? (
                                                        <span className="text-indigo-300 font-bold uppercase">{s.responsable.name}</span>
                                                    ) : s.zone ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/80">
                                                            Pool: {s.zone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 italic text-[11px]">Sin Asignar</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-emerald-400 font-bold">
                                                    ${s.amount || '0'}
                                                </td>
                                                <td className="p-3 text-gray-300">
                                                    {s.grantDate ? parseLocalDate(s.grantDate)?.toLocaleDateString() : '-'}
                                                </td>
                                                <td className="p-3 text-gray-300">
                                                    <StatusBadge status={s.status} />
                                                    {multiResolutionProgress}
                                                </td>
                                                <td className="p-3 text-gray-300 font-medium">{tipoPedido}</td>
                                                <td className="p-3 text-gray-300">{getVal("Nombre y apellido") !== '-' ? getVal("Nombre y apellido") : (tipoPedido === 'Personal' ? (s.person?.name || '-') : '-')}</td>
                                                <td className="p-3 text-gray-300">{getVal("DNI") !== '-' ? getVal("DNI") : (tipoPedido === 'Personal' ? (s.person?.dni || '-') : '-')}</td>
                                                <td className="p-3 text-gray-300">{getVal("Dirección de DNI")}</td>
                                                <td className="p-3">{renderAttachmentLink(subsidioMap["DNI frente"])}</td>
                                                <td className="p-3">{renderAttachmentLink(subsidioMap["DNI dorso"])}</td>
                                                <td className="p-3">{renderAttachmentLink(subsidioMap["Constancia de CBU"])}</td>
                                                <td className="p-3 text-gray-300">{getVal("Nombre de institución")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Dirección de institución")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Localidad")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 1: Nombre")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 1: DNI")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 1: Cargo")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 2: Nombre")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 2: DNI")}</td>
                                                <td className="p-3 text-gray-300">{getVal("Responsable 2: Cargo")}</td>
                                                <td className="p-3">{renderAttachmentLink(subsidioMap["Nota de pedido"])}</td>
                                                <td className="p-3 text-indigo-300 font-mono font-bold">{s.porDonde || '-'}</td>
                                                <td className="p-3 sticky right-0 bg-gray-900/90 shadow-xl group-hover:bg-gray-800 transition-colors">
                                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                                                        {/* Botón Tomar Resolución (Pool Multi-Resolutor) */}
                                                        {user?.role === 'RESOLUTOR' && myPoolAssignment && (
                                                            <button
                                                                onClick={() => handleTomarResolucion(s.id, myPoolAssignment)}
                                                                title={`Tomar Resolución (${myPoolAssignment.tipoResolucion})`}
                                                                className="p-1.5 hover:bg-cyan-600 bg-cyan-900/40 rounded text-cyan-300 hover:text-white transition-colors"
                                                            >
                                                                <UserCheck className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {/* Botón Tomar Solicitud */}
                                                        {!s.responsable && (user?.role === 'RESPONSABLE' || user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN') && (!s.zone || !user?.zone || s.zone.toLowerCase() === user?.zone.toLowerCase() || user?.role?.includes('ADMIN')) && (
                                                            <button onClick={() => handleTomarSolicitud(s.id)} title="Tomar Solicitud (Asignármela)" className="p-1.5 hover:bg-emerald-600 bg-emerald-900/40 rounded text-emerald-400 hover:text-white transition-colors">
                                                                <UserCheck className="h-4 w-4" />
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
                                    } else {
                                        return (
                                            <tr key={s.id} className={`group transition-all text-xs border-b border-gray-800 ${selectedRows.includes(s.id) ? 'bg-indigo-900/20' : 'hover:bg-gray-700/20'}`}>
                                                {user?.role !== 'AUDITOR' && (
                                                    <td className="p-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-800"
                                                            checked={selectedRows.includes(s.id)}
                                                            onChange={() => handleSelectRow(s.id)}
                                                        />
                                                    </td>
                                                )}
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
                                                    {s.adjuntos && s.adjuntos.length > 0 && (
                                                        <div className="mt-1">
                                                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 bg-indigo-950/80 border border-indigo-700/60 px-1.5 py-0.5 rounded">
                                                                📎 {s.adjuntos.length} {s.adjuntos.length === 1 ? 'adjunto' : 'adjuntos'}
                                                            </span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 whitespace-nowrap">
                                                    {s.responsable ? (
                                                        <>
                                                            <span className="text-indigo-300 font-bold uppercase">{s.responsable.name}</span><br/>
                                                            <span className="text-indigo-500/50 text-[10px]">{s.zone || ''}</span>
                                                        </>
                                                    ) : s.zone ? (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-400 border border-amber-800/80">
                                                            Pool: {s.zone}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 italic text-[11px]">Sin Asignar</span>
                                                    )}
                                                </td>
                                                <td className="p-3 text-gray-300">
                                                    <StatusBadge status={s.status} />
                                                    {multiResolutionProgress}
                                                </td>
                                                <td className="p-3 text-gray-300 text-[11px] leading-tight">
                                                    {resolucionContent}
                                                </td>
                                                <td className="p-3 sticky right-0 bg-gray-900/90 shadow-xl group-hover:bg-gray-800 transition-colors">
                                                    <div className="flex justify-end gap-1 opacity-60 group-hover:opacity-100">
                                                        {/* Botón Tomar Resolución (Pool Multi-Resolutor) */}
                                                        {user?.role === 'RESOLUTOR' && myPoolAssignment && (
                                                            <button
                                                                onClick={() => handleTomarResolucion(s.id, myPoolAssignment)}
                                                                title={`Tomar Resolución (${myPoolAssignment.tipoResolucion})`}
                                                                className="p-1.5 hover:bg-cyan-600 bg-cyan-900/40 rounded text-cyan-300 hover:text-white transition-colors"
                                                            >
                                                                <UserCheck className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {hasPendingApproval && (
                                                            <button
                                                                onClick={() => handleAprobarRapido(s, myPendingAssignment)}
                                                                title={
                                                                    myPendingAssignment?.tipoResolucion?.toUpperCase() === 'AGENDA'
                                                                        ? 'Abrir aprobación de AGENDA (requiere asistencia)'
                                                                        : `Aprobar Rápidamente (${myPendingAssignment?.tipoResolucion || 'Resolución'})`
                                                                }
                                                                className="p-1.5 hover:bg-emerald-600 bg-emerald-900/30 rounded text-emerald-400 hover:text-white transition-colors"
                                                            >
                                                                <Check className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                        {/* Botón Tomar Solicitud */}
                                                        {!s.responsable && (user?.role === 'RESPONSABLE' || user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN') && (!s.zone || !user?.zone || s.zone.toLowerCase() === user?.zone.toLowerCase() || user?.role?.includes('ADMIN')) && (
                                                            <button onClick={() => handleTomarSolicitud(s.id)} title="Tomar Solicitud (Asignármela)" className="p-1.5 hover:bg-emerald-600 bg-emerald-900/40 rounded text-emerald-400 hover:text-white transition-colors">
                                                                <UserCheck className="h-4 w-4" />
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
                                    }
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Controles de paginación */}
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

            {/* Modales */}
            <SolicitudModal
                isOpen={isABMOpen}
                onClose={() => {
                    setIsABMOpen(false);
                    setOpenApproveOnMount(false);
                }}
                onSuccess={fetchData}
                initialData={selectedSolicitud}
                configId={configId}
                cachedLocations={locationsList}
                openApproveOnMount={openApproveOnMount}
            />
            <AsociarPlanillaModal
                isOpen={isAsociarModalOpen}
                onClose={() => setIsAsociarModalOpen(false)}
                onSuccess={() => {
                    if (configId) {
                        fetchConfig();
                    } else if (isResolutorSubsidio) {
                        fetchConfigForSubsidios();
                    }
                    fetchData();
                }}
                config={config}
            />

            {/* Modal de previsualización y confirmación antes de importar desde la planilla externa */}
            {importPreviewModal.open && (
                <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div
                        data-testid="import-preview-modal"
                        className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        <div className="px-6 py-4 bg-gray-900/80 border-b border-gray-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-white">Confirmar Importación desde Planilla</h3>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {importPreviewModal.ids
                                        ? `Importación selectiva sobre ${importPreviewModal.ids.length} solicitud(es) seleccionada(s)`
                                        : 'Importación global de todas las solicitudes de la planilla coincidentes en el sistema'}
                                </p>
                            </div>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-4">
                            {importPreviewModal.warning && (
                                <div className="p-3 rounded-xl bg-amber-900/30 border border-amber-500/40 text-amber-300 text-xs">
                                    {importPreviewModal.warning}
                                </div>
                            )}

                            {importPreviewModal.items.length === 0 ? (
                                <div className="text-center py-8 text-sm text-gray-400">
                                    No se encontraron solicitudes en estado <strong>Consideración</strong> en la planilla externa que coincidan con el sistema para importar.
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-300">
                                        Se encontraron <strong className="text-indigo-400">{importPreviewModal.items.length}</strong> solicitud(es) listas para importar (IDs:{' '}
                                        <span className="font-mono text-white">
                                            {importPreviewModal.items.map(i => `#${i.id}`).join(', ')}
                                        </span>):
                                    </p>
                                    <div className="border border-gray-700 rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-gray-900/80 text-gray-400 uppercase">
                                                <tr>
                                                    <th className="p-2.5">ID</th>
                                                    <th className="p-2.5">Solicitante</th>
                                                    <th className="p-2.5">Monto Planilla</th>
                                                    <th className="p-2.5">Acción</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-700/60">
                                                {importPreviewModal.items.map(item => (
                                                    <tr key={item.id} className="hover:bg-gray-700/30">
                                                        <td className="p-2.5 font-mono font-bold text-indigo-300">#{item.id}</td>
                                                        <td className="p-2.5 text-gray-200">{item.solicitante}</td>
                                                        <td className="p-2.5 font-mono text-gray-200">{item.montoPlanilla || '(vacío)'}</td>
                                                        <td className="p-2.5">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                item.accion === 'APROBAR'
                                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                                    : item.accion === 'DESAPROBAR'
                                                                        ? 'bg-red-500/20 text-red-300'
                                                                        : 'bg-amber-500/20 text-amber-300'
                                                            }`}>
                                                                {item.accion}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-gray-900/60 border-t border-gray-700 flex justify-end gap-3">
                            <button
                                type="button"
                                data-testid="btn-cancel-import"
                                onClick={() => setImportPreviewModal({ open: false, items: [], ids: null, warning: null })}
                                title="Cancelar la importación sin aplicar cambios"
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-xs font-bold transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                data-testid="btn-confirm-import"
                                disabled={importPreviewModal.items.length === 0}
                                onClick={handleConfirmImport}
                                title="Confirmar e importar los cambios de la planilla al sistema"
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-colors"
                            >
                                Confirmar Importación ({importPreviewModal.items.length})
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
