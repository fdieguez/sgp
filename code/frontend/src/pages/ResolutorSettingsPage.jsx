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
    User
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResolutorSettingsPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [savingId, setSavingId] = useState(null);

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
                                        {proyectosAgenda.map(p => (
                                            <div key={p.id} className="bg-gray-800/80 border border-gray-700 p-6 rounded-2xl shadow-lg hover:border-gray-600 transition-colors">
                                                <div className="flex items-center justify-between mb-4">
                                                    <span className="font-bold text-white text-lg">{p.name}</span>
                                                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-indigo-900/30 text-indigo-400 border border-indigo-700/50">Agenda</span>
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
                                                            El correo electrónico del calendario donde se agendarán los turnos. Recuerda compartir el calendario con la cuenta de servicio de Google del sistema.
                                                        </p>
                                                    </div>
                                                    
                                                    <div className="flex justify-end">
                                                        <button 
                                                            type="submit" 
                                                            disabled={savingId === p.id}
                                                            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800/50 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-lg"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                            {savingId === p.id ? 'Guardando...' : 'Guardar Agenda'}
                                                        </button>
                                                    </div>
                                                </form>
                                            </div>
                                        ))}
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
