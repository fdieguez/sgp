import { useState, useEffect, useCallback } from 'react';
import { X, Save, User as UserIcon, MapPin, Clipboard, Phone, DollarSign, Calendar, Users, Plus, Trash2, History, FileText, UploadCloud, Download, ArrowRight, MessageSquare } from 'lucide-react';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import TicketSeguimiento from './TicketSeguimiento';

export default function SolicitudModal({ isOpen, onClose, onSuccess, initialData, configId }) {
    const { user } = useAuth();
    const isResponsable = user?.role === 'RESPONSABLE' || user?.role === 'RESOLUTOR';
    const canSuggestResolutor = user?.role === 'RESPONSABLE';
    const isResolutor = user?.role === 'RESOLUTOR';
    const [formData, setFormData] = useState({
        type: 'PEDIDO',
        description: '',
        status: 'pendiente',
        origin: 'MANUAL',
        entryDate: new Date().toISOString().split('T')[0],
        person: { name: '', phone: '' },
        locationName: '',
        barrio: '',
        responsableId: '',
        amount: '',
        grantDate: '',
        resolutionApproved: false,
        assignments: []
    });

    const [responsables, setResponsables] = useState([]);
    const [locations, setLocations] = useState([]);
    const [tiposResolucion, setTiposResolucion] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [approveObservations, setApproveObservations] = useState('');

    // Tabs & extra states
    const [activeTab, setActiveTab] = useState('detalles');
    const [historial, setHistorial] = useState([]);
    const [adjuntos, setAdjuntos] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    const fetchAdjuntos = useCallback(async () => {
        if (!formData.id) return;
        try {
            const res = await api.get(`/api/solicitudes/${formData.id}/adjuntos`);
            setAdjuntos(res.data);
        } catch (err) {
            console.error("Error fetching adjuntos", err);
        }
    }, [formData.id]);

    const fetchHistorial = useCallback(async () => {
        if (!formData.id) return;
        try {
            const res = await api.get(`/api/solicitudes/${formData.id}/historial`);
            setHistorial(res.data);
        } catch (err) {
            console.error("Error fetching history", err);
        }
    }, [formData.id]);

    useEffect(() => {
        if (isOpen && formData.id) {
            if (activeTab === 'historial') {
                fetchHistorial();
            }
            if (activeTab === 'adjuntos') {
                fetchAdjuntos();
            }
        }
    }, [isOpen, formData.id, activeTab, fetchHistorial, fetchAdjuntos]);


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
        const uploadData = new FormData();
        uploadData.append('file', file);
        try {
            await api.post(`/api/solicitudes/${formData.id}/adjuntos`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            fetchAdjuntos();
            toast.success("Archivo subido con éxito");
        } catch (err) {
            console.error("Error subiendo archivo", err);
            toast.error("Error al subir archivo");
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
            console.error("Error descargando archivo", err);
            toast.error("Error al descargar");
        }
    };
    const handleDeleteAdjunto = async (adjuntoId) => {
        if(!window.confirm("¿Seguro que deseas eliminar este archivo?")) return;
        try {
            await api.delete(`/api/solicitudes/${formData.id}/adjuntos/${adjuntoId}`);
            toast.success("Archivo eliminado");
            fetchAdjuntos();
        } catch (err) {
            console.error("Error eliminando archivo", err);
            toast.error("Error al eliminar el archivo");
        }
    };

    const fetchResponsables = useCallback(async () => {
        try {
            const res = await api.get('/api/responsables');
            setResponsables(res.data);
        } catch (err) {
            console.error("Error fetching responsables", err);
        }
    }, []);

    const fetchLocations = useCallback(async () => {
        try {
            const res = await api.get('/api/locations');
            setLocations(res.data);
        } catch (err) {
            console.error("Error fetching locations", err);
        }
    }, []);

    const fetchTiposResolucion = useCallback(async () => {
        try {
            const res = await api.get('/api/tipos-resolucion');
            setTiposResolucion(res.data);
        } catch (err) {
            console.error("Error fetching tipos resolucion", err);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            fetchResponsables();
            fetchLocations();
            fetchTiposResolucion();
            
            // Solo resetear el formulario si cambian los datos iniciales o si es una nueva apertura
            if (initialData) {
                // Evitar re-setear si el ID es el mismo para no romper la experiencia del usuario si el padre re-renderiza
                setFormData(prev => {
                    if (prev.id === initialData.id && prev.status === initialData.status) {
                         return prev;
                    }
                    return {
                        ...initialData,
                        type: initialData.amount !== undefined ? 'SUBSIDIO' : 'PEDIDO',
                        person: initialData.person || { name: '', phone: '' },
                        locationName: initialData.location?.type === 'NEIGHBORHOOD' ? (initialData.location?.parent?.name || '') : (initialData.location?.name || ''),
                        barrio: initialData.location?.type === 'NEIGHBORHOOD' ? (initialData.location?.name || '') : '',
                        responsableId: initialData.responsable?.id || '',
                        amount: initialData.amount || '',
                        grantDate: initialData.grantDate ? initialData.grantDate.split('T')[0] : '',
                        zone: initialData.zone || '',
                        contactDate: initialData.contactDate ? initialData.contactDate.split('T')[0] : '',
                        resolutionDate: initialData.resolutionDate ? initialData.resolutionDate.split('T')[0] : '',
                        entryDate: initialData.entryDate ? initialData.entryDate.split('T')[0] : '',
                        observation: initialData.observation || '',
                        resolution: initialData.resolution || '',
                        suggestedResolutionType: initialData.suggestedResolutionType || '',
                        resolutionApproved: initialData.resolutionApproved || false,
                        detail: initialData.detail || '',
                        firstContactControl: initialData.firstContactControl || false,
                        origin: initialData.origin || 'MANUAL',
                        assignments: initialData.resolutorAssignments?.map(a => {
                            let parsedDetalle = a.detalle || '';
                            try {
                                if (a.detalle && typeof a.detalle === 'string' && a.detalle.startsWith('{')) {
                                    parsedDetalle = JSON.parse(a.detalle);
                                }
                            } catch (e) {}
                            return {
                                resolutorEmail: a.resolutor?.email || '',
                                tipoResolucion: a.tipoResolucion || '',
                                detalle: parsedDetalle
                            };
                        }) || []
                    };
                });
            } else {
                setFormData({
                    type: 'PEDIDO',
                    description: '',
                    status: 'pendiente',
                    origin: 'MANUAL',
                    entryDate: new Date().toISOString().split('T')[0],
                    person: { name: '', phone: '' },
                    locationName: '',
                    barrio: '',
                    responsableId: (isResponsable && user?.responsable?.id) ? user.responsable.id : '',
                    amount: '',
                    grantDate: '',
                    zone: (isResponsable && user?.responsable?.zone) ? user.responsable.zone : '',
                    contactDate: '',
                    resolutionDate: '',
                    observation: '',
                    resolution: '',
                    suggestedResolutionType: '',
                    resolutionApproved: false,
                    detail: '',
                    firstContactControl: false,
                    assignments: []
                });
                setActiveTab('detalles');
            }
        } else {
            // Cuando se cierra, podemos resetear el tab pero no es crítico
            setActiveTab('detalles');
        }
    }, [isOpen, initialData?.id, fetchResponsables, fetchLocations, fetchTiposResolucion, isResponsable, user?.responsable?.id, user?.responsable?.zone]);

    // Computar listas dinámicas
    const availableCities = locations.filter(l => l.type === 'CITY' || l.type === 'LOCALITY');
    const selectedCity = availableCities.find(c => c.name.toLowerCase() === (formData.locationName || '').trim().toLowerCase());
    const availableNeighborhoods = selectedCity
        ? locations.filter(l => l.type === 'NEIGHBORHOOD' && l.parent?.id === selectedCity.id)
        : [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Limpiar asignaciones: filtrar vacías y serializar el detalle
            const assignments = formData.assignments
                .filter(a => a.resolutorEmail && a.tipoResolucion)
                .map(a => ({
                    ...a,
                    detalle: typeof a.detalle === 'object' ? JSON.stringify(a.detalle) : (a.detalle || '')
                }));

            if (formData.id) {
                // PUT usa un DTO plano (SolicitudUpdateDTO) para evitar el problema de
                // deserialización polimórfica de Jackson con la jerarquía abstracta de Solicitud.
                // Se envía responsableId (número) en lugar de responsable:{id} (objeto anidado).
                const updatePayload = {
                    type: formData.type,
                    description: formData.description,
                    status: formData.status,
                    origin: formData.origin,
                    entryDate: formData.entryDate || null,
                    person: formData.person,
                    locationName: formData.locationName,
                    barrio: formData.barrio,
                    zone: formData.zone,
                    contactDate: formData.contactDate || null,
                    resolutionDate: formData.resolutionDate || null,
                    resolution: formData.resolution,
                    detail: formData.detail,
                    observation: formData.observation,
                    firstContactControl: formData.firstContactControl,
                    // Clave: se envía el ID directo, no un objeto anidado. 
                    // Se envía 0 para indicar desasignación explícita.
                    responsableId: formData.responsableId ? Number(formData.responsableId) : 0,
                    suggestedResolutionType: formData.suggestedResolutionType || null,
                    resolutionApproved: formData.resolutionApproved,
                    // Campos de Subsidio
                    amount: formData.amount ? Number(formData.amount) : null,
                    grantDate: formData.grantDate || null,
                    assignments,
                    status: formData.status
                };
                await api.put(`/api/solicitudes/${formData.id}`, updatePayload);
                await api.put(`/api/solicitudes/${formData.id}/status`, formData.status, { headers: { 'Content-Type': 'text/plain' } });
            } else {
                // POST mantiene el formato original con polimorfismo (entidad completa)
                const createPayload = {
                    ...formData,
                    responsable: formData.responsableId ? { id: Number(formData.responsableId) } : null,
                    assignments
                };
                await api.post('/api/solicitudes', createPayload);
            }
            toast.success(formData.id ? "Solicitud actualizada" : "Solicitud creada");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error saving solicitud", err);
            toast.error("Error al guardar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    const handleAprobar = async () => {
        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${formData.id}/aprobar`, { observaciones: approveObservations });
            toast.success("Resolución aprobada");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error approving assignment", err);
            toast.error("Error al finalizar la resolución");
        } finally {
            setLoading(false);
            setShowApproveConfirm(false);
        }
    };

    if (!isOpen) return null;

    // Verificar si el usuario actual tiene una asignación pendiente en esta solicitud
    const myAssignment = formData.assignments?.find(a => a.resolutorEmail === user?.email);
    const isPendingResolutor = isResolutor && myAssignment && !myAssignment.approved;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800/50">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clipboard className="text-indigo-500" />
                        {formData.id ? 'Editar Solicitud' : 'Nueva Solicitud'}
                    </h2>
                    <button onClick={onClose} title="Cerrar" className="text-gray-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex border-b border-gray-700 px-6 bg-gray-900/20">
                    <button
                        onClick={() => setActiveTab('detalles')}
                        className={`px-4 py-3 font-bold text-sm tracking-wide ${activeTab === 'detalles' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Formulario / Detalles
                    </button>
                    {formData.id && (
                        <>
                            <button
                                onClick={() => setActiveTab('comentarios')}
                                className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 ${activeTab === 'comentarios' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <MessageSquare className="h-4 w-4" /> Notas Seguimiento
                            </button>
                            <button
                                onClick={() => setActiveTab('historial')}
                                className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 ${activeTab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <History className="h-4 w-4" /> Historial
                            </button>
                            <button
                                onClick={() => setActiveTab('adjuntos')}
                                className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 ${activeTab === 'adjuntos' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <FileText className="h-4 w-4" /> Adjuntos
                            </button>
                        </>
                    )}
                </div>

                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {activeTab === 'detalles' && (
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Type and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                value={formData.type}
                                disabled={!!formData.id}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                            >
                                <option value="PEDIDO">Pedido</option>
                                <option value="SUBSIDIO">Subsidio</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="pendiente">Pendiente</option>
                                <option value="en proceso">En Proceso</option>
                                <option value="en resolucion">En Resolución</option>
                                <option value="completadas">Completado</option>
                                <option value="rechazada">Rechazado</option>
                            </select>
                        </div>
                    </div>

                    {/* Person Data */}
                    <div className="space-y-4 p-4 bg-gray-900/40 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-indigo-400" /> Beneficiario
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Nombre Completo</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.person.name}
                                    onChange={(e) => setFormData({ ...formData, person: { ...formData.person, name: e.target.value } })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.person.phone}
                                    onChange={(e) => setFormData({ ...formData, person: { ...formData.person, phone: e.target.value } })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Data */}
                    <div className="space-y-4 p-4 bg-gray-900/40 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-indigo-400" /> Ubicación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Localidad</label>
                                <input
                                    type="text"
                                    list="cities-list"
                                    autoComplete="off"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.locationName}
                                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value, barrio: '' })} // Reset barrio al cambiar ciudad
                                    placeholder="Ej: Santa Fe"
                                />
                                <datalist id="cities-list">
                                    {availableCities.map(c => (
                                        <option key={c.id} value={c.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Barrio</label>
                                <input
                                    type="text"
                                    list="neighborhoods-list"
                                    autoComplete="off"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.barrio}
                                    onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                                    placeholder={selectedCity ? "Seleccionar o escribir..." : "Primero elija localidad"}
                                    disabled={!formData.locationName}
                                />
                                <datalist id="neighborhoods-list">
                                    {availableNeighborhoods.map(n => (
                                        <option key={n.id} value={n.name} />
                                    ))}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Zona / Eje</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    value={formData.zone || ''}
                                    disabled={isResponsable}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                                    placeholder="Auto-asignada, o escriba aquí..."
                                />
                            </div>
                        </div>
                    </div>

                    {/* Request Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descripción / Pedido</label>
                        <textarea
                            required
                            rows="2"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Observación</label>
                        <textarea
                            rows="2"
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                            value={formData.observation}
                            onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                        />
                    </div>

                    {/* Origin Field */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Origen</label>
                        <select
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.origin || 'MANUAL'}
                            onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                        >
                            <option value="MANUAL">Manual / Personal</option>
                            <option value="WHATSAPP">WhatsApp</option>
                            <option value="NOTE">Nota / Expediente</option>
                            <option value="SOCIAL_MEDIA">Redes Sociales</option>
                            <option value="PHONE">Teléfono</option>
                            <option value="EMAIL">Email</option>
                        </select>
                    </div>

                    {/* Subsidio specific fields */}
                    {formData.type === 'SUBSIDIO' && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 p-4 bg-emerald-900/20 rounded-xl border border-emerald-800/50">
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Monto
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" /> Fecha Entrega
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.grantDate}
                                    onChange={(e) => setFormData({ ...formData, grantDate: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    {/* Dates and Tracking */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Ingreso</label>
                            <input
                                type="date"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={formData.entryDate}
                                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Responsable</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                value={formData.responsableId}
                                disabled={isResponsable}
                                onChange={(e) => {
                                    const respId = e.target.value;
                                    const selectedResp = responsables.find(r => r.id.toString() === respId.toString());
                                    setFormData({ 
                                        ...formData, 
                                        responsableId: respId,
                                        zone: selectedResp ? (selectedResp.zone || '') : ''
                                    });
                                }}
                            >
                                <option value="">Seleccionar...</option>
                                {responsables.map(r => (
                                    <option key={r.id} value={r.id}>{r.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-300">Seguimiento</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Contacto</label>
                                <input
                                    type="date"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.contactDate}
                                    onChange={(e) => setFormData({ ...formData, contactDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Resolución</label>
                                <input
                                    type="date"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.resolutionDate}
                                    onChange={(e) => setFormData({ ...formData, resolutionDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Resolución</label>
                            <input
                                type="text"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={formData.resolution}
                                onChange={(e) => setFormData({ ...formData, resolution: e.target.value })}
                                placeholder="Resultado breve..."
                            />
                        </div>



                        {isResolutor && myAssignment?.approved && (
                            <div className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-700/50 flex flex-col gap-1">
                                <span className="text-sm font-bold text-emerald-400">✅ Resolución Finalizada</span>
                                {myAssignment.observaciones && (
                                    <p className="text-xs text-emerald-200 italic">"{myAssignment.observaciones}"</p>
                                )}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Detalle</label>
                            <textarea
                                rows="2"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.detail}
                                onChange={(e) => setFormData({ ...formData, detail: e.target.value })}
                                placeholder="Detalle extendido del seguimiento..."
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="firstContactControl"
                                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-indigo-600 focus:ring-indigo-500"
                                checked={formData.firstContactControl}
                                onChange={(e) => setFormData({ ...formData, firstContactControl: e.target.checked })}
                            />
                            <label htmlFor="firstContactControl" className="text-sm font-medium text-gray-300">
                                Control 1er Contacto Realizado
                            </label>
                        </div>
                    </div>

                    {/* Multi-Resolutor Assignments Section */}
                    {(user?.role === 'RESPONSABLE' || user?.role === 'ADMINISTRADOR' || formData.assignments.length > 0) && (
                    <div className="p-4 bg-indigo-900/10 rounded-xl border border-indigo-700/30 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-indigo-300 flex items-center gap-2">
                                <Users className="h-4 w-4" /> Asignaciones Múltiples (Resolutores)
                            </h3>
                            {!isResolutor && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setFormData({
                                            ...formData,
                                            assignments: [...formData.assignments, { resolutorEmail: '', tipoResolucion: '', detalle: '' }]
                                        });
                                    }}
                                    className="text-xs flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 rounded transition-colors"
                                >
                                    <Plus className="h-3 w-3" /> Agregar
                                </button>
                            )}
                        </div>

                        {formData.assignments.length === 0 ? (
                            <p className="text-xs text-gray-500 italic">No hay asignaciones secundarias.</p>
                        ) : (
                            <div className="space-y-3">
                                {formData.assignments.map((assignment, index) => (
                                    <div key={index} className="flex flex-col gap-2 p-3 bg-gray-900/60 rounded-lg border border-gray-700 relative group">
                                        <div className="flex items-center gap-2">
                                            <select
                                                className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white disabled:opacity-70"
                                                disabled={isResolutor}
                                                value={assignment.tipoResolucion}
                                                onChange={(e) => {
                                                    const type = e.target.value;
                                                    const config = tiposResolucion.find(c => c.tipo === type);
                                                    const newAssignments = [...formData.assignments];
                                                    newAssignments[index] = { 
                                                        ...assignment, 
                                                        tipoResolucion: type,
                                                        resolutorEmail: config?.resolutor?.email || ''
                                                    };
                                                    setFormData({ ...formData, assignments: newAssignments });
                                                }}
                                            >
                                                <option value="">Seleccione Área...</option>
                                                {tiposResolucion.length === 0 && (
                                                    <option value="" disabled>No hay tipos de resolución (configúrelos en Settings)</option>
                                                )}
                                                {tiposResolucion.map(c => {
                                                    const resolutorName = c.resolutor ? (c.resolutor.firstName ? `${c.resolutor.firstName} ${c.resolutor.lastName}` : c.resolutor.email) : 'Área General (Sin usuario fijo)';
                                                    return (
                                                        <option key={c.id} value={c.tipo}>
                                                            {c.tipo} - {resolutorName}
                                                        </option>
                                                    );
                                                })}
                                            </select>
                                            {!isResolutor && (
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const newAssignments = formData.assignments.filter((_, i) => i !== index);
                                                        setFormData({ ...formData, assignments: newAssignments });
                                                    }}
                                                    className="text-red-400 hover:text-red-300 p-1"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-col mt-2">
                                                {(() => {
                                                    const config = tiposResolucion.find(c => c.tipo === assignment.tipoResolucion);
                                                    const canEditThis = !isResolutor || (assignment.resolutorEmail === user?.email);
                                                    if (config && config.atributosConfig && config.atributosConfig.length > 0) {
                                                        const sortedCampos = [...config.atributosConfig].sort((a,b) => a.orden - b.orden);
                                                    const currentData = typeof assignment.detalle === 'object' && assignment.detalle !== null ? assignment.detalle : {};
                                                    return (
                                                        <div className="space-y-4 p-4 bg-gray-800/80 border border-gray-600 rounded-lg shadow-inner">
                                                            {sortedCampos.map(ac => {
                                                                const campo = ac.atributo;
                                                                return (
                                                                <div key={campo.id}>
                                                                    <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                                                                        {campo.nombre} {ac.requerido && <span className="text-red-400">*</span>}
                                                                    </label>
                                                                    {campo.tipoDato === 'SELECT' ? (
                                                                        <select
                                                                            value={currentData[campo.nombre] || ''}
                                                                            onChange={e => {
                                                                                const newAssignments = [...formData.assignments];
                                                                                newAssignments[index].detalle = { ...currentData, [campo.nombre]: e.target.value };
                                                                                setFormData({ ...formData, assignments: newAssignments });
                                                                            }}
                                                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                                            disabled={!canEditThis}
                                                                        >
                                                                            <option value="">Seleccionar...</option>
                                                                            {campo.opciones && campo.opciones.split(',').map(opt => (
                                                                                <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                                                                            ))}
                                                                        </select>
                                                                    ) : campo.tipoDato === 'TEXTAREA' ? (
                                                                        <textarea
                                                                            value={currentData[campo.nombre] || ''}
                                                                            onChange={e => {
                                                                                const newAssignments = [...formData.assignments];
                                                                                newAssignments[index].detalle = { ...currentData, [campo.nombre]: e.target.value };
                                                                                setFormData({ ...formData, assignments: newAssignments });
                                                                            }}
                                                                            rows="2"
                                                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none block disabled:opacity-50"
                                                                            disabled={!canEditThis}
                                                                        />
                                                                    ) : (
                                                                        <input
                                                                            type={campo.tipoDato === 'DATE' ? 'date' : 'text'}
                                                                            placeholder={campo.tipoDato === 'FILE' ? 'Suba en Adjuntos y pegue el link / ref aquí...' : ''}
                                                                            value={currentData[campo.nombre] || ''}
                                                                            onChange={e => {
                                                                                const newAssignments = [...formData.assignments];
                                                                                newAssignments[index].detalle = { ...currentData, [campo.nombre]: e.target.value };
                                                                                setFormData({ ...formData, assignments: newAssignments });
                                                                            }}
                                                                            className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none block"
                                                                        />
                                                                    )}
                                                                </div>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                } else {
                                                    return (
                                                        <input 
                                                            type="text"
                                                            placeholder="Detalle de la asignación..."
                                                            className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm text-gray-300 disabled:opacity-50"
                                                            disabled={!canEditThis}
                                                            value={typeof assignment.detalle === 'string' ? assignment.detalle : ''}
                                                            onChange={(e) => {
                                                                const newAssignments = [...formData.assignments];
                                                                newAssignments[index].detalle = e.target.value;
                                                                setFormData({ ...formData, assignments: newAssignments });
                                                            }}
                                                        />
                                                    );
                                                }
                                            })()}

                                            {assignment.resolutorEmail && (
                                                <span className="text-[10px] text-gray-400 mt-2 ml-1">
                                                    Asignado a: <span className="font-semibold text-gray-300">{assignment.resolutorEmail}</span>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                        </form>
                    )}

                    {activeTab === 'comentarios' && formData.id && (
                        <div className="p-6">
                            <TicketSeguimiento solicitudId={formData.id} />
                        </div>
                    )}

                    {activeTab === 'historial' && formData.id && (
                        <div className="p-6 space-y-4">
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
                                                record.actionType === 'CREATED' ? 'bg-amber-500/10 text-amber-400' :
                                                record.actionType === 'ASSIGNED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                record.actionType === 'REASSIGNED' ? 'bg-indigo-500/10 text-indigo-400' :
                                                record.actionType.startsWith('RESOLUCIÓN') ? 'bg-blue-500/10 text-blue-400' :
                                                'bg-red-500/10 text-red-400'
                                            }`}>
                                                {record.actionType === 'CREATED' ? <Plus className="h-5 w-5" /> : <ArrowRight className="h-5 w-5" />}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                                                        record.actionType === 'CREATED' ? 'bg-amber-900/30 text-amber-400 border-amber-800' :
                                                        record.actionType === 'ASSIGNED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' :
                                                        record.actionType === 'REASSIGNED' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' :
                                                        record.actionType.startsWith('RESOLUCIÓN') ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                                                        'bg-red-900/30 text-red-400 border-red-800'
                                                    }`}>
                                                        {record.actionType === 'CREATED' ? 'Cargado/Creado' :
                                                         record.actionType === 'ASSIGNED' ? 'Asignado' :
                                                         record.actionType === 'REASSIGNED' ? 'Re-asignado' : 
                                                         record.actionType.startsWith('RESOLUCIÓN') ? 'Resolución Aprobada' : 'Desasignado'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {new Date(record.actionDate).toLocaleString()}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    {record.actionType === 'CREATED' ? (
                                                        <span className="text-gray-300">
                                                            Solicitud registrada inicialmente en el sistema.
                                                        </span>
                                                    ) : record.actionType === 'ASSIGNED' ? (
                                                        <span className="text-gray-300">
                                                            Asignado al responsable <span className="font-bold text-white">{record.responsable ? record.responsable.name : 'Ninguno'}</span>
                                                        </span>
                                                    ) : record.actionType === 'REASSIGNED' ? (
                                                        <span className="text-gray-300">
                                                            Re-asignado al responsable <span className="font-bold text-white">{record.responsable ? record.responsable.name : 'Ninguno'}</span>
                                                        </span>
                                                    ) : record.actionType === 'UNASSIGNED' ? (
                                                        <span className="text-gray-300">
                                                            Se retiró la asignación de responsable (anterior: {record.responsable ? record.responsable.name : 'Desconocido'})
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">
                                                            <span className="font-bold text-white">{record.responsable ? record.responsable.name : 'Usuario'}</span> {record.actionType.toLowerCase().includes('aprobada') ? 'aprobó la resolución.' : ''}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {record.actionType === 'CREATED' ? 'Operador: ' : 'Acción realizada por: '}
                                                    <span className="font-medium text-gray-400">{record.assignedByUsername}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                    
                    {activeTab === 'adjuntos' && formData.id && (
                        <div className="p-6 space-y-6">
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
                                                    <button type="button" onClick={() => handleDownload(adj)} className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors" title="Descargar">
                                                        <Download className="h-4 w-4" />
                                                    </button>
                                                    <button type="button" onClick={() => handleDeleteAdjunto(adj.id)} className="p-2 text-red-400 hover:text-white bg-red-900/20 hover:bg-red-600 rounded-lg transition-colors" title="Eliminar">
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

                <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-between items-center gap-3">
                    <div>
                        {isPendingResolutor && (
                            <button
                                type="button"
                                onClick={() => setShowApproveConfirm(true)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Aprobar Resolución
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            <Save className="h-4 w-4" />
                            {loading ? 'Guardando...' : 'Guardar Solicitud'}
                        </button>
                    </div>
                </div>

                {/* Sub-modal de confirmación de aprobación */}
                {showApproveConfirm && (
                    <div className="absolute inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300">
                        <div className="bg-gray-800 border border-emerald-500/50 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4">
                            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                                <Save className="h-5 w-5" /> ¿Aprobar Resolución?
                            </h3>
                            <p className="text-sm text-gray-300">
                                Esta acción marcará su parte como resuelta y la solicitud desaparecerá de su bandeja principal.
                            </p>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2">Mis Observaciones</label>
                                <textarea
                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                                    rows="4"
                                    placeholder="Escriba aquí los detalles de la resolución..."
                                    value={approveObservations}
                                    onChange={(e) => setApproveObservations(e.target.value)}
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowApproveConfirm(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleAprobar}
                                    disabled={loading}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg"
                                >
                                    {loading ? 'Confirmando...' : 'Confirmar y Finalizar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
