import { X, Calendar, User, MapPin, Tag, Box, DollarSign, Clock, Hash } from 'lucide-react';

export default function SolicitudDetailModal({ isOpen, onClose, solicitud }) {
    if (!isOpen || !solicitud) return null;

    const isSubsidio = solicitud.amount !== undefined && solicitud.amount !== null;

    const getStatusStyle = (status) => {
        switch (status) {
            case 'COMPLETED': return 'bg-green-900/30 text-green-400 border-green-800';
            case 'PENDING': return 'bg-yellow-900/30 text-yellow-400 border-yellow-800';
            case 'IN_PROGRESS': return 'bg-blue-900/30 text-blue-400 border-blue-800';
            case 'REJECTED': return 'bg-red-900/30 text-red-400 border-red-800';
            default: return 'bg-gray-700 text-gray-300 border-gray-600';
        }
    };

    const formatDate = (date) => {
        if (!date) return '-';
        return new Date(date).toLocaleDateString();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-gray-800 border border-gray-700 rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                {/* Header with Background Accent */}
                <div className={`h-2 ${isSubsidio ? 'bg-emerald-500' : 'bg-indigo-500'}`}></div>
                <div className="p-8 border-b border-gray-700 relative">
                    <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors bg-gray-900/50 p-2 rounded-full">
                        <X className="h-5 w-5" />
                    </button>

                    <div className="flex items-start justify-between gap-4 mb-4">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getStatusStyle(solicitud.status)}`}>
                                    {solicitud.status}
                                </span>
                                <span className="text-gray-500 text-xs font-mono">#{solicitud.id}</span>
                            </div>
                            <h2 className="text-2xl font-black text-white leading-tight">
                                {solicitud.person?.name || 'Solicitud sin nombre'}
                            </h2>
                        </div>
                        {isSubsidio && (
                            <div className="bg-emerald-950/40 border border-emerald-500/30 p-4 rounded-2xl text-right">
                                <div className="text-xs text-emerald-500 font-bold uppercase tracking-widest mb-1">Monto Subsidio</div>
                                <div className="text-3xl font-black text-emerald-400">${solicitud.amount?.toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {/* Left Column: Details */}
                    <div className="space-y-6">
                        <section>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Box className="h-3 w-3" /> Detalles de la Solicitud
                            </h3>
                            <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50 leading-relaxed text-gray-200">
                                {solicitud.description}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <Clock className="h-3 w-3" /> Tiempos y Seguimiento
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-700/30">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Ingreso</div>
                                    <div className="text-sm font-semibold">{formatDate(solicitud.entryDate)}</div>
                                </div>
                                <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-700/30">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">1er Contacto</div>
                                    <div className="text-sm font-semibold flex items-center gap-2">
                                        {formatDate(solicitud.contactDate)}
                                        {solicitud.firstContactControl && (
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">OK</span>
                                        )}
                                    </div>
                                </div>
                                <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-700/30">
                                    <div className="text-[10px] text-gray-500 uppercase font-bold">Resolución</div>
                                    <div className="text-sm font-semibold">{formatDate(solicitud.resolutionDate)}</div>
                                </div>
                                {isSubsidio && (
                                    <div className="bg-gray-900/30 p-3 rounded-xl border border-gray-700/30">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Entrega</div>
                                        <div className="text-sm font-semibold">{formatDate(solicitud.grantDate)}</div>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section>
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 mt-6 flex items-center gap-2">
                                <Tag className="h-3 w-3" /> Observaciones
                            </h3>
                            <div className="bg-yellow-900/10 p-5 rounded-2xl border border-yellow-700/20 leading-relaxed text-yellow-100/80 text-sm italic">
                                {solicitud.observation || 'Sin observaciones registradas.'}
                            </div>
                        </section>
                    </div>

                    {/* Right Column: Entity Data */}
                    <div className="space-y-6">
                        <section className="bg-gray-900/40 p-5 rounded-3xl border border-gray-700/50">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Información de Contacto</h3>
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/10 rounded-lg"><User className="h-4 w-4 text-indigo-400" /></div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Titular</div>
                                        <div className="text-sm font-medium">{solicitud.person?.name}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-500/10 rounded-lg"><Hash className="h-4 w-4 text-blue-400" /></div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Documento / ID</div>
                                        <div className="text-sm font-medium">{solicitud.person?.dni || '-'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg"><MapPin className="h-4 w-4 text-emerald-400" /></div>
                                    <div>
                                        <div className="text-[10px] text-gray-500 uppercase font-bold">Ubicación</div>
                                        <div className="text-sm font-medium">
                                            {solicitud.location?.name}
                                            {solicitud.person?.address && <span className="text-gray-500 block text-xs">{solicitud.person.address}</span>}
                                            {solicitud.zone && <span className="text-indigo-400 block text-xs font-bold mt-1">Zona: {solicitud.zone}</span>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <section className="bg-indigo-900/20 p-5 rounded-3xl border border-indigo-500/20">
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Gestión</h3>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Origen</span>
                                    <span className="text-xs font-bold bg-gray-800 px-2 py-0.5 rounded-md text-gray-300">{solicitud.origin}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-400">Responsable</span>
                                    <span className="text-xs font-bold text-white">{solicitud.responsable?.name || 'Sin asignar'}</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>

                <div className="p-8 border-t border-gray-700 bg-gray-900/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-2.5 rounded-full font-bold transition-all shadow-lg active:scale-95"
                    >
                        Cerrar Vista
                    </button>
                </div>
            </div>
        </div>
    );
}
