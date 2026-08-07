import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Shield, ClipboardList, Briefcase, FileCheck, LogOut, BarChart } from 'lucide-react';

export default function SelectRolPage() {
    const { allRoles, selectRole, logout, user } = useAuth();
    const navigate = useNavigate();

    const roleDetails = {
        'ADMINISTRADOR': {
            title: 'Administrador',
            description: 'Gestión global del sistema, configuraciones de planillas y control de usuarios.',
            icon: Shield,
            color: 'from-pink-500 to-rose-600',
            glow: 'shadow-rose-500/20'
        },
        'ADMIN': {
            title: 'Administrador',
            description: 'Gestión global del sistema, configuraciones de planillas y control de usuarios.',
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

    const handleSelect = (role) => {
        selectRole(role);
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
                    <div className="bg-gradient-to-tr from-indigo-500 to-rose-500 p-2 rounded-xl text-white font-bold text-lg tracking-wider shadow-lg">SGP</div>
                    <span className="text-gray-400 font-bold text-sm tracking-widest uppercase">Sistema de Gestión</span>
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
            <div className="max-w-4xl mx-auto w-full flex flex-col items-center justify-center my-auto space-y-8 z-10 py-12">
                <div className="text-center space-y-3">
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-400">
                        Hola, {user?.firstName || 'Usuario'}
                    </h1>
                    <p className="text-sm md:text-base text-gray-400 font-medium max-w-md mx-auto">
                        Selecciona el perfil con el que deseas ingresar a la plataforma para el trabajo de hoy.
                    </p>
                </div>

                {/* Grilla de Roles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-3xl pt-4">
                    {allRoles.map((role) => {
                        const details = roleDetails[role.toUpperCase()] || {
                            title: role,
                            description: 'Acceso a las tareas asignadas para tu perfil de usuario.',
                            icon: Briefcase,
                            color: 'from-gray-500 to-gray-600',
                            glow: 'shadow-gray-500/20'
                        };
                        const Icon = details.icon;

                        return (
                            <button
                                key={role}
                                onClick={() => handleSelect(role)}
                                className={`group relative bg-gray-900/40 border border-gray-800/80 hover:border-gray-700/80 p-8 rounded-[2rem] text-left transition-all duration-300 backdrop-blur-xl shadow-xl hover:${details.glow} hover:-translate-y-1 active:scale-98 flex flex-col justify-between min-h-[220px]`}
                            >
                                <div className="flex items-start justify-between w-full">
                                    <div className={`p-4 bg-gradient-to-tr ${details.color} rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110`}>
                                        <Icon className="h-6 w-6" />
                                    </div>
                                    <div className="bg-gray-800/50 border border-gray-700/50 p-1 px-3 rounded-full text-[9px] font-black text-gray-400 uppercase tracking-widest">
                                        Acceder
                                    </div>
                                </div>
                                <div className="space-y-2 mt-6">
                                    <h3 className="text-xl font-bold text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 flex flex-col">
                                        <span>{details.title}</span>
                                        {role.toUpperCase() === 'RESOLUTOR' && (
                                            <span className="text-xs text-indigo-400 font-bold mt-1 tracking-wide">
                                                ({user?.tiposResolucion && user.tiposResolucion.length > 0 
                                                    ? user.tiposResolucion.map(t => {
                                                        const name = t.tipo || '';
                                                        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
                                                      }).join(', ')
                                                    : 'Sin competencias'})
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
            </div>

            {/* Pie de página */}
            <div className="text-center text-[10px] font-mono tracking-widest text-gray-600 max-w-5xl mx-auto w-full border-t border-gray-900 pt-6 z-10">
                SGP PLATFORM • v0.9.0 • CONEXIÓN SEGURA SSL
            </div>
        </div>
    );
}
