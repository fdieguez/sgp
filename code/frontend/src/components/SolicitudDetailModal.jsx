import { useState, useEffect } from 'react';
import { X, Calendar, User, MapPin, Tag, Box, DollarSign, Clock, Hash, History, ArrowRight, FileText, UploadCloud, Download, Trash2 } from 'lucide-react';
import api from '../config/axios';
import TicketSeguimiento from './TicketSeguimiento';

export default function SolicitudDetailModal({ isOpen, onClose, solicitud }) {
    const [activeTab, setActiveTab] = useState('detalles');
    const [historial, setHistorial] = useState([]);
    const [adjuntos, setAdjuntos] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (isOpen && solicitud && activeTab === 'historial') {
            api.get(`/api/solicitudes/${solicitud.id}/historial`)
                .then(res => setHistorial(res.data))
                .catch(err => console.error("Error fetching history", err));
        }
        if (isOpen && solicitud && activeTab === 'adjuntos') {
            fetchAdjuntos();
        }
    }, [isOpen, solicitud, activeTab]);

    const fetchAdjuntos = async () => {
        try {
            const res = await api.get(`/api/solicitudes/${solicitud.id}/adjuntos`);
            setAdjuntos(res.data);
        } catch (err) {
            console.error("Error fetching adjuntos", err);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };
    
    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };
    
    const handleDrop = async (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            await handleFileUpload(e.dataTransfer.files[0]);
        }
    };
    
    const handleFileUpload = async (file) => {
        if (!file) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await api.post(`/api/solicitudes/${solicitud.id}/adjuntos`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchAdjuntos();
        } catch (err) {
            console.error("Upload failed", err);
            alert("Error al subir archivo");
        } finally {
            setIsUploading(false);
        }
    };
    
    const handleDownload = async (adjunto) => {
        try {
            const res = await api.get(`/api/solicitudes/adjuntos/${adjunto.id}/download`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', adjunto.originalFileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 100);
        } catch (err) {
            console.error("Download fail", err);
            alert("Error al descargar");
        }
    };
    
    const handleDeleteAdjunto = async (id) => {
        if(!window.confirm("¿Seguro que deseas eliminar este archivo?")) return;
        try {
            await api.delete(`/api/solicitudes/adjuntos/${id}`);
            fetchAdjuntos();
        } catch (err) {
            console.error("Delete fail", err);
            alert("Error al eliminar el archivo");
        }
    };

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
        if (date.includes('T')) return new Date(date).toLocaleDateString();
        const [y, m, d] = date.split('-');
        return new Date(y, m - 1, d).toLocaleDateString();
    };

    let locationText = '-';
    if (solicitud.location) {
        if (solicitud.location.type === 'NEIGHBORHOOD') {
            locationText = `${solicitud.location.parent ? solicitud.location.parent.name : ''} - B° ${solicitud.location.name}`;
        } else {
            locationText = solicitud.location.name;
        }
    }

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

                <div className="flex border-b border-gray-700 px-8 bg-gray-900/10 mt-4">
                    <button
                        onClick={() => setActiveTab('detalles')}
                        className={`px-6 py-4 font-bold text-sm tracking-wide ${activeTab === 'detalles' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Detalles
                    </button>
                    <button
                        onClick={() => setActiveTab('historial')}
                        className={`px-6 py-4 font-bold text-sm tracking-wide flex items-center gap-2 ${activeTab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <History className="h-4 w-4" /> Historial de Asignaciones
                    </button>
                    <button
                        onClick={() => setActiveTab('adjuntos')}
                        className={`px-6 py-4 font-bold text-sm tracking-wide flex items-center gap-2 ${activeTab === 'adjuntos' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <FileText className="h-4 w-4" /> Documentos Adjuntos
                    </button>
                </div>

                <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {activeTab === 'detalles' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Details */}
                            <div className="space-y-6">
                                <section>
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <Box className="h-3 w-3" /> Detalles de la Solicitud
                                    </h3>
                                    <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50 leading-relaxed text-gray-200 whitespace-pre-wrap break-words max-w-full">
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
                                        <Tag className="h-3 w-3" /> Resultado y Detalle
                                    </h3>
                                    {solicitud.resolution && (
                                        <div className="mb-3">
                                            <div className="text-[10px] text-gray-500 uppercase font-bold mb-1">Resolución Final</div>
                                            <div className="bg-gray-900/50 p-3 rounded-xl border border-gray-700/50 text-sm text-white">
                                                {solicitud.resolution}
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-gray-900/50 p-5 rounded-2xl border border-gray-700/50 leading-relaxed text-gray-300 text-sm">
                                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-2">Detalle de Gestión</div>
                                        {solicitud.detail || 'Sin detalle extendido.'}
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
                                                    {locationText}
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

                                {/* Ticket Seguimiento Component placed at bottom of right column */}
                                <TicketSeguimiento solicitudId={solicitud.id} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'historial' && (
                        <div className="space-y-4">
                            {historial.length === 0 ? (
                                <div className="text-center py-10 bg-gray-900/30 rounded-2xl border border-gray-700/50">
                                    <History className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                                    <p className="text-gray-400 text-sm">No hay registros de asignación para esta solicitud.</p>
                                </div>
                            ) : (
                                historial.map((record) => (
                                    <div key={record.id} className="bg-gray-900/40 p-4 rounded-2xl border border-gray-700/50 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-2 rounded-lg ${
                                                record.actionType === 'ASSIGNED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                record.actionType === 'REASSIGNED' ? 'bg-indigo-500/10 text-indigo-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                <ArrowRight className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                                        record.actionType === 'ASSIGNED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                                                        record.actionType === 'REASSIGNED' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' :
                                                        'bg-red-900/30 text-red-400 border-red-800'
                                                    }`}>
                                                        {record.actionType === 'ASSIGNED' ? 'Asignado' :
                                                         record.actionType === 'REASSIGNED' ? 'Re-asignado' : 'Desasignado'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(record.actionDate).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    <span className="text-gray-400">Responsable: </span>
                                                    <span className="font-bold text-white">{record.responsable ? record.responsable.name : 'Ninguno'}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    Modificado por <span className="font-medium text-gray-400">{record.assignedByUsername}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'adjuntos' && (
                        <div className="space-y-6">
                            <div 
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-gray-600 bg-gray-900/30'}`}
                            >
                                <UploadCloud className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-indigo-400' : 'text-gray-500'}`} />
                                <h3 className="text-lg font-bold text-white mb-2">Subir Documento</h3>
                                <p className="text-gray-400 text-sm mb-4">Arrastra aquí tu archivo o haz clic para seleccionar</p>
                                <label className={`bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold cursor-pointer transition-colors inline-block ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    {isUploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                                    <input type="file" className="hidden" disabled={isUploading} onChange={(e) => handleFileUpload(e.target.files[0])} />
                                </label>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Archivos Adjuntos ({adjuntos.length})
                                </h3>
                                {adjuntos.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-900/30 rounded-xl border border-gray-700/50">
                                        <p className="text-gray-500 text-sm">No hay documentos adjuntos aún.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {adjuntos.map(adj => (
                                            <div key={adj.id} className="bg-gray-800 border border-gray-700 p-4 rounded-xl flex items-center justify-between group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 shrink-0">
                                                        <FileText className="h-6 w-6" />
                                                    </div>
                                                    <div className="truncate min-w-0 flex-1">
                                                        <p className="text-sm font-bold text-white truncate" title={adj.originalFileName}>{adj.originalFileName}</p>
                                                        <p className="text-xs text-gray-500">{(adj.size / 1024 / 1024).toFixed(2)} MB • {new Date(adj.uploadedAt).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                                                    <button onClick={() => handleDownload(adj)} className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors" title="Descargar">
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleDeleteAdjunto(adj.id)} className="p-2 text-red-400 hover:text-white bg-red-900/20 hover:bg-red-600 rounded-lg transition-colors" title="Eliminar">
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-gray-700 bg-gray-900/20 flex justify-end">
                    <button
                        onClick={onClose}
                        className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-2.5 rounded-full font-bold transition-all shadow-lg active:scale-95"
                    >
                        Cerrar Vista
                    </button>
                </div>
            </div >
        </div >
    );
}
