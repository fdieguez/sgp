import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    HelpCircle,
    FileText,
    Users,
    Filter,
    FileSpreadsheet,
    Calendar,
    Download,
    BookOpen,
    CheckCircle2,
    UserCheck,
    ShieldCheck,
    Layers
} from 'lucide-react';
import { APP_VERSION_LABEL } from '../config/version';

/**
 * Centro de Ayuda oficial integrado en la plataforma SGP.
 * Actualizado a la versión vigente con guías rápidas por rol, pools compartidos,
 * resoluciones múltiples, Subsidios en Especie e integraciones con Google Workspace.
 */
export default function HelpPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-6 sm:p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Encabezado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <Link to="/dashboard" className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4 group">
                            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                            Volver al Dashboard
                        </Link>
                        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                            <HelpCircle className="h-9 w-9 sm:h-10 sm:w-10 text-indigo-500" />
                            Centro de Ayuda SGP
                        </h1>
                        <p className="text-gray-400 mt-2 text-base sm:text-lg">
                            Manual rápido de uso, flujos por rol y preguntas frecuentes ({APP_VERSION_LABEL}).
                        </p>
                    </div>

                    <div className="sm:self-end">
                        <a
                            href="/Manual_de_Usuario_SGP.pdf"
                            download="Manual_de_Usuario_SGP.pdf"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 border border-indigo-400/30 transition-all hover:scale-105 active:scale-95"
                            title="Descargar Manual Oficial SGP en formato PDF"
                        >
                            <Download className="h-5 w-5 text-indigo-200" />
                            <span>Descargar Manual Oficial (PDF)</span>
                        </a>
                    </div>
                </div>

                {/* Banner Destacado Descarga Manual Oficial */}
                <div className="relative overflow-hidden bg-gradient-to-r from-gray-800 via-indigo-950/50 to-gray-800 rounded-3xl border border-indigo-500/30 p-6 sm:p-8 shadow-2xl">
                    <div className="absolute top-0 right-0 -mt-6 -mr-6 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Documentación Oficial Actualizada ({APP_VERSION_LABEL})</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                                <BookOpen className="h-7 w-7 text-indigo-400" />
                                Manual de Usuario SGP
                            </h2>
                            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
                                Guía completa paso a paso por perfiles: Operador, Distribuidor, Responsable, Resolutores, Auditor y Administrador.
                            </p>
                            <p className="text-gray-400 text-xs sm:text-sm">
                                Incluye carga ágil de solicitudes, Pool Territorial, Pool Multi-Resolutor, Subsidios en Dinero y Especie (Monto solicitado y Monto real), Google Sheets y Google Calendar con invitados frecuentes.
                            </p>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-auto">
                            <a
                                href="/Manual_de_Usuario_SGP.pdf"
                                download="Manual_de_Usuario_SGP.pdf"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-xl shadow-emerald-900/30 border border-emerald-400/30 transition-all hover:scale-105 active:scale-95 group"
                            >
                                <Download className="h-5 w-5 group-hover:translate-y-0.5 transition-transform" />
                                <span>Descargar Manual Completo (PDF)</span>
                            </a>
                        </div>
                    </div>
                </div>

                {/* Grilla de módulos de ayuda */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Carga de Solicitudes y Estados */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-emerald-900/40 p-3 rounded-2xl"><FileText className="h-6 w-6 text-emerald-400" /></div>
                            <h2 className="text-xl font-bold">Solicitudes y Estados</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300 text-sm">
                            <li>
                                <strong className="text-white block mb-1">Carga inicial ágil</strong>
                                Al tipear el nombre del solicitante, el buscador inteligente sugiere personas existentes y muestra su historial (Vista 360°). El <strong>DNI no es obligatorio al inicio</strong> (solo al tramitar Subsidio Personal o en Dinero). Incluye 12 Temas normalizados, Redes Sociales y 8 Orígenes oficiales.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Ciclo de Estados</strong>
                                <div className="space-y-1 mt-1">
                                    <div><span className="text-yellow-400 font-bold">Pendiente:</span> Ingresada sin Responsable asignado.</div>
                                    <div><span className="text-blue-400 font-bold">Asignadas:</span> Con Responsable territorial (o cargada por un Responsable sin resolución).</div>
                                    <div><span className="text-purple-400 font-bold">En Resolución:</span> Con una o más áreas resolutoras asignadas.</div>
                                    <div><span className="text-orange-400 font-bold">Consideración:</span> Subsidio enviado a evaluación externa / planilla.</div>
                                    <div><span className="text-green-400 font-bold">Resueltas:</span> Todas las resoluciones asignadas fueron aprobadas.</div>
                                    <div><span className="text-red-400 font-bold">Rechazado:</span> Pedido cancelado o desestimado.</div>
                                </div>
                            </li>
                        </ul>
                    </div>

                    {/* Roles y Permisos */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-purple-900/40 p-3 rounded-2xl"><Users className="h-6 w-6 text-purple-400" /></div>
                            <h2 className="text-xl font-bold">Roles y Permisos</h2>
                        </div>
                        <ul className="space-y-3 text-gray-300 text-sm">
                            <li>
                                <strong className="text-white">Operador:</strong> Carga inicial, adjuntos, edición de carga original y carga de <em>Monto real</em> en Subsidios en Especie incluso cuando el pedido ya está en estado <strong>Resueltas</strong>.
                            </li>
                            <li>
                                <strong className="text-white">Distribuidor:</strong> Asigna Zona, Responsable específico o deja el pedido en el <em>Pool de Zona</em>.
                            </li>
                            <li>
                                <strong className="text-white">Responsable:</strong> Gestiona casos de su zona (propios o tomados del Pool), carga notas de seguimiento y propone resoluciones. Recibe aviso por email cuando una resolución se aprueba.
                            </li>
                            <li>
                                <strong className="text-white">Resolutor:</strong> Evalúa y aprueba resoluciones de sus especialidades (*Agenda, Subsidio en Dinero, Subsidio en Especie, Declaración de interés, Otro*).
                            </li>
                            <li>
                                <strong className="text-white">Auditor / Administrador:</strong> El Auditor accede en modo solo lectura; el Administrador gestiona usuarios (incluyendo multi-rol y múltiples zonas/tipos) y configuraciones.
                            </li>
                        </ul>
                    </div>

                    {/* Pool Territorial y Pool Multi-Resolutor */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-cyan-900/40 p-3 rounded-2xl"><UserCheck className="h-6 w-6 text-cyan-400" /></div>
                            <h2 className="text-xl font-bold">Pools Compartidos (Tomar Casos)</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300 text-sm">
                            <li>
                                <strong className="text-white block mb-1">Pool Territorial (Responsables)</strong>
                                Si el Distribuidor asigna una Zona sin elegir persona, la solicitud aparece con el badge <span className="text-amber-300 font-semibold">Pool: ZONA</span> para todos los Responsables de esa zona. Con el botón verde <strong>Tomar Solicitud</strong> podés asignártela con control de concurrencia.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Pool Multi-Resolutor (Áreas de Resolución)</strong>
                                Varios resolutores pueden compartir una misma especialidad. Al elegir un tipo de resolución, el caso queda visible con el badge <span className="text-cyan-300 font-semibold">Pool</span> para todos los resolutores de ese tipo, quienes pueden presionar <strong>Tomar Resolución</strong> para reservarla y resolverla. Siempre queda registrado quién lo resolvió.
                            </li>
                        </ul>
                    </div>

                    {/* Resoluciones Múltiples, Aprobación y Subsidios en Especie */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-indigo-900/40 p-3 rounded-2xl"><Layers className="h-6 w-6 text-indigo-400" /></div>
                            <h2 className="text-xl font-bold">Aprobaciones y Subsidios</h2>
                        </div>
                        <ul className="space-y-4 text-gray-300 text-sm">
                            <li>
                                <strong className="text-white block mb-1">Guardado automático y Observaciones opcionales</strong>
                                El botón <strong>Aprobar Resolución</strong> guarda automáticamente cualquier cambio editado antes de aprobar (nada se pierde). El campo <em>Observaciones</em> es opcional.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Pedidos con más de una resolución</strong>
                                Cada bloque muestra si está <span className="text-emerald-400 font-semibold">Aprobada</span> o <span className="text-amber-300 font-semibold">Pendiente</span>, y debajo del estado se indica el avance (ej: <em>1/2 aprobadas · Falta: AGENDA</em>). Como Resolutor podés activar el filtro rápido <strong>Solo mis pendientes</strong>.
                            </li>
                            <li>
                                <strong className="text-white block mb-1">Subsidios en Especie: Monto solicitado y Monto real</strong>
                                Se carga un <strong>Monto solicitado</strong> inicial y, una vez concretada la compra (incluso con el pedido en estado <em>Resueltas</em>), un Operador puede completar el <strong>Monto real</strong> sin alterar el estado resuelto.
                            </li>
                        </ul>
                    </div>

                    {/* Campos de la Solicitud (Nuevos y Actualizados) */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl md:col-span-2">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="bg-emerald-900/40 p-3 rounded-2xl"><FileText className="h-6 w-6 text-emerald-400" /></div>
                            <h2 className="text-xl font-bold">Explicación de Campos (Nuevos y Actualizados)</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                            <ul className="space-y-3">
                                <li>
                                    <strong className="text-white">Redes Sociales <span className="text-emerald-400 text-xs">(Nuevo)</span>:</strong> Usuario (<code>@perfil</code>) o enlace de Instagram/Facebook del solicitante o institución.
                                </li>
                                <li>
                                    <strong className="text-white">Tipo de Solicitante <span className="text-indigo-400 text-xs">(Actualizado)</span>:</strong> Unificado en <strong>Institucional</strong> (Club, Iglesia, Escuela, Gobierno Local, ONG, Vecinal, Comedor/Merendero, Otros) o <strong>Personal</strong> (Joven, Emprendedor, Referente, Vecino, Otros).
                                </li>
                                <li>
                                    <strong className="text-white">Número de DNI <span className="text-indigo-400 text-xs">(Regla actualizada)</span>:</strong> Ya <strong>no se exige</strong> en la carga inicial; solo es obligatorio al tramitar un <em>Subsidio Personal</em> o <em>Institucional en Dinero</em> (exento en Subsidio en Especie).
                                </li>
                            </ul>
                            <ul className="space-y-3">
                                <li>
                                    <strong className="text-white">Tema Solicitud <span className="text-emerald-400 text-xs">(Nuevo — 12 temas)</span>:</strong> Deporte, Salud, Cultura, Educación, Seguridad, Vivienda, Trabajo / Emprendedor, Economía - Producción, Temas Municipales, Temas Provinciales, Asistencia / Subsistencia, Otros.
                                </li>
                                <li>
                                    <strong className="text-white">Origen <span className="text-indigo-400 text-xs">(8 canales oficiales)</span>:</strong> Directo de Paco, Territorio, Oficina, Nota / Expediente, Email, Instagram, Facebook, Derivado.
                                </li>
                                <li>
                                    <strong className="text-white">Monto solicitado y Monto real <span className="text-emerald-400 text-xs">(Nuevo en Subsidio en Especie)</span>:</strong> Separan el importe estimado al pedir del gasto definitivo real (que un Operador puede completar incluso después de resuelto).
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Paso a Paso de Resolutores por Tipo */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl md:col-span-2">
                        <div className="flex items-center gap-3 mb-5">
                            <div className="bg-indigo-900/40 p-3 rounded-2xl"><Layers className="h-6 w-6 text-indigo-400" /></div>
                            <h2 className="text-xl font-bold">Paso a Paso para Resolutores por Tipo</h2>
                        </div>
                        <p className="text-gray-400 text-xs sm:text-sm mb-5">
                            <strong className="text-cyan-300">Paso inicial común:</strong> Ingresá con rol <strong>Resolutor</strong>, localizá el caso con badge <span className="text-cyan-300 font-semibold">Pool</span> y presioná <strong>Tomar Resolución</strong> para reservártelo. Al aprobar, tus cambios se guardan automáticamente y las observaciones son opcionales.
                        </p>
                        <div className="grid md:grid-cols-2 gap-5 text-gray-300 text-sm">
                            <div className="bg-gray-900/60 border border-gray-700/70 rounded-2xl p-4 space-y-2">
                                <h3 className="font-bold text-blue-300 text-base">1. Agenda</h3>
                                <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                                    <li>Tomá la resolución del Pool y revisá los 13 campos (actividad, día, hora, lugar, responsables, aporte).</li>
                                    <li>Presioná <strong>Aprobar Resolución</strong> (o el botón verde en la tabla, que abre directo el panel de aprobación).</li>
                                    <li>Elegí obligatoriamente <strong>Con Asistencia</strong> o <strong>Sin Asistencia</strong>.</li>
                                    <li><em>(Opcional)</em> Tildá <strong>Crear evento en Google Calendar</strong> y elegí los invitados frecuentes.</li>
                                    <li>Confirmá en <strong>Confirmar y Finalizar</strong>.</li>
                                </ol>
                            </div>
                            <div className="bg-gray-900/60 border border-gray-700/70 rounded-2xl p-4 space-y-2">
                                <h3 className="font-bold text-emerald-300 text-base">2. Subsidio en Dinero</h3>
                                <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                                    <li>Tomá la resolución del Pool y verificá el tipo (<em>Personal</em> o <em>Institucional en dinero</em>).</li>
                                    <li>Revisá DNI obligatorio, CBU/Nota de pedido, responsables y <strong>Monto</strong>.</li>
                                    <li>Si requiere planilla externa, presioná <strong>Poner en Consideración</strong> y usá <strong>Exportar &rarr; Google Sheets</strong> / <strong>Importar</strong>.</li>
                                    <li>Presioná <strong>Aprobar Resolución</strong> &rarr; <strong>Confirmar y Finalizar</strong>.</li>
                                </ol>
                            </div>
                            <div className="bg-gray-900/60 border border-gray-700/70 rounded-2xl p-4 space-y-2">
                                <h3 className="font-bold text-amber-300 text-base">3. Subsidio en Especie</h3>
                                <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                                    <li>Tomá la resolución del Pool (no exige DNI en casos institucionales).</li>
                                    <li>Revisá institución, fecha del evento, <em>Descripción de bienes solicitados</em> y <strong>Monto solicitado</strong>.</li>
                                    <li>Presioná <strong>Aprobar Resolución</strong> &rarr; <strong>Confirmar y Finalizar</strong>.</li>
                                    <li><em>Post-resolución (Operador):</em> Con la compra realizada y el pedido en <strong>Resueltas</strong>, el Operador carga el <strong>Monto real</strong> y guarda manteniendo el estado resuelto.</li>
                                </ol>
                            </div>
                            <div className="bg-gray-900/60 border border-gray-700/70 rounded-2xl p-4 space-y-2">
                                <h3 className="font-bold text-purple-300 text-base">4. Declaración de Interés y 5. Otro</h3>
                                <ol className="list-decimal list-inside space-y-1 text-xs sm:text-sm">
                                    <li><strong>Declaración de Interés:</strong> Tomá el caso, revisá adjuntos y los 13 campos del evento (nombre, institución, fecha, dirección, fundamentos).</li>
                                    <li><strong>Otro:</strong> Tomá el caso y revisá el detalle libre y documentación adjunta.</li>
                                    <li>Aprobá desde el botón verde de la tabla o dentro del modal (<strong>Aprobar Resolución</strong>). Si comparte el pedido con otra área (ej. Agenda), verás el avance <em>1/2 aprobadas</em>.</li>
                                </ol>
                            </div>
                        </div>
                    </div>

                    {/* Seguridad de Datos y Filtros */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl md:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-orange-900/40 p-3 rounded-2xl"><ShieldCheck className="h-6 w-6 text-orange-400" /></div>
                            <h2 className="text-xl font-bold">Reglas de Protección y Tips de Uso</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                            <ul className="space-y-3">
                                <li>
                                    <strong className="text-white">Carga Original protegida:</strong> Solo el Operador, el Administrador o el Responsable que creó el pedido pueden modificar los datos iniciales del solicitante y la descripción.
                                </li>
                                <li>
                                    <strong className="text-white">Subsidios protegidos:</strong> Solo el Responsable creador/asignado, los Resolutores del área y Operador/Admin pueden editar los datos de un subsidio propuesto.
                                </li>
                            </ul>
                            <ul className="space-y-3">
                                <li className="flex items-start gap-2">
                                    <Filter className="h-4 w-4 text-orange-400 mt-0.5 flex-shrink-0" />
                                    <span>Usá el buscador global, las tarjetas de estado, el filtro <strong>Tipo de Pedido</strong> (en Subsidios) o <strong>Exportar &rarr; Descargar CSV</strong> para informes rápidos.</span>
                                </li>
                                <li>
                                    <strong className="text-white">Cambio de perfil:</strong> Si tenés dos roles asignados (ej. Responsable y Resolutor), podés elegir el perfil activo al iniciar sesión.
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Asociación de Planillas */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl md:col-span-2">
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
                                    Identificá el código alfanumérico largo en la URL de tu Google Sheet. Se encuentra entre <code className="bg-gray-950 px-1 py-0.5 rounded text-xs">/d/</code> y <code className="bg-gray-950 px-1 py-0.5 rounded text-xs">/edit</code> (por ejemplo: <code className="bg-gray-950 px-1 py-0.5 rounded text-xs font-mono">1jPw9ni4BW_bRfw_...</code>).
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 2: Compartir con permisos de Editor</strong>
                                    Hacé clic en el botón <strong>Compartir</strong> en Google Sheets y agregá el correo de servicio con permisos de <strong>Editor</strong>:
                                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-700/50 mt-1.5 flex items-center justify-between font-mono text-[11px] text-indigo-400 select-all overflow-x-auto">
                                        sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com
                                    </div>
                                    <span className="text-[10px] text-gray-500 block mt-1.5">Indispensable para que el backend del SGP pueda leer y escribir datos.</span>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 3: Pegar y Guardar</strong>
                                    En la vista de solicitudes, hacé clic en <strong>Asociar Planilla</strong> (icono de engranaje), pegá el Spreadsheet ID y guardá.
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 4: Sincronizar</strong>
                                    Usá <span className="text-orange-400 font-bold">Exportar &rarr; Google Sheets</span> para enviar las solicitudes en consideración, o <span className="text-indigo-400 font-bold">Importar</span> para actualizar estados procesados externamente.
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Generación de Eventos Google Calendar e Invitados */}
                    <div className="bg-gray-800 rounded-3xl border border-gray-700 p-7 shadow-xl md:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="bg-blue-900/40 p-3 rounded-2xl">
                                <Calendar className="h-6 w-6 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold">Google Calendar e Invitados Frecuentes (Agenda)</h2>
                        </div>
                        <div className="grid md:grid-cols-2 gap-6 text-gray-300 text-sm">
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 1: Compartir el Calendario</strong>
                                    En Google Calendar web, entrá a <em>Configurar y compartir</em> de tu calendario principal y agregá con permisos de <strong className="text-white">&quot;Realizar cambios en eventos&quot;</strong> a:
                                    <div className="bg-gray-950/60 p-2.5 rounded-xl border border-gray-700/50 mt-1.5 flex items-center justify-between font-mono text-[11px] text-blue-400 select-all overflow-x-auto">
                                        sgp-bot@n8ncredencialesplatzi-464818.iam.gserviceaccount.com
                                    </div>
                                    <span className="text-[10px] text-gray-500 block mt-1.5">También debe hacerlo cada invitado frecuente que quiera recibir el evento en su calendario.</span>
                                </div>
                                <div>
                                    <strong className="text-white block mb-1">Paso 2: Configurar ID e Invitados Frecuentes</strong>
                                    Desde <strong>Configuración de Resolutor / Proyecto</strong>, pegá tu correo de Gmail en <em>Google Calendar ID</em> y administrá tu lista de <strong>Invitados Frecuentes</strong> (Nombre + Gmail).
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <strong className="text-white block mb-1">Paso 3: Aprobar Agenda y Convocar Invitados</strong>
                                    Al aprobar una solicitud de tipo <strong>Agenda</strong> (desde el modal o presionando el botón verde de la tabla), seleccioná <em>Con Asistencia / Sin Asistencia</em>, activá <strong>&quot;Crear evento en Google Calendar&quot;</strong>, tildá a los invitados que desees convocar y confirmá.
                                </div>
                                <div className="pt-2 border-t border-gray-700/50">
                                    <strong className="text-orange-400 block mb-1">⚠️ ¿Error 403 Forbidden al crear el evento?</strong>
                                    Si el sistema informa permiso denegado, verificá que la cuenta de servicio tenga permisos de edición en tu calendario y que la API de Google Calendar esté habilitada en <a href="https://console.developers.google.com/apis/api/calendar-json.googleapis.com/overview?project=649560393499" target="_blank" rel="noreferrer" className="text-indigo-400 underline hover:text-white font-semibold">Google Cloud Console</a>.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
