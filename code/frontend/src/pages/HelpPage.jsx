import { Link } from 'react-router-dom';
import { ArrowLeft, Book, HelpCircle, FileText, Database, Users, Filter, FileSpreadsheet, Calendar } from 'lucide-react';

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

                    {/* Asociación de Planillas */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-indigo-900/40 p-3 rounded-2xl">
                                <FileSpreadsheet className="h-6 w-6 text-indigo-400" />
                            </div>
                            <h2 className="text-xl font-bold">Asociación de Planillas (Google Sheets)</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 1: Obtener el Spreadsheet ID</strong>
                                    Identifica el código alfanumérico largo en la URL de tu Google Sheet. Se encuentra entre <code className="bg-gray-950 px-1 py-0.5 rounded text-xs">/d/</code> y <code className="bg-gray-950 px-1 py-0.5 rounded text-xs">/edit</code> (por ejemplo: <code className="bg-gray-950 px-1 py-0.5 rounded text-xs font-mono">1jPw9ni4BW_bRfw_...</code>).
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 2: Compartir con permisos de Editor</strong>
                                    Haz clic en el botón <strong>Compartir</strong> en Google Sheets y agrega el correo de servicio con permisos de <strong>Editor</strong>:
                                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-700/50 mt-1.5 flex items-center justify-between font-mono text-[11px] text-indigo-400 select-all overflow-x-auto">
                                        sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com
                                    </div>
                                    <span className="text-[10px] text-gray-500 block mt-1.5">Esto es indispensable para que el backend del SGP pueda leer y escribir datos.</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 3: Pegar y Guardar</strong>
                                    Ve a la sección de solicitudes del proyecto, haz clic en el botón <strong>Asociar Planilla</strong> (icono de engranaje) ubicado en la botonera de acciones superior, pega el Spreadsheet ID en el campo correspondiente y presiona guardar.
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 4: Sincronizar</strong>
                                    Una vez asociada la planilla, puedes hacer clic en <span className="text-orange-400 font-bold">Exportar Planilla</span> para enviar las solicitudes en consideración, o en <span className="text-indigo-400 font-bold">Importar Planilla</span> para actualizar los estados procesados externamente.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generación de Eventos Google Calendar */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-8 shadow-xl md:col-span-2 mt-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-900/40 p-3 rounded-2xl">
                                <Calendar className="h-6 w-6 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold">Configuración de Google Calendar (Eventos Agenda)</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 1: Compartir tu Calendario</strong>
                                    Ingresa a Google Calendar web. En la barra izquierda, pasa el cursor sobre tu calendario principal, haz clic en los tres puntos y selecciona "Configurar y compartir". En la sección "Compartir con personas o grupos", agrega la misma cuenta de servicio del sistema con permisos para <strong className="text-white">"Realizar cambios en eventos"</strong>:
                                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-700/50 mt-1.5 flex items-center justify-between font-mono text-[11px] text-blue-400 select-all overflow-x-auto">
                                        sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com
                                    </div>
                                    <span className="text-[10px] text-gray-500 block mt-1.5">Sin este permiso, el sistema no podrá inyectar los eventos en tu agenda.</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 2: Pegar y Guardar</strong>
                                    Ve a la sección de solicitudes del proyecto, haz clic en el botón <strong>Asociar Planilla</strong> (icono de engranaje) ubicado en la botonera de acciones superior, y en el campo "Google Calendar ID", pega tu correo electrónico (ej. <em>tu-correo@gmail.com</em>) y guarda los cambios.
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 3: Aprobar Resolución</strong>
                                    Al aprobar una solicitud del tipo <strong>Agenda</strong>, activa la opción "Crear evento en Google Calendar", edita los detalles que el sistema pre-carga automáticamente y confirma. ¡El evento aparecerá en tu calendario al instante!
                                </div>
                                <div className="pt-2 border-t border-gray-700/50">
                                    <strong className="text-orange-400 block mb-1">⚠️ ¿Error al crear el evento (403 Forbidden)?</strong>
                                    Si al aprobar la agenda el sistema muestra un error de permiso denegado, significa que la API de Google Calendar está desactivada en tu cuenta de Cloud. Habilítala ingresando a <a href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=649560393499" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-white font-semibold">este enlace de activación de Google Cloud</a> y presionando el botón azul <strong>"Habilitar"</strong>.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
