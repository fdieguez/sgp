import { Link } from 'react-router-dom';
import { ArrowLeft, Book, HelpCircle, FileText, Database, Users, Filter } from 'lucide-react';

export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 group">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Volver al Dashboard
                        </Link>
                        <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                            <HelpCircle className="h-10 w-10 text-indigo-500" />
                            Centro de Ayuda SGP
                        </h1>
                        <p className="text-gray-400 mt-2 text-lg">Manual rápido de uso y preguntas frecuentes.</p>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                    {/* Sincronización */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-900/40 p-3 rounded-2xl"><Database className="h-6 w-6 text-indigo-400" /></div>
                            <h2 className="text-xl font-bold">Sincronización</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300">
                            <li>
                                <strong className="text-white block mb-1">¿Cómo sincronizar datos?</strong>
                                En el Dashboard, usa el botón <span className="inline-block bg-gray-700 px-1.5 rounded text-xs">⚡</span> en cada tarjeta de proyecto. O ve a <em>Configuración</em> para opciones avanzadas.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Diferencia entre Sync Incremental y Completo</strong>
                                <strong>Incremental:</strong> Solo busca datos modificados en los últimos 30 días (rápido).<br />
                                <strong>Completo:</strong> Revisa TODA la planilla desde el inicio (lento, usar para corregir datos antiguos).
                            </li>
                        </ul>
                    </div>

                    {/* Gestión de Solicitudes */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-emerald-900/40 p-3 rounded-2xl"><FileText className="h-6 w-6 text-emerald-400" /></div>
                            <h2 className="text-xl font-bold">Solicitudes</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300">
                            <li>
                                <strong className="text-white block mb-1">Crear Solicitud Manual</strong>
                                Dentro de un proyecto, botón "Nueva Solicitud". Estos datos se guardan en el sistema pero NO se suben a Google Sheets (por seguridad).
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Estados</strong>
                                <span className="text-yellow-400">PENDIENTE</span>: Ingresado, sin resolución.<br />
                                <span className="text-blue-400">EN PROCESO</span>: Se está gestionando.<br />
                                <span className="text-green-400">COMPLETADO</span>: Resuelto/Entregado.<br />
                                <span className="text-red-400">RECHAZADO</span>: Cancelado o denegado.
                            </li>
                        </ul>
                    </div>

                    {/* Usuarios y Permisos */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-900/40 p-3 rounded-2xl"><Users className="h-6 w-6 text-purple-400" /></div>
                            <h2 className="text-xl font-bold">Usuarios</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300">
                            <li>
                                <strong className="text-white block mb-1">Roles de Usuario</strong>
                                <strong>ADMIN:</strong> Puede crear planillas, gestionar usuarios y borrar datos.<br />
                                <strong>USER:</strong> Puede ver y editar solicitudes, pero no configuración crítica.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Responsables</strong>
                                Gestiona la lista de personas asignables (Referentes, Funcionarios) desde el menú "Usuarios" &rarr; pestaña "Responsables".
                            </li>
                        </ul>
                    </div>

                    {/* Tips */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-orange-900/40 p-3 rounded-2xl"><Filter className="h-6 w-6 text-orange-400" /></div>
                            <h2 className="text-xl font-bold">Tips de Uso</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300">
                            <li>
                                Usa los <strong>Filtros</strong> (icono embudo) para buscar rápidamente por origen (WhatsApp, Nota) o Responsable.
                            </li>
                            <li>
                                Al editar una solicitud, asegúrate de asignar una <strong>Zona</strong> y <strong>Ubicación</strong> correcta para los reportes geográficos.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
