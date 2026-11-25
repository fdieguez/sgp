import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    Shield,
    ClipboardList,
    Briefcase,
    FileCheck,
    LogOut,
    BarChart,
    Share2,
    ArrowLeft,
    DollarSign,
    Package,
    Calendar,
    Award,
    Layers
} from 'lucide-react';
import { APP_VERSION_LABEL } from '../config/version';

export default function SelectRolPage() {
    const { allRoles, selectRole, logout, user } = useAuth();
    const navigate = useNavigate();

    const tiposResolucion = user?.tiposResolucion || [];
    const onlyResolutorMultiTipo =
        allRoles.length === 1 &&
        allRoles[0]?.toUpperCase() === 'RESOLUTOR' &&
        tiposResolucion.length > 1;

    // Si el usuario tiene únicamente el rol RESOLUTOR con múltiples especialidades, abrir directo el submenú
    const [showResolutorSubmenu, setShowResolutorSubmenu] = useState(onlyResolutorMultiTipo);

    const roleDetails = {
        'ADMINISTRADOR': {
            title: 'Administrador',
            description: 'Gestión global del sistema, parametrización territorial, módulos y control de usuarios.',
            icon: Shield,
            color: 'from-pink-500 to-rose-600',
            glow: 'shadow-rose-500/20'
        },
        'ADMIN': {
            title: 'Administrador',
            description: 'Gestión global del sistema, parametrización territorial, módulos y control de usuarios.',
            icon: Shield,
            color: 'from-pink-500 to-rose-600',
            glow: 'shadow-rose-500/20'
        },
        'OPERADOR': {
            title: 'Operador',
            description: 'Carga diaria de solicitudes, registro de beneficiarios y flujos iniciales.',
            icon: ClipboardList,
            color: 'from-blue-500 to-indigo-600',
            glow: 'shadow-indigo-500/20'
        },
        'DISTRIBUIDOR': {
            title: 'Distribuidor',
            description: 'Derivación y asignación territorial de solicitudes entrantes a responsables.',
            icon: Share2,
            color: 'from-cyan-500 to-sky-600',
            glow: 'shadow-cyan-500/20'
        },
        'RESPONSABLE': {
            title: 'Responsable',
            description: 'Control de solicitudes asignadas, asignación de resolutores y control territorial.',
            icon: Briefcase,
            color: 'from-amber-500 to-orange-600',
            glow: 'shadow-orange-500/20'
        },
        'RESOLUTOR': {
            title: 'Resolutor',
            description: 'Evaluación técnica, aprobación de agendas/subsidios y gestiones finales.',
            icon: FileCheck,
            color: 'from-emerald-500 to-teal-600',
            glow: 'shadow-emerald-500/20'
        },
        'AUDITOR': {
            title: 'Control y Seguimiento',
            description: 'Auditoría y visualización de reportes estadísticos, gráficos globales y consulta de solicitudes.',
            icon: BarChart,
            color: 'from-violet-500 to-fuchsia-600',
            glow: 'shadow-fuchsia-500/20'
        }
    };

    // Estilo y descripción según especialidad del Resolutor
    const getTipoResolucionMeta = (tipoRaw = '') => {
        const upper = tipoRaw.trim().toUpperCase();
        if (upper.includes('SUBSIDIO') && upper.includes('DINERO')) {
            return {
                title: 'Subsidio en Dinero',
                description: 'Gestión de subsidios monetarios, consideración, exportación e importación con planilla externa.',
                icon: DollarSign,
                color: 'from-emerald-500 to-green-600',
                glow: 'shadow-emerald-500/20',
                slug: 'subsidio-en-dinero'
            };
        }
        if (upper.includes('SUBSIDIO') && upper.includes('ESPECIE')) {
            return {
                title: 'Subsidio en Especie',
                description: 'Evaluación y resolución de pedidos de bienes/insumos en especie con monto solicitado y real.',
                icon: Package,
                color: 'from-teal-500 to-cyan-600',
                glow: 'shadow-teal-500/20',
                slug: 'subsidio-en-especie'
            };
        }
        if (upper.includes('AGENDA')) {
            return {
                title: 'Agenda',
                description: 'Coordinación de audiencias, reuniones y sincronización con Google Calendar.',
                icon: Calendar,
                color: 'from-indigo-500 to-blue-600',
                glow: 'shadow-indigo-500/20',
                slug: 'agenda'
            };
        }
        if (upper.includes('DECLARACION') || upper.includes('DECLARACIÓN')) {
            return {
                title: 'Declaración de Interés',
                description: 'Evaluación y aprobación de solicitudes de declaraciones de interés legislativo/institucional.',
                icon: Award,
                color: 'from-amber-500 to-yellow-600',
                glow: 'shadow-amber-500/20',
                slug: 'declaracion-de-interes'
            };
        }
        return {
            title: tipoRaw,
            description: 'Bandeja dedicada para gestionar y resolver solicitudes de esta especialidad.',
            icon: Layers,
            color: 'from-purple-500 to-indigo-600',
            glow: 'shadow-purple-500/20',
            slug: upper.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
    };

    const handleSelectRole = (role) => {
        if (role.toUpperCase() === 'RESOLUTOR') {
            if (tiposResolucion.length > 1) {
                setShowResolutorSubmenu(true);
                return;
            }
            const singleTipo = tiposResolucion.length === 1 ? tiposResolucion[0].tipo : null;
            selectRole(role, singleTipo);
            navigate('/dashboard');
            return;
        }
        selectRole(role, null);
        navigate('/dashboard');
    };

    const handleSelectTipoResolucion = (tipoNombre) => {
        selectRole('RESOLUTOR', tipoNombre);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col justify-between p-6 relative overflow-hidden font-sans">
            {/* Círculos decorativos de fondo */}
            <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-rose-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Encabezado */}
            <div className="flex items-center justify-between max-w-5xl mx-auto w-full pt-4 z-10">
                <div className="flex items-center gap-3">
                    <img src="/logo-sgp.svg" alt="SGP Logo" className="h-9 w-9 drop-shadow-md" />
                    <span className="text-gray-300 font-bold text-sm tracking-widest uppercase">Sistema de Gestión Política</span>
                </div>
                <button
                    onClick={() => {
                        logout();
                        navigate('/login');
                    }}
                    className="flex items-center gap-2 text-gray-400 hover:text-rose-400 font-bold text-xs uppercase tracking-wider transition-colors bg-gray-900/50 border border-gray-800 p-2 px-4 rounded-full backdrop-blur-md active:scale-95"
                >
                    <LogOut className="h-4 w-4" /> Cerrar Sesión
                </button>
            </div>

            {/* Contenido Principal */}
            <div className="max-w-5xl mx-auto w-full flex flex-col items-center justify-center my-auto space-y-8 z-10 py-12">
                {!showResolutorSubmenu ? (
                    <>
                        <div className="text-center space-y-3">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400">
                                Hola, {user?.firstName || 'Usuario'}
                            </h1>
                            <p className="text-sm md:text-base text-gray-400 font-medium max-w-md mx-auto">
                                Selecciona el perfil con el que deseas ingresar a la plataforma para el trabajo de hoy.
                            </p>
                        </div>

                        {/* Grilla de Roles */}
                        <div className={`grid gap-6 w-full pt-4 ${
                            allRoles.length === 3
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'
                                : 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                        }`}>
                            {allRoles.map((role) => {
                                const details = roleDetails[role.toUpperCase()] || {
                                    title: role,
                                    description: 'Acceso a las tareas asignadas para tu perfil de usuario.',
                                    icon: Briefcase,
                                    color: 'from-gray-500 to-gray-600',
                                    glow: 'shadow-gray-500/20'
                                };
                                const Icon = details.icon;
                                const isResolutorMulti = role.toUpperCase() === 'RESOLUTOR' && tiposResolucion.length > 1;

                                return (
                                    <button
                                        key={role}
                                        data-testid={`select-role-${role.toLowerCase()}`}
                                        onClick={() => handleSelectRole(role)}
                                        className={`group relative bg-gray-900/40 border border-gray-800/80 hover:border-gray-700/80 p-8 rounded-[2rem] text-left transition-all duration-300 backdrop-blur-xl shadow-xl hover:${details.glow} hover:-translate-y-1 active:scale-98 flex flex-col justify-between min-h-[220px]`}
                                    >
                                        <div className="flex items-start justify-between w-full">
                                            <div className={`p-4 bg-gradient-to-tr ${details.color} rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="bg-gray-800/50 border border-gray-700/50 p-1 px-3 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                                {isResolutorMulti ? `${tiposResolucion.length} especialidades` : 'Acceder'}
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-6">
                                            <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 flex flex-col">
                                                <span>{details.title}</span>
                                                {role.toUpperCase() === 'RESOLUTOR' && (
                                                    <span className="text-xs text-indigo-400 font-bold mt-1 tracking-wide">
                                                        ({tiposResolucion.length > 0
                                                            ? tiposResolucion.map(t => {
                                                                const name = t.tipo || '';
                                                                return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                                                              }).join(', ')
                                                            : 'Sin especificidad'})
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                                {details.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Submenú de Especialidades de Resolutor */}
                        <div className="text-center space-y-3" data-testid="resolutor-submenu">
                            {allRoles.length > 1 && (
                                <button
                                    type="button"
                                    data-testid="btn-volver-roles"
                                    onClick={() => setShowResolutorSubmenu(false)}
                                    className="inline-flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-indigo-300 uppercase tracking-wider mb-2 transition-colors"
                                >
                                    <ArrowLeft className="h-4 w-4" /> Volver a perfiles
                                </button>
                            )}
                            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-white to-gray-300">
                                Resolutor — Elegí tu especialidad
                            </h1>
                            <p className="text-sm md:text-base text-gray-400 font-medium max-w-lg mx-auto">
                                Seleccioná con qué tipo de resolución vas a trabajar ahora. La bandeja y sus herramientas se adaptarán exclusivamente a esa especialidad.
                            </p>
                        </div>

                        <div className={`grid gap-6 w-full pt-4 ${
                            tiposResolucion.length === 3
                                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl'
                                : 'grid-cols-1 sm:grid-cols-2 max-w-3xl'
                        }`}>
                            {tiposResolucion.map((tipoObj) => {
                                const meta = getTipoResolucionMeta(tipoObj.tipo);
                                const Icon = meta.icon;
                                return (
                                    <button
                                        key={tipoObj.id || tipoObj.tipo}
                                        data-testid={`select-tipo-${meta.slug}`}
                                        onClick={() => handleSelectTipoResolucion(tipoObj.tipo)}
                                        className={`group relative bg-gray-900/40 border border-gray-800/80 hover:border-emerald-500/50 p-8 rounded-[2rem] text-left transition-all duration-300 backdrop-blur-xl shadow-xl hover:${meta.glow} hover:-translate-y-1 active:scale-98 flex flex-col justify-between min-h-[210px]`}
                                    >
                                        <div className="flex items-start justify-between w-full">
                                            <div className={`p-4 bg-gradient-to-tr ${meta.color} rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110`}>
                                                <Icon className="h-6 w-6" />
                                            </div>
                                            <div className="bg-gray-800/50 border border-gray-700/50 p-1 px-3 rounded-full text-[9px] font-black text-emerald-400 uppercase tracking-widest">
                                                Ingresar
                                            </div>
                                        </div>
                                        <div className="space-y-2 mt-6">
                                            <h3 className="text-xl font-bold text-white">
                                                {meta.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 leading-relaxed font-medium">
                                                {meta.description}
                                            </p>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Pie de página */}
            <div className="max-w-5xl mx-auto w-full text-center pb-4 z-10 border-t border-gray-900 pt-6">
                <p className="text-[11px] font-mono text-gray-600 tracking-widest uppercase">
                    SGP PLATFORM • {APP_VERSION_LABEL} • CONEXIÓN SEGURA SSL
                </p>
            </div>
        </div>
    );
}
