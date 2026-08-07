import { useEffect, useState } from 'react';
import api from '../config/axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    ArrowLeft,
    Save,
    Calendar,
    FileSpreadsheet,
    Settings,
    CheckCircle,
    User,
    AlertTriangle,
    RefreshCw,
    Check,
    X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResolutorSettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);
    const [calendarStatus, setCalendarStatus] = useState({}); // Mapeo de projectId a { active: boolean, checked: boolean, error: string, checking: boolean }

    // Identificar las especialidades del resolutor
    const tieneAgenda = user?.tiposResolucion?.some(t => t.tipo?.toUpperCase() === 'AGENDA') || false;
    const tieneSubsidio = user?.tiposResolucion?.some(t => t.tipo?.toUpperCase() === 'SUBSIDIO') || false;

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        try {
            const res = await api.get('/api/projects');
            setProjects(res.data);
        } catch (err) {
            console.error('Error cargando proyectos', err);
            toast.error('Error al cargar proyectos');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckCalendarAccess = async (projectId, configId) => {
        if (!configId) {
            toast.error('Guarde la configuración del calendario antes de comprobar el acceso.');
            return;
        }

        setCalendarStatus(prev => ({
            ...prev,
            [projectId]: { ...prev[projectId], checking: true }
        }));

        try {
            const res = await api.post(`/api/config/${configId}/check-calendar`);
            setCalendarStatus(prev => ({
                ...prev,
                [projectId]: {
                    active: res.data.active,
                    checked: true,
                    error: res.data.error || '',
                    checking: false
                }
            }));
            if (res.data.active) {
                toast.success('¡Acceso verificado con éxito! El sistema tiene permisos de edición.');
            } else {
                toast.error(res.data.error || 'Sin acceso al calendario.');
            }
        } catch (err) {
            console.error('Error al comprobar acceso al calendario', err);
            setCalendarStatus(prev => ({
                ...prev,
                [projectId]: {
                    active: false,
                    checked: true,
                    error: 'Error de red o permisos insuficientes.',
                    checking: false
                }
            }));
            toast.error('Error al realizar la comprobación de acceso.');
        }
    };

    // Lógica para determinar si un proyecto es de tipo Agenda
    const esProyectoDeAgenda = (project) => {
        const name = (project.name || '').toUpperCase();
        const sheetName = (project.sheetsConfig?.sheetName || '').toUpperCase();
        return name.includes('AGENDA') || sheetName.includes('AGENDA');
    };

    const handleSaveConfig = async (projectId, configId, configData) => {
        setSavingId(projectId);
        try {
            await api.put(`/api/config/${configId}`, configData);
            toast.success('Configuración guardada correctamente');
            fetchProjects();
        } catch (err) {
            console.error('Error al guardar configuración', err);
            toast.error(err.response?.data?.error || 'Error al guardar la configuración');
        } finally {
            setSavingId(null);
        }
    };

    const handleInputChange = (projectId, field, value) => {
        setProjects(prev => prev.map(p => {
            if (p.id === projectId) {
                return {
                    ...p,
                    sheetsConfig: {
                        ...p.sheetsConfig,
                        [field]: value
                    }
                };
            }
            return p;
        }));
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
        </div>
    );

    // Filtrar los proyectos de acuerdo a la especificidad del resolutor
    const proyectosAgenda = projects.filter(p => esProyectoDeAgenda(p));
    const proyectosSubsidio = projects.filter(p => !esProyectoDeAgenda(p));

    const sinPermisos = !tieneAgenda && !tieneSubsidio;

    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Cabecera */}
                <div>
                    <button onClick={() => navigate('/dashboard')} className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-2 group">
                        <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                        Volver al Dashboard
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                        <Settings className="h-8 w-8 text-indigo-500" />
                        Mis Ajustes de Resolutor
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Configura las integraciones asociadas a tus especialidades de resolución.
                    </p>
                </div>

                {sinPermisos ? (
                    <div className="bg-gray-800 border border-yellow-700/50 p-6 rounded-2xl text-center space-y-3">
                        <p className="text-yellow-400 font-semibold">No tienes especialidades de resolución asignadas.</p>
                        <p className="text-gray-400 text-xs">Pídele a un administrador que configure tipos de resolución en tu usuario.</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* SECCIÓN AGENDA */}
                        {tieneAgenda && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-indigo-400 flex items-center gap-2 border-b border-gray-800 pb-2">
                                    <Calendar className="h-5 w-5" /> Configuración de Google Calendar
                                </h2>
                                
                                {proyectosAgenda.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No se encontraron proyectos de tipo Agenda configurados en el sistema.</p>
                                ) : (
                                    <div className="grid gap-6">
                                        {proyectosAgenda.map(p => {
                                            const status = calendarStatus[p.id] || { active: false, checked: false, error: '', checking: false };
                                            return (
                                                <div key={p.id} className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-lg hover:border-gray-600 transition-colors space-y-6">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-700/50 pb-4">
                                                        <div>
                                                            <span className="font-bold text-white text-lg block">{p.name}</span>
                                                            <span className="text-xs text-gray-400">ID Configuración: #{p.sheetsConfig?.id || 'Ninguno'}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {/* Badge de Estado del Calendario */}
                                                            {!status.checked ? (
                                                                <span className="text-xs px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-gray-400 font-semibold uppercase tracking-wider">
                                                                    No comprobado
                                                                </span>
                                                            ) : status.active ? (
                                                                <span className="text-xs px-3 py-1 rounded-full bg-green-950/30 border border-green-800 text-green-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                                    <Check className="h-3.5 w-3.5" /> Acceso Activo
                                                                </span>
                                                            ) : (
                                                                <span className="text-xs px-3 py-1 rounded-full bg-red-950/30 border border-red-800 text-red-400 font-bold uppercase tracking-wider flex items-center gap-1.5" title={status.error}>
                                                                    <X className="h-3.5 w-3.5" /> Sin Acceso
                                                                </span>
                                                            )}
                                                            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-700/50">Agenda</span>
                                                        </div>
                                                    </div>

                                                    {/* Caja Instructiva Explicativa del Proceso de Compartición */}
                                                    <div className="bg-indigo-950/10 border border-indigo-900/50 p-5 rounded-xl space-y-3">
                                                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <AlertTriangle className="h-4 w-4 text-indigo-400" /> Configuración Requerida de Google Calendar
                                                        </h4>
                                                        <p className="text-xs text-gray-300 leading-relaxed">
                                                            Para permitir que el sistema agende los turnos automáticamente, debes entrar a tu Google Calendar en el navegador y compartirlo con permisos de edición con la siguiente Cuenta de Servicio del sistema:
                                                        </p>
                                                        <div className="flex items-center justify-between bg-gray-900 border border-gray-700/80 px-3 py-2 rounded-lg gap-2 overflow-hidden">
                                                            <code className="text-xs text-indigo-300 font-mono select-all truncate block">
                                                                sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com
                                                            </code>
                                                            <button 
                                                                type="button" 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText('sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com');
                                                                    toast.success('¡Copiado al portapapeles!');
                                                                }}
                                                                className="text-[10px] bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-400 px-2 py-1 rounded transition-colors font-semibold flex-shrink-0"
                                                            >
                                                                Copiar
                                                            </button>
                                                        </div>
                                                        <ul className="text-[10px] text-gray-400 list-disc list-inside space-y-1 pl-1">
                                                            <li>Ve a la configuración del calendario en Google Calendar.</li>
                                                            <li>En la sección <strong>Compartir con personas autorizadas</strong>, agrega la cuenta de arriba.</li>
                                                            <li>Asígnale el permiso de: <strong>Realizar cambios en eventos</strong> o superior.</li>
                                                        </ul>
                                                    </div>
                                                    
                                                    <form onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleSaveConfig(p.id, p.sheetsConfig.id, {
                                                            spreadsheetId: p.sheetsConfig.spreadsheetId,
                                                            calendarId: p.sheetsConfig.calendarId,
                                                            sheetName: p.sheetsConfig.sheetName
                                                        });
                                                    }} className="space-y-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Google Calendar ID</label>
                                                            <input 
                                                                type="text" 
                                                                required 
                                                                placeholder="ejemplo@gmail.com o id-calendario@group.calendar.google.com"
                                                                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white outline-none focus:border-indigo-500 text-sm"
                                                                value={p.sheetsConfig?.calendarId || ''}
                                                                onChange={(e) => handleInputChange(p.id, 'calendarId', e.target.value)}
                                                            />
                                                            <p className="text-[10px] text-gray-500 mt-1">
                                                                El ID del calendario. Si es el principal de tu cuenta, suele ser tu mismo correo de Gmail.
                                                            </p>
                                                        </div>

                                                        {status.checked && !status.active && status.error && (
                                                            <div className="bg-red-950/20 border border-red-900/30 p-3 rounded-lg text-xs text-red-400">
                                                                ⚠️ {status.error}
                                                            </div>
                                                        )}
                                                        
                                                        <div className="flex flex-wrap justify-between items-center gap-3 pt-2">
                                                            <button
                                                                type="button"
                                                                disabled={status.checking || !p.sheetsConfig?.calendarId}
                                                                onClick={() => handleCheckCalendarAccess(p.id, p.sheetsConfig.id)}
                                                                className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-indigo-400 hover:text-indigo-300 font-bold text-xs px-4 py-2.5 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors shadow-md"
                                                            >
                                                                {status.checking ? (
                                                                    <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />
                                                                ) : (
                                                                    <CheckCircle className="h-4 w-4" />
                                                                )}
                                                                {status.checking ? 'Comprobando...' : 'Comprobar Acceso API'}
                                                            </button>

                                                            <button 
                                                                type="submit" 
                                                                disabled={savingId === p.id}
                                                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-colors shadow-lg"
                                                            >
                                                                <Save className="h-4 w-4" />
                                                                {savingId === p.id ? 'Guardando...' : 'Guardar Agenda'}
                                                            </button>
                                                        </div>
                                                    </form>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* SECCIÓN SUBSIDIO */}
                        {tieneSubsidio && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-emerald-400 flex items-center gap-2 border-b border-gray-800 pb-2">
                                    <FileSpreadsheet className="h-5 w-5" /> Asociación de Planilla (Sheets)
                                </h2>
                                
                                {proyectosSubsidio.length === 0 ? (
                                    <p className="text-gray-500 text-sm italic">No se encontraron proyectos de tipo Subsidio configurados en el sistema.</p>
                                ) : (
                                    <div className="grid gap-6">
                                        {proyectosSubsidio.map(p => (
                                            <div key={p.id} className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-lg hover:border-gray-600 transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-bold text-white text-lg">{p.name}</span>
                                                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-900/30 text-emerald-400 border border-emerald-700/50">Subsidio / Planilla</span>
                                                </div>
                                                
                                                <form onSubmit={(e) => {
                                                    e.preventDefault();
                                                    handleSaveConfig(p.id, p.sheetsConfig.id, {
                                                        spreadsheetId: p.sheetsConfig.spreadsheetId,
                                                        calendarId: p.sheetsConfig.calendarId,
                                                        sheetName: p.sheetsConfig.sheetName
                                                    });
                                                }} className="space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Spreadsheet ID</label>
                                                            <input 
                                                                type="text" 
                                                                required 
                                                                placeholder="ID largo de Google Sheets"
                                                                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white outline-none focus:border-emerald-500 text-sm"
                                                                value={p.sheetsConfig?.spreadsheetId || ''}
                                                                onChange={(e) => handleInputChange(p.id, 'spreadsheetId', e.target.value)}
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nombre de la Hoja</label>
                                                            <input 
                                                                type="text" 
                                                                required 
                                                                placeholder="Ej: Respuestas de formulario 1"
                                                                className="w-full px-4 py-2.5 bg-gray-900 border border-gray-600 rounded-xl text-white outline-none focus:border-emerald-500 text-sm"
                                                                value={p.sheetsConfig?.sheetName || ''}
                                                                onChange={(e) => handleInputChange(p.id, 'sheetName', e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="flex justify-end">
                                                        <button 
                                                            type="submit" 
                                                            disabled={savingId === p.id}
                                                            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-lg"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                            {savingId === p.id ? 'Guardando...' : 'Asociar Planilla'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
