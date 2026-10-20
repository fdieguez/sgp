import { useState, useEffect, useCallback } from 'react';
import { X, Save, User as UserIcon, MapPin, Clipboard, Phone, DollarSign, Calendar, Users, Plus, Trash2, History, FileText, UploadCloud, Download, ArrowRight, MessageSquare, Check, Eye, LayoutDashboard, UserCheck, AlertTriangle } from 'lucide-react';
import api from '../config/axios';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import TicketSeguimiento from './TicketSeguimiento';
import PersonAutocomplete from './PersonAutocomplete';

// Función de ayuda para formatear cualquier tipo de fecha a "yyyy-MM-dd" de forma segura
const formatDateISO = (dateVal) => {
    if (!dateVal) return '';
    if (Array.isArray(dateVal)) {
        const [y, m, d] = dateVal;
        const mm = m < 10 ? `0${m}` : m;
        const dd = d < 10 ? `0${d}` : d;
        return `${y}-${mm}-${dd}`;
    }
    if (typeof dateVal === 'string') {
        return dateVal.split('T')[0];
    }
    if (dateVal instanceof Date) {
        return dateVal.toISOString().split('T')[0];
    }
    try {
        return new Date(dateVal).toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

// Catálogo de localidades oficiales de respaldo por si la red/API demora al abrir el formulario
const DEFAULT_CITIES = [
    { id: 1, name: "Santa Fe", type: "CITY" },
    { id: 2, name: "Santo Tomé", type: "CITY" },
    { id: 3, name: "Sauce Viejo", type: "CITY" },
    { id: 4, name: "Recreo", type: "CITY" },
    { id: 5, name: "San José del Rincón", type: "CITY" },
    { id: 6, name: "Laguna Paiva", type: "CITY" },
    { id: 7, name: "Monte Vera", type: "CITY" },
    { id: 8, name: "Nelson", type: "CITY" },
    { id: 9, name: "Llambi Campbell", type: "CITY" },
    { id: 10, name: "Candioti", type: "CITY" },
    { id: 11, name: "Emilia", type: "CITY" },
    { id: 12, name: "Arroyo Leyes", type: "CITY" },
    { id: 13, name: "Arroyo Aguiar", type: "CITY" },
    { id: 14, name: "Cabal", type: "CITY" },
    { id: 15, name: "Campo Andino", type: "CITY" },
    { id: 16, name: "Otra", type: "CITY" }
];

export default function SolicitudModal({ isOpen, onClose, onSuccess, initialData, configId, cachedLocations = [] }) {
    const { user } = useAuth();
    const isResponsable = user?.role === 'RESPONSABLE' || user?.role === 'RESOLUTOR';
    const isReadOnly = user?.role === 'AUDITOR';
    const canSuggestResolutor = user?.role === 'RESPONSABLE';
    const isResolutor = user?.role === 'RESOLUTOR';
    // Determinar si el usuario actual es un Resolutor con la competencia 'SUBSIDIO'
    const isResolutorSubsidio = user?.role === 'RESOLUTOR' && user?.tiposResolucion?.some(t => t?.tipo?.toUpperCase() === 'SUBSIDIO');
    const [formData, setFormData] = useState({
        type: 'PEDIDO',
        description: '',
        status: 'pendiente',
        origin: 'MANUAL',
        entryDate: new Date().toISOString().split('T')[0],
        person: { name: '', phone: '' },
        locationName: 'Santa Fe',
        barrio: '',
        responsableId: '',
        amount: '',
        grantDate: '',
        subsidioType: '',
        resolutionApproved: false,
        assignments: [],
        asistencia: '',
        porDonde: '',
        googleEventId: ''
    });
    // Condición de autorización para seleccionar/ver la opción 'Consideración' (Administrador, Responsable o Resolutor de Subsidio, o si ya está en consideración).
    // Se desplaza esta declaración después de formData para evitar ReferenceError por acceso previo a la inicialización de formData.
    const canPonerConsideracion = user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN' || user?.role === 'RESPONSABLE' || isResolutorSubsidio === true || formData.status === 'consideracion';
    const canTomar = Boolean(formData.id && !formData.responsableId && (user?.role === 'RESPONSABLE' || user?.role === 'ADMINISTRADOR' || user?.role === 'ADMIN') && (!formData.zone || !user?.zone || formData.zone.toLowerCase() === user?.zone.toLowerCase() || user?.role?.includes('ADMIN')));

    const handleTomar = async () => {
        if (!formData.id) return;
        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${formData.id}/tomar`);
            toast.success("¡Solicitud tomada y asignada a tu bandeja con éxito!");
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error al tomar la solicitud:", err);
            toast.error(err.response?.data?.message || err.response?.data?.error || "Error al tomar la solicitud.");
        } finally {
            setLoading(false);
        }
    };

    const [responsables, setResponsables] = useState([]);
    const [selectedZone, setSelectedZone] = useState('');
    const [locations, setLocations] = useState([]);
    const [tiposResolucion, setTiposResolucion] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showApproveConfirm, setShowApproveConfirm] = useState(false);
    const [approveObservations, setApproveObservations] = useState('');
    const [asistencia, setAsistencia] = useState('');
    
    // Estados para eventos de calendario
    const [createCalendarEvent, setCreateCalendarEvent] = useState(false);
    const [calendarTitle, setCalendarTitle] = useState('');
    const [calendarDate, setCalendarDate] = useState('');
    const [calendarTime, setCalendarTime] = useState('');
    const [calendarLocation, setCalendarLocation] = useState('');
    const [calendarDescription, setCalendarDescription] = useState('');
    const [availableGuests, setAvailableGuests] = useState([]);
    const [selectedGuests, setSelectedGuests] = useState([]);

    // Estados para Vista 360 e Inconsistencias por DNI (CDU-07 y CDU-08)
    const [selectedPersonStats, setSelectedPersonStats] = useState(null);
    const [dniCollision, setDniCollision] = useState(null);

    const handleDniBlur = async () => {
        const dni = formData.person?.dni ? String(formData.person.dni).trim() : '';
        if (!dni || dni.length < 5) return;
        try {
            const res = await api.get(`/api/persons/by-dni/${encodeURIComponent(dni)}`);
            if (res.data) {
                const registered = res.data;
                const currentName = (formData.person?.name || '').trim().toLowerCase();
                const registeredName = (registered.name || '').trim().toLowerCase();
                if (registeredName && currentName && registeredName !== currentName && registered.id !== formData.person?.id) {
                    setDniCollision(registered);
                }
            }
        } catch (err) {
            // Sin colisión de DNI
        }
    };

    // Pestañas y estados adicionales
    const [activeTab, setActiveTab] = useState('detalles');
    const [historial, setHistorial] = useState([]);
    const [adjuntos, setAdjuntos] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingFields, setUploadingFields] = useState({});
    // Estados para subida diferida de adjuntos al crear solicitud (Alternativa 1)
    const [pendingDynamicFiles, setPendingDynamicFiles] = useState({});
    const [pendingGeneralFiles, setPendingGeneralFiles] = useState([]);
    const [saveProgress, setSaveProgress] = useState('');

    // Verificar si el usuario actual tiene una asignación pendiente o aprobada (declaradas de forma temprana)
    const myAssignment = formData.assignments?.find(a => a.resolutorEmail === user?.email && !a.approved);
    const myApprovedAssignment = formData.assignments?.find(a => a.resolutorEmail === user?.email && a.approved);
    const isPendingResolutor = isResolutor && myAssignment && !myAssignment.approved;
    const isApproveDisabled = loading || (myAssignment?.tipoResolucion === 'AGENDA' && !asistencia);

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
    // Límite de tamaño: 10 MB. Extensiones permitidas.
    const MAX_FILE_SIZE_MB = 10;
    const ALLOWED_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'txt'];

    const validateFile = (file) => {
        if (!file) return false;
        
        // Validar tamaño
        const sizeMb = file.size / (1024 * 1024);
        if (sizeMb > MAX_FILE_SIZE_MB) {
            toast.error(`El archivo supera el límite de tamaño permitido de ${MAX_FILE_SIZE_MB} MB.`);
            return false;
        }

        // Validar extensión
        const name = file.name || '';
        const ext = name.substring(name.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.includes(ext)) {
            toast.error(`Extensión de archivo no permitida. Las permitidas son: ${ALLOWED_EXTENSIONS.join(', ')}`);
            return false;
        }

        return true;
    };

    const handleFileUpload = async (file) => {
        if (!file) return;
        if (!validateFile(file)) return;

        // Si la solicitud aún no se ha creado en base de datos, guardar en cola pendiente
        if (!formData.id) {
            setPendingGeneralFiles(prev => [...prev, file]);
            toast.success(`Archivo "${file.name}" seleccionado (se subirá al guardar la solicitud).`);
            return;
        }
        
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
            const errMsg = err.response?.data || "Error al subir archivo";
            toast.error(typeof errMsg === 'string' ? errMsg : "Error al subir archivo");
        } finally {
            setIsUploading(false);
        }
    };

    const handleRemovePendingGeneralFile = (indexToRemove) => {
        setPendingGeneralFiles(prev => prev.filter((_, idx) => idx !== indexToRemove));
        toast.info("Archivo quitado de la lista pendiente.");
    };

    const handleViewInline = async (adjunto) => {
        try {
            const res = await api.get(`/api/solicitudes/adjuntos/${adjunto.id}/view`, { 
                responseType: 'blob' 
            });
            const contentType = res.headers['content-type'] || 'application/pdf';
            const fileBlob = new Blob([res.data], { type: contentType });
            const url = window.URL.createObjectURL(fileBlob);
            
            // Abrir en una pestaña nueva
            window.open(url, '_blank');
            
            // Revocar el object url después de un delay
            setTimeout(() => window.URL.revokeObjectURL(url), 2000);
        } catch (err) {
            console.error("Error visualizando archivo", err);
            toast.error("Error al abrir el archivo. Es posible que el archivo físico no exista.");
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
            toast.error("Error al descargar el archivo. Es posible que el archivo físico no exista.");
        }
    };
    const handleDeleteAdjunto = async (adjuntoId) => {
        if(!window.confirm("¿Seguro que deseas eliminar este archivo?")) return;
        try {
            await api.delete(`/api/solicitudes/adjuntos/${adjuntoId}`);
            toast.success("Archivo eliminado");
            fetchAdjuntos();
        } catch (err) {
            console.error("Error eliminando archivo", err);
            toast.error("Error al eliminar el archivo");
        }
    };
    const handleDynamicFileUpload = async (assignmentIndex, campoNombre, file) => {
        if (!file) return;
        if (!validateFile(file)) return;
        const key = `${assignmentIndex}_${campoNombre}`;

        // Si la solicitud aún no fue creada en base de datos, guardar en memoria para subida diferida
        if (!formData.id) {
            setPendingDynamicFiles(prev => ({ ...prev, [key]: file }));

            const newAssignments = [...formData.assignments];
            const currentData = typeof newAssignments[assignmentIndex].detalle === 'object' && newAssignments[assignmentIndex].detalle !== null
                ? newAssignments[assignmentIndex].detalle
                : {};

            newAssignments[assignmentIndex].detalle = {
                ...currentData,
                [campoNombre]: 'pending',
                [`${campoNombre}_filename`]: file.name,
                [`${campoNombre}_size`]: file.size
            };

            setFormData({ ...formData, assignments: newAssignments });
            toast.success(`Archivo "${file.name}" seleccionado (se subirá al guardar la solicitud).`);
            return;
        }

        setUploadingFields(prev => ({ ...prev, [key]: true }));
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await api.post(`/api/solicitudes/${formData.id}/adjuntos`, uploadData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const newAssignments = [...formData.assignments];
            const currentData = typeof newAssignments[assignmentIndex].detalle === 'object' && newAssignments[assignmentIndex].detalle !== null
                ? newAssignments[assignmentIndex].detalle
                : {};

            const downloadUrl = `/api/solicitudes/adjuntos/${res.data.id}/download`;
            newAssignments[assignmentIndex].detalle = {
                ...currentData,
                [campoNombre]: downloadUrl,
                [`${campoNombre}_filename`]: res.data.originalFileName,
                [`${campoNombre}_id`]: res.data.id
            };

            setFormData({ ...formData, assignments: newAssignments });
            toast.success("Archivo subido correctamente");
        } catch (err) {
            console.error("Error subiendo archivo dinámico", err);
            toast.error("Error al subir el archivo");
        } finally {
            setUploadingFields(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleDynamicFileDelete = async (assignmentIndex, campoNombre, adjuntoId) => {
        const key = `${assignmentIndex}_${campoNombre}`;

        // Si es un archivo pendiente (no persistido en servidor aún), eliminarlo del estado local
        if (!formData.id || adjuntoId === 'pending' || !adjuntoId) {
            setPendingDynamicFiles(prev => {
                const updated = { ...prev };
                delete updated[key];
                return updated;
            });

            const newAssignments = [...formData.assignments];
            const currentData = typeof newAssignments[assignmentIndex].detalle === 'object' && newAssignments[assignmentIndex].detalle !== null
                ? newAssignments[assignmentIndex].detalle
                : {};
                
            const updatedData = { ...currentData };
            delete updatedData[campoNombre];
            delete updatedData[`${campoNombre}_filename`];
            delete updatedData[`${campoNombre}_id`];
            delete updatedData[`${campoNombre}_size`];
            
            newAssignments[assignmentIndex].detalle = updatedData;
            setFormData({ ...formData, assignments: newAssignments });
            toast.info("Archivo quitado.");
            return;
        }

        if (!window.confirm("¿Seguro que deseas eliminar este archivo?")) return;
        
        try {
            if (adjuntoId) {
                await api.delete(`/api/solicitudes/adjuntos/${adjuntoId}`);
            }
            
            const newAssignments = [...formData.assignments];
            const currentData = typeof newAssignments[assignmentIndex].detalle === 'object' && newAssignments[assignmentIndex].detalle !== null
                ? newAssignments[assignmentIndex].detalle
                : {};
                
            const updatedData = { ...currentData };
            delete updatedData[campoNombre];
            delete updatedData[`${campoNombre}_filename`];
            delete updatedData[`${campoNombre}_id`];
            delete updatedData[`${campoNombre}_size`];
            
            newAssignments[assignmentIndex].detalle = updatedData;
            setFormData({ ...formData, assignments: newAssignments });
            toast.success("Archivo eliminado");
        } catch (err) {
            console.error("Error al eliminar archivo dinámico", err);
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
                const normStatus = initialData.status ? initialData.status.toLowerCase() : 'pendiente';
                // Evitar re-setear si el ID es el mismo para no romper la experiencia del usuario si el padre re-renderiza
                setFormData(prev => {
                    if (prev.id === initialData.id && prev.status === normStatus) {
                         return prev;
                    }
                    return {
                        ...initialData,
                        status: normStatus,
                        type: initialData.type || ((initialData.amount !== undefined && initialData.amount !== null) ? 'SUBSIDIO' : ((initialData.asistencia !== undefined && initialData.asistencia !== null) ? 'AGENDA' : (configId ? 'SUBSIDIO' : 'PEDIDO'))),
                        person: initialData.person || { name: '', phone: '' },
                        locationName: initialData.location?.type === 'NEIGHBORHOOD' ? (initialData.location?.parent?.name || '') : (initialData.location?.name || ''),
                        barrio: initialData.location?.type === 'NEIGHBORHOOD' ? (initialData.location?.name || '') : '',
                        responsableId: initialData.responsable?.id || '',
                        amount: initialData.amount || '',
                        grantDate: formatDateISO(initialData.grantDate),
                        subsidioType: initialData.subsidioType || '',
                        zone: initialData.zone || initialData.responsable?.zone || '',
                        contactDate: formatDateISO(initialData.contactDate),
                        resolutionDate: formatDateISO(initialData.resolutionDate),
                        entryDate: formatDateISO(initialData.entryDate),
                        observation: initialData.observation || '',
                        resolution: initialData.resolution || '',
                        suggestedResolutionType: initialData.suggestedResolutionType || '',
                        resolutionApproved: initialData.resolutionApproved || false,
                        detail: initialData.detail || '',
                        firstContactControl: initialData.firstContactControl || false,
                        origin: initialData.origin || 'MANUAL',
                        asistencia: initialData.asistencia || '',
                        porDonde: initialData.porDonde || '',
                        googleEventId: initialData.googleEventId || '',
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
                                detalle: parsedDetalle,
                                approved: a.approved || false,
                                observaciones: a.observaciones || ''
                            };
                        }) || []
                    };
                });
                setSelectedZone(initialData.zone || initialData.responsable?.zone || '');
                setAsistencia(initialData.asistencia || '');
                if (initialData.person?.id) {
                    api.get(`/api/persons/${initialData.person.id}/stats`)
                        .then(res => setSelectedPersonStats(res.data))
                        .catch(() => setSelectedPersonStats(null));
                } else {
                    setSelectedPersonStats(null);
                }
                setDniCollision(null);
            } else {
                setSelectedPersonStats(null);
                setDniCollision(null);
                const myRespId = isResponsable ? (user?.responsable?.id || user?.id || '') : '';
                const myZone = isResponsable ? (user?.responsable?.zone || user?.zone || '') : '';
                setFormData({
                    type: configId ? (configId.toString() === '1' ? 'AGENDA' : 'SUBSIDIO') : 'PEDIDO',
                    description: '',
                    status: 'pendiente',
                    origin: 'MANUAL',
                    entryDate: new Date().toISOString().split('T')[0],
                    person: { name: '', phone: '' },
                    locationName: 'Santa Fe',
                    barrio: '',
                    responsableId: myRespId,
                    amount: '',
                    grantDate: '',
                    subsidioType: '',
                    zone: myZone,
                    contactDate: '',
                    resolutionDate: '',
                    observation: '',
                    resolution: '',
                    suggestedResolutionType: '',
                    resolutionApproved: false,
                    detail: '',
                    firstContactControl: false,
                    asistencia: '',
                    porDonde: '',
                    googleEventId: '',
                    assignments: []
                });
                setSelectedZone(myZone);
                setAsistencia('');
                setActiveTab('detalles');
                setPendingDynamicFiles({});
                setPendingGeneralFiles([]);
                setSaveProgress('');
            }
        } else {
            // Cuando se cierra, limpiamos el formulario para asegurar que la próxima apertura cargue datos frescos del backend
            setFormData({
                type: 'PEDIDO',
                description: '',
                status: 'pendiente',
                origin: 'MANUAL',
                entryDate: new Date().toISOString().split('T')[0],
                person: { name: '', phone: '' },
                locationName: 'Santa Fe',
                barrio: '',
                responsableId: '',
                amount: '',
                grantDate: '',
                subsidioType: '',
                zone: '',
                contactDate: '',
                resolutionDate: '',
                observation: '',
                resolution: '',
                suggestedResolutionType: '',
                resolutionApproved: false,
                detail: '',
                firstContactControl: false,
                asistencia: '',
                porDonde: '',
                googleEventId: '',
                assignments: []
            });
            setSelectedZone('');
            setAsistencia('');
            setActiveTab('detalles');
            setPendingDynamicFiles({});
            setPendingGeneralFiles([]);
            setSaveProgress('');
        }
    }, [isOpen, initialData?.id, fetchResponsables, fetchLocations, fetchTiposResolucion, isResponsable, user?.responsable?.id, user?.responsable?.zone, user?.id, user?.zone]);

    // Computar listas dinámicas con resiliencia ante demoras de red
    const sourceLocations = locations.length > 0 ? locations : (cachedLocations.length > 0 ? cachedLocations : DEFAULT_CITIES);
    const citiesFromSource = sourceLocations.filter(l => l.type?.toUpperCase() === 'CITY' || l.type?.toUpperCase() === 'LOCALITY');
    const availableCities = citiesFromSource.length > 0 ? citiesFromSource : DEFAULT_CITIES;
    const selectedCity = availableCities.find(c => c.name.toLowerCase() === (formData.locationName || '').trim().toLowerCase());
    const availableNeighborhoods = selectedCity
        ? [
            ...locations.filter(l => {
                if (l.type !== 'NEIGHBORHOOD' || !l.parent) return false;
                const parentId = typeof l.parent === 'object' ? l.parent.id : l.parent;
                return parentId === selectedCity.id;
            }),
            { id: 'OTRO', name: 'Otro' }
          ]
        : [{ id: 'OTRO', name: 'Otro' }];


    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        // Validaciones estrictas de campos obligatorios (Etapa 9)
        if (!formData.description || !formData.description.trim()) {
            toast.error("El detalle/descripción de la solicitud es obligatorio.");
            return;
        }
        if (!formData.type || !formData.type.trim()) {
            toast.error("El tipo de solicitud es obligatorio.");
            return;
        }
        if (!formData.person || !formData.person.name || !formData.person.name.trim()) {
            toast.error("El nombre del beneficiario/solicitante es obligatorio.");
            return;
        }
        if (!formData.person || !formData.person.phone || !formData.person.phone.trim()) {
            toast.error("El teléfono del beneficiario/solicitante es obligatorio.");
            return;
        }
        if (!formData.person || !formData.person.type || !formData.person.type.trim()) {
            toast.error("El tipo de solicitante es obligatorio.");
            return;
        }
        if (formData.person.type === 'Personal' && (!formData.person.subType || !formData.person.subType.trim())) {
            toast.error("El subtipo de solicitante es obligatorio para el tipo Personal.");
            return;
        }
        if (!formData.locationName || !formData.locationName.trim()) {
            toast.error("La localidad es obligatoria.");
            return;
        }
        const validCity = availableCities.some(c => c.name.toLowerCase() === (formData.locationName || '').trim().toLowerCase());
        if (!validCity) {
            toast.error("La localidad ingresada no es válida. Debe elegir una de la lista.");
            return;
        }
        if (!formData.barrio || !formData.barrio.trim()) {
            toast.error("El barrio es obligatorio.");
            return;
        }
        const validBarrio = availableNeighborhoods.some(n => {
            const entered = (formData.barrio || '').trim().toLowerCase();
            const official = n.name.toLowerCase();
            return official === entered || 
                   (entered === 'candioti' && (official === 'candioti norte' || official === 'candioti sur')) ||
                   official.startsWith(entered) || 
                   entered.startsWith(official);
        });
        if (!validBarrio) {
            toast.error("El barrio ingresado no es válido. Debe elegir una de la lista oficial.");
            return;
        }
        if (user?.role !== 'OPERADOR' && user?.role !== 'DISTRIBUIDOR' && formData.id && !formData.responsableId) {
            toast.error("El responsable de la solicitud es obligatorio.");
            return;
        }
        if (formData.type === 'SUBSIDIO') {
            if (!formData.amount || Number(formData.amount) <= 0) {
                toast.error("El monto solicitado es obligatorio y debe ser mayor que cero.");
                return;
            }
            if (!formData.grantDate) {
                toast.error("La fecha de otorgamiento es obligatoria.");
                return;
            }
            if (!formData.subsidioType || !formData.subsidioType.trim()) {
                toast.error("El tipo de subsidio es obligatorio.");
                return;
            }
        }

        // Validación estricta de campos obligatorios para asignaciones de tipo AGENDA (Etapa 11)
        for (const a of (formData.assignments || [])) {
            if (a.tipoResolucion === 'AGENDA') {
                const det = typeof a.detalle === 'object' && a.detalle !== null ? a.detalle : {};
                if (!det['Tipo de actividad'] || !det['Tipo de actividad'].trim()) {
                    toast.error("El campo 'Tipo de actividad' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Organizada por nosotros?'] || !det['Organizada por nosotros?'].trim()) {
                    toast.error("El campo 'Organizada por nosotros?' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Descripción/temario'] || !det['Descripción/temario'].trim()) {
                    toast.error("El campo 'Descripción/temario' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Asistentes'] || !det['Asistentes'].trim()) {
                    toast.error("El campo 'Asistentes' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Declaración de interés'] || !det['Declaración de interés'].trim()) {
                    toast.error("El campo 'Declaración de interés' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Aporte?'] || !det['Aporte?'].trim()) {
                    toast.error("El campo 'Aporte?' en Agenda es obligatorio.");
                    return;
                }
                if (det['Aporte?'] === 'si' && (!det['Descripción/monto'] || !det['Descripción/monto'].trim())) {
                    toast.error("El campo 'Descripción/monto' en Agenda es obligatorio cuando hay aporte.");
                    return;
                }
                if (!det['Día'] || !det['Día'].trim()) {
                    toast.error("El campo 'Día' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Hora'] || !det['Hora'].trim()) {
                    toast.error("El campo 'Hora' en Agenda es obligatorio.");
                    return;
                }
                const locAgenda = det['Lugar - Localidad'] || formData.locationName;
                if (!locAgenda || !locAgenda.trim()) {
                    toast.error("El campo 'Lugar - Localidad' en Agenda es obligatorio.");
                    return;
                }
                const barAgenda = det['Lugar - Barrio'] || formData.barrio;
                if (!barAgenda || !barAgenda.trim()) {
                    toast.error("El campo 'Lugar - Barrio' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Responsable'] || !det['Responsable'].trim()) {
                    toast.error("El campo 'Responsable' en Agenda es obligatorio.");
                    return;
                }
                if (!det['Observación'] || !det['Observación'].trim()) {
                    toast.error("El campo 'Observación' en Agenda es obligatorio.");
                    return;
                }
            }

            // Validación estricta de campos obligatorios para asignaciones de tipo DECLARACION DE INTERES (Etapa 11)
            if (a.tipoResolucion === 'DECLARACION DE INTERES' || a.tipoResolucion === 'DECLARACIÓN DE INTERÉS') {
                const det = typeof a.detalle === 'object' && a.detalle !== null ? a.detalle : {};
                if (!det['Nombre completo del evento'] || !det['Nombre completo del evento'].trim()) {
                    toast.error("El campo 'Nombre completo del evento' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Actividad'] || !det['Actividad'].trim()) {
                    toast.error("El campo 'Actividad' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Institución a declarar'] || !det['Institución a declarar'].trim()) {
                    toast.error("El campo 'Institución a declarar' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Tipo'] || !det['Tipo'].trim()) {
                    toast.error("El campo 'Tipo' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Descripción'] || !det['Descripción'].trim()) {
                    toast.error("El campo 'Descripción' en Declaración de Interés es obligatorio.");
                    return;
                }
                const locDec = det['Localidad'] || formData.locationName;
                if (!locDec || !locDec.trim()) {
                    toast.error("El campo 'Localidad' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Fecha'] || !det['Fecha'].trim()) {
                    toast.error("El campo 'Fecha' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Dirección'] || !det['Dirección'].trim()) {
                    toast.error("El campo 'Dirección' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Fundamentos'] || !det['Fundamentos'].trim()) {
                    toast.error("El campo 'Fundamentos' en Declaración de Interés es obligatorio.");
                    return;
                }
                if (!det['Responsable'] || !det['Responsable'].trim()) {
                    toast.error("El campo 'Responsable' en Declaración de Interés es obligatorio.");
                    return;
                }
            }
        }

        setLoading(true);
        try {
            // Limpiar asignaciones: filtrar vacías y serializar el detalle
            const assignments = formData.assignments
                .filter(a => a.resolutorEmail && a.tipoResolucion)
                .map(a => {
                    let detalleFinal = a.detalle;
                    if (typeof a.detalle === 'object' && a.detalle !== null) {
                        const copy = { ...a.detalle };
                        if (a.tipoResolucion === 'AGENDA') {
                            if (!copy['Lugar - Localidad'] && formData.locationName) {
                                copy['Lugar - Localidad'] = formData.locationName;
                            }
                            if (!copy['Lugar - Barrio'] && formData.barrio) {
                                copy['Lugar - Barrio'] = formData.barrio;
                            }
                        }
                        if (a.tipoResolucion === 'SUBSIDIO' || a.tipoResolucion === 'DECLARACION DE INTERES' || a.tipoResolucion === 'DECLARACIÓN DE INTERÉS') {
                            if (!copy['Localidad'] && formData.locationName) {
                                copy['Localidad'] = formData.locationName;
                            }
                        }
                        detalleFinal = JSON.stringify(copy);
                    }
                    return {
                        ...a,
                        detalle: detalleFinal || ''
                    };
                });

            let newId = null;
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
                    zone: formData.zone || selectedZone || null,
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
                    subsidioType: formData.subsidioType || null,
                    assignments
                };
                await api.put(`/api/solicitudes/${formData.id}`, updatePayload);
            } else {
                // POST mantiene el formato original con polimorfismo (entidad completa)
                const createPayload = {
                    ...formData,
                    zone: formData.zone || selectedZone || null,
                    responsable: formData.responsableId ? { id: Number(formData.responsableId) } : null,
                    assignments
                };
                const response = await api.post('/api/solicitudes', createPayload);
                newId = response.data?.id;
            }

            // PROCESAR ARCHIVOS PENDIENTES SI SE ACABA DE CREAR LA SOLICITUD
            const hasPendingGeneral = !formData.id && pendingGeneralFiles.length > 0;
            const hasPendingDynamic = !formData.id && Object.keys(pendingDynamicFiles).length > 0;

            if (newId && (hasPendingGeneral || hasPendingDynamic)) {
                setSaveProgress("Subiendo archivos adjuntos...");
                
                // 1. Subir archivos generales pendientes
                for (const file of pendingGeneralFiles) {
                    const fd = new FormData();
                    fd.append('file', file);
                    try {
                        await api.post(`/api/solicitudes/${newId}/adjuntos`, fd, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } catch (uploadErr) {
                        console.error("Error subiendo adjunto general pendiente", uploadErr);
                    }
                }

                // 2. Subir archivos dinámicos pendientes y actualizar asignaciones
                if (hasPendingDynamic) {
                    const updatedAssignments = [...assignments];
                    for (const [key, file] of Object.entries(pendingDynamicFiles)) {
                        const [asgnIdxStr, campoNombre] = key.split('_');
                        const asgnIdx = parseInt(asgnIdxStr, 10);
                        if (!isNaN(asgnIdx) && updatedAssignments[asgnIdx]) {
                            const fd = new FormData();
                            fd.append('file', file);
                            try {
                                const resAdjunto = await api.post(`/api/solicitudes/${newId}/adjuntos`, fd, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                let detObj = {};
                                try {
                                    detObj = JSON.parse(updatedAssignments[asgnIdx].detalle || '{}');
                                } catch (_) {
                                    detObj = {};
                                }
                                detObj[campoNombre] = `/api/solicitudes/adjuntos/${resAdjunto.data.id}/download`;
                                detObj[`${campoNombre}_filename`] = resAdjunto.data.originalFileName;
                                detObj[`${campoNombre}_id`] = resAdjunto.data.id;
                                updatedAssignments[asgnIdx].detalle = JSON.stringify(detObj);
                            } catch (uploadErr) {
                                console.error(`Error subiendo archivo dinámico ${campoNombre}`, uploadErr);
                            }
                        }
                    }

                    // Sincronizar asignaciones con las URLs definitivas de los archivos subidos
                    try {
                        const syncPayload = {
                            type: formData.type,
                            description: formData.description,
                            status: formData.status,
                            origin: formData.origin,
                            entryDate: formData.entryDate || null,
                            person: formData.person,
                            locationName: formData.locationName,
                            barrio: formData.barrio,
                            zone: formData.zone || selectedZone || null,
                            responsableId: formData.responsableId ? Number(formData.responsableId) : 0,
                            amount: formData.amount ? Number(formData.amount) : null,
                            grantDate: formData.grantDate || null,
                            subsidioType: formData.subsidioType || null,
                            assignments: updatedAssignments
                        };
                        await api.put(`/api/solicitudes/${newId}`, syncPayload);
                    } catch (syncErr) {
                        console.error("Error sincronizando asignaciones con adjuntos subidos", syncErr);
                    }
                }
            }

            toast.success(formData.id ? "Solicitud actualizada con éxito" : `¡Solicitud #${newId} y adjuntos guardados con éxito!`);
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error saving solicitud", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || (typeof err.response?.data === 'string' ? err.response?.data : "Error al guardar la solicitud");
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleAprobar = async () => {
        // Validaciones estrictas de campos nuevos al resolver como AGENDA
        if (myAssignment?.tipoResolucion === 'AGENDA') {
            if (!asistencia || !asistencia.trim()) {
                toast.error("La selección de asistencia es obligatoria.");
                return;
            }
            if (createCalendarEvent) {
                if (!calendarTitle || !calendarTitle.trim()) {
                    toast.error("El título del evento en el calendario es obligatorio.");
                    return;
                }
                if (!calendarDate) {
                    toast.error("La fecha del evento en el calendario es obligatoria.");
                    return;
                }
                if (!calendarLocation || !calendarLocation.trim()) {
                    toast.error("La ubicación del evento en el calendario es obligatoria.");
                    return;
                }
            }
        }

        if (!approveObservations || !approveObservations.trim()) {
            toast.error("Las observaciones de la resolución son obligatorias.");
            return;
        }

        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${formData.id}/aprobar`, { 
                observaciones: approveObservations,
                asistencia: myAssignment?.tipoResolucion === 'AGENDA' ? asistencia : undefined,
                createEvent: createCalendarEvent ? 'true' : 'false',
                title: calendarTitle,
                date: calendarDate,
                time: calendarTime,
                location: calendarLocation,
                description: calendarDescription,
                guestEmails: createCalendarEvent ? selectedGuests : []
            });
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

    // Cargar invitados frecuentes de Agenda al habilitar la creación del evento (CDU-15)
    useEffect(() => {
        if (createCalendarEvent && availableGuests.length === 0) {
            const endpoint = configId ? `/api/config/${configId}/guests` : '/api/config/agenda/guests';
            api.get(endpoint)
                .then(res => {
                    const guests = res.data || [];
                    setAvailableGuests(guests);
                    // Por defecto preseleccionamos a todos los contactos frecuentes configurados
                    setSelectedGuests(guests.map(g => g.email));
                })
                .catch(err => {
                    console.error('Error cargando invitados para evento de agenda:', err);
                });
        }
    }, [createCalendarEvent, configId]);

    useEffect(() => {
        if (showApproveConfirm && (myAssignment?.tipoResolucion === 'AGENDA' || formData.type === 'AGENDA')) {
            const beneficiario = formData.person?.name || "Sin Beneficiario";
            setCalendarTitle(`SGP Agenda #${formData.id} - ${beneficiario}`);
            setCalendarDate(formData.resolutionDate || new Date().toISOString().split('T')[0]);
            setCalendarTime('');
            
            let loc = formData.locationName || '';
            if (formData.barrio) {
                loc += (loc ? ', ' : '') + `Barrio: ${formData.barrio}`;
            }
            setCalendarLocation(loc);
            
            const desc = `Detalle del Caso: ${formData.description || 'Sin descripción'}\nObservaciones de la Resolución: ${approveObservations || 'Sin observaciones'}\nAsistencia Registrada: ${asistencia || 'No especificada'}`;
            setCalendarDescription(desc);
        }
    }, [showApproveConfirm, myAssignment?.tipoResolucion, formData.type, formData.id, formData.person, formData.resolutionDate, formData.locationName, formData.barrio, formData.description, approveObservations, asistencia]);

    // Computar zonas únicas de responsables
    const uniqueZones = [...new Set(responsables.map(r => r.zone).filter(Boolean))].sort();

    // Filtrar responsables por zona seleccionada
    const filteredResponsables = selectedZone
        ? responsables.filter(r => r.zone === selectedZone)
        : [];

    if (!isOpen) return null;

    // Las declaraciones de myAssignment, myApprovedAssignment, isPendingResolutor e isApproveDisabled fueron movidas al inicio del componente para evitar ReferenceError.

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800/50">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clipboard className="text-indigo-500" />
                        {isReadOnly ? `Detalle de la Solicitud #${formData.id} (Solo Lectura)` : (formData.id ? `Editar Solicitud #${formData.id}` : 'Nueva Solicitud')}
                    </h2>
                    <button onClick={onClose} title="Cerrar" className="text-gray-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="flex border-b border-gray-700 px-6 bg-gray-900/20">
                    <button
                        type="button"
                        onClick={() => setActiveTab('detalles')}
                        className={`px-4 py-3 font-bold text-sm tracking-wide ${activeTab === 'detalles' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Formulario / Detalles
                    </button>
                    <button
                        type="button"
                        disabled={!formData.id}
                        onClick={() => setActiveTab('comentarios')}
                        title={!formData.id ? "Debe guardar la solicitud primero para escribir notas" : ""}
                        className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 transition-all ${
                            !formData.id 
                                ? 'text-gray-600 opacity-50 cursor-not-allowed' 
                                : activeTab === 'comentarios' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <MessageSquare className="h-4 w-4" /> Notas Seguimiento
                    </button>
                    <button
                        type="button"
                        disabled={!formData.id}
                        onClick={() => setActiveTab('historial')}
                        title={!formData.id ? "El historial estará disponible una vez guardada la solicitud" : ""}
                        className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 transition-all ${
                            !formData.id 
                                ? 'text-gray-600 opacity-50 cursor-not-allowed' 
                                : activeTab === 'historial' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <History className="h-4 w-4" /> Historial
                    </button>
                    <button
                        type="button"
                        disabled={!formData.id}
                        onClick={() => setActiveTab('adjuntos')}
                        title={!formData.id ? "Debe guardar la solicitud primero para subir adjuntos" : ""}
                        className={`px-4 py-3 font-bold text-sm tracking-wide flex items-center gap-2 transition-all ${
                            !formData.id 
                                ? 'text-gray-600 opacity-50 cursor-not-allowed' 
                                : activeTab === 'adjuntos' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'
                        }`}
                    >
                        <FileText className="h-4 w-4" /> Adjuntos
                    </button>
                </div>

                <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {activeTab === 'detalles' && (
                        <form onSubmit={handleSubmit} className="p-6">
                            <fieldset disabled={isReadOnly} className="space-y-6">
                            {!formData.id && (
                                <div className="bg-indigo-950/40 border border-indigo-800 rounded-xl p-3 text-xs text-indigo-300 text-center animate-in fade-in duration-300">
                                    📢 <strong>Nota:</strong> Guarde la solicitud primero para poder agregar adjuntos, notas de seguimiento o consultar el historial de auditoría.
                                </div>
                            )}
                            {/* Tipo y Estado */}
                            <div className="grid grid-cols-2 gap-4">
                                {!!formData.id && user?.role !== 'DISTRIBUIDOR' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                                        <select
                                            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                            value={formData.type}
                                            disabled={true}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="PEDIDO">Pedido</option>
                                            <option value="SUBSIDIO">Subsidio</option>
                                            <option value="AGENDA">Agenda</option>
                                        </select>
                                    </div>
                                )}
                        {!!formData.id && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Estado</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="pendiente">Pendiente</option>
                                    <option value="en proceso">Asignadas</option>
                                    <option value="en resolucion">En Resolución</option>
                                    <option value="completadas">Resueltas</option>
                                    <option value="rechazada">Rechazado</option>
                                    {/* Renderizar la opción 'Consideración' solo para usuarios autorizados (Administrador, Responsable o Resolutor de Subsidio) o si el estado actual ya es 'consideracion' */}
                                    {canPonerConsideracion && (
                                        <option value="consideracion">Consideración</option>
                                    )}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Datos de la Persona */}
                    <div className="space-y-4 p-4 bg-gray-900/40 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <UserIcon className="h-4 w-4 text-indigo-400" /> Solicitante
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <PersonAutocomplete
                                    value={formData.person.name}
                                    placeholder="Buscar por nombre o DNI (Autocompletado inteligente)..."
                                    required
                                    label="Nombre Completo / Institución"
                                    selectedPerson={selectedPersonStats || formData.person}
                                    showStatsBadge={true}
                                    onChange={(val) => setFormData({ ...formData, person: { ...formData.person, name: val } })}
                                    onSelect={(p) => {
                                        const newLocation = p.locationName || formData.locationName;
                                        setFormData({
                                            ...formData,
                                            person: {
                                                ...formData.person,
                                                id: p.id,
                                                name: p.name,
                                                phone: p.phone || formData.person.phone,
                                                dni: p.dni || formData.person.dni,
                                                type: p.type || formData.person.type,
                                                subType: p.subType || formData.person.subType
                                            },
                                            locationName: newLocation
                                        });
                                        setSelectedPersonStats(p);
                                        setDniCollision(null);
                                    }}
                                    onClear={() => {
                                        setFormData({
                                            ...formData,
                                            person: { ...formData.person, id: null, name: '' }
                                        });
                                        setSelectedPersonStats(null);
                                        setDniCollision(null);
                                    }}
                                />
                            </div>

                            {/* Alerta interactiva de Inconsistencia por DNI (CDU-08) */}
                            {dniCollision && (
                                <div className="md:col-span-2 p-3.5 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2 animate-in fade-in duration-200">
                                    <div className="flex items-start gap-2.5">
                                        <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                                        <div className="text-xs text-amber-200">
                                            <p className="font-bold text-amber-300">Detección de Inconsistencia por DNI</p>
                                            <p className="mt-0.5">
                                                El DNI ingresado (<strong>{dniCollision.dni}</strong>) ya pertenece a <strong>{dniCollision.name}</strong> en el sistema. ¿Desea utilizar sus datos registrados?
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => setDniCollision(null)}
                                            className="px-3 py-1 text-xs text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                                        >
                                            Mantener datos actuales
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setFormData({
                                                    ...formData,
                                                    person: {
                                                        ...formData.person,
                                                        id: dniCollision.id,
                                                        name: dniCollision.name,
                                                        phone: dniCollision.phone || formData.person.phone,
                                                        dni: dniCollision.dni,
                                                        type: dniCollision.type || formData.person.type,
                                                        subType: dniCollision.subType || formData.person.subType
                                                    },
                                                    locationName: dniCollision.locationName || formData.locationName
                                                });
                                                setSelectedPersonStats(dniCollision);
                                                setDniCollision(null);
                                                toast.success(`Datos actualizados con la ficha de ${dniCollision.name}`);
                                            }}
                                            className="px-3.5 py-1 text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-lg shadow transition-colors"
                                        >
                                            Sí, utilizar datos de {dniCollision.name}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm text-gray-500 mb-1">DNI (Documento)</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 34567890"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.person.dni || ''}
                                    onChange={(e) => setFormData({ ...formData, person: { ...formData.person, dni: e.target.value } })}
                                    onBlur={handleDniBlur}
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
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Tipo Solicitante</label>
                                <select
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.person.type || ''}
                                    onChange={(e) => setFormData({ ...formData, person: { ...formData.person, type: e.target.value, subType: '' } })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Club">Club</option>
                                    <option value="Iglesia">Iglesia</option>
                                    <option value="Escuela">Escuela</option>
                                    <option value="Gobierno Local">Gobierno Local</option>
                                    <option value="ONGs">ONGs</option>
                                    <option value="Grupo social">Grupo social</option>
                                    <option value="Comedor/Merendero">Comedor/Merendero</option>
                                    <option value="Personal">Personal</option>
                                </select>
                            </div>
                            {formData.person.type === 'Personal' && (
                                <div>
                                    <label className="block text-sm text-gray-500 mb-1">Subtipo</label>
                                    <select
                                        className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={formData.person.subType || ''}
                                        onChange={(e) => setFormData({ ...formData, person: { ...formData.person, subType: e.target.value } })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        <option value="joven">Joven</option>
                                        <option value="emprendedor">Emprendedor</option>
                                        <option value="referente">Referente</option>
                                        <option value="otro">Otro</option>
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 p-4 bg-gray-900/40 rounded-xl border border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-indigo-400" /> Ubicación
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Localidad</label>
                                <select
                                    required
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                    value={formData.locationName}
                                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value, barrio: '' })} // Reset barrio al cambiar ciudad
                                >
                                    <option value="">Seleccione Localidad...</option>
                                    {availableCities.map(c => (
                                        <option key={c.id} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Barrio</label>
                                <select
                                    required
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                    value={formData.barrio}
                                    onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                                    disabled={!formData.locationName}
                                >
                                    <option value="">{selectedCity ? "Seleccione Barrio..." : "Primero elija localidad"}</option>
                                    {availableNeighborhoods.map(n => (
                                        <option key={n.id} value={n.name}>{n.name}</option>
                                    ))}
                                </select>
                            </div>
                            {user?.role !== 'OPERADOR' && user?.role !== 'DISTRIBUIDOR' && (
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
                            )}
                        </div>
                    </div>

                    {/* Descripción de la Solicitud */}
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

                    {/* Campo de Origen */}
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
                            <option value="INSTAGRAM">Instagram</option>
                            <option value="FACEBOOK">Facebook</option>
                            <option value="OTRO">Otro</option>
                            <option value="PHONE">Teléfono</option>
                            <option value="EMAIL">Email</option>
                        </select>
                    </div>

                    {/* Campos específicos de Agenda para visualización de solo lectura */}
                    {formData.type === 'AGENDA' && formData.asistencia && (
                        <div className="p-4 bg-indigo-950/40 border border-indigo-850 rounded-xl animate-in slide-in-from-top-2">
                            <span className="text-xs font-semibold text-indigo-400 uppercase tracking-widest block mb-1">Asistencia de la Agenda</span>
                            <div className="text-sm font-bold text-white uppercase flex items-center gap-2">
                                <Check className="h-4 w-4 text-emerald-500" />
                                {formData.asistencia}
                            </div>
                        </div>
                    )}

                    {/* Campos específicos de Subsidio */}
                    {formData.type === 'SUBSIDIO' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in slide-in-from-top-2 p-4 bg-emerald-900/20 rounded-xl border border-emerald-800/50">
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1 flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" /> Monto
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
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
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={formData.grantDate}
                                    onChange={(e) => setFormData({ ...formData, grantDate: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-emerald-400 mb-1 flex items-center gap-1">
                                    <LayoutDashboard className="h-3 w-3" /> Tipo Subsidio
                                </label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={formData.subsidioType || ''}
                                    onChange={(e) => setFormData({ ...formData, subsidioType: e.target.value })}
                                >
                                    <option value="">Seleccionar...</option>
                                    <option value="Culturales">Culturales</option>
                                    <option value="Deportes">Deportes</option>
                                    <option value="Viajes">Viajes</option>
                                    <option value="Emprendimientos">Emprendimientos</option>
                                    <option value="Subsistencia">Subsistencia</option>
                                    <option value="Otros">Otros</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Fechas y Seguimiento */}
                    <div className={`grid gap-4 ${user?.role !== 'OPERADOR' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Fecha de Ingreso</label>
                            <input
                                type="date"
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                value={formData.entryDate}
                                onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                            />
                        </div>
                        {user?.role !== 'OPERADOR' && (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Zona Territorial</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                        value={selectedZone}
                                        disabled={isResponsable}
                                        onChange={(e) => {
                                            const z = e.target.value;
                                            setSelectedZone(z);
                                            // Al cambiar la zona, limpiamos el responsable anterior en formData
                                            setFormData(prev => ({ 
                                                ...prev, 
                                                responsableId: '',
                                                zone: z
                                            }));
                                        }}
                                    >
                                        <option value="">Seleccionar Zona...</option>
                                        {uniqueZones.map(z => (
                                            <option key={z} value={z}>{z}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Responsable</label>
                                    <select
                                        className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                                        value={formData.responsableId}
                                        disabled={isResponsable || !selectedZone}
                                        onChange={(e) => {
                                            const respId = e.target.value;
                                            const selectedResp = responsables.find(r => r.id.toString() === respId.toString());
                                            setFormData({ 
                                                ...formData, 
                                                responsableId: respId,
                                                zone: selectedResp ? (selectedResp.zone || selectedZone) : selectedZone
                                            });
                                        }}
                                    >
                                        <option value="">-- Sin Asignar (Pool de Zona) --</option>
                                        {filteredResponsables.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                    </div>

                    {user?.role !== 'OPERADOR' && user?.role !== 'DISTRIBUIDOR' && (
                        <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700 space-y-4">
                            <h3 className="text-sm font-semibold text-gray-300">Seguimiento</h3>

                            {myApprovedAssignment && (
                                <div className="bg-emerald-900/40 p-4 rounded-xl border border-emerald-700/50 flex flex-col gap-1">
                                    <span className="text-sm font-bold text-emerald-400">✅ Resolución Finalizada</span>
                                    {myApprovedAssignment.observaciones && (
                                        <p className="text-xs text-emerald-200 italic">"{myApprovedAssignment.observaciones}"</p>
                                    )}
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-1">
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
                    )}

                    {/* Sección de Asignaciones Múltiples (Resolutores) */}
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
                                                    let currentDet = typeof assignment.detalle === 'object' && assignment.detalle !== null ? { ...assignment.detalle } : {};
                                                    if (type === 'AGENDA') {
                                                        if (!currentDet['Lugar - Localidad'] && formData.locationName) {
                                                            currentDet['Lugar - Localidad'] = formData.locationName;
                                                        }
                                                        if (!currentDet['Lugar - Barrio'] && formData.barrio) {
                                                            currentDet['Lugar - Barrio'] = formData.barrio;
                                                        }
                                                    }
                                                    if (type === 'DECLARACION DE INTERES' || type === 'DECLARACIÓN DE INTERÉS' || type === 'SUBSIDIO') {
                                                        if (!currentDet['Localidad'] && formData.locationName) {
                                                            currentDet['Localidad'] = formData.locationName;
                                                        }
                                                        if (type === 'SUBSIDIO' && currentDet['Tipo de pedido'] === 'Personal') {
                                                            if (!currentDet['Nombre y apellido'] && formData.person?.name) {
                                                                currentDet['Nombre y apellido'] = formData.person.name;
                                                            }
                                                            if (!currentDet['DNI'] && formData.person?.dni) {
                                                                currentDet['DNI'] = formData.person.dni;
                                                            }
                                                            if (!currentDet['Teléfono'] && formData.person?.phone) {
                                                                currentDet['Teléfono'] = formData.person.phone;
                                                            }
                                                        }
                                                    }
                                                    newAssignments[index] = { 
                                                        ...assignment, 
                                                        tipoResolucion: type,
                                                        resolutorEmail: config?.resolutor?.email || '',
                                                        detalle: currentDet
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
                                                        const currentData = typeof assignment.detalle === 'object' && assignment.detalle !== null ? { ...assignment.detalle } : {};
                                                    if (assignment.tipoResolucion === 'AGENDA') {
                                                        if (!currentData['Lugar - Localidad'] && formData.locationName) {
                                                            currentData['Lugar - Localidad'] = formData.locationName;
                                                        }
                                                        if (!currentData['Lugar - Barrio'] && formData.barrio) {
                                                            currentData['Lugar - Barrio'] = formData.barrio;
                                                        }
                                                    }
                                                    if (assignment.tipoResolucion === 'DECLARACION DE INTERES' || assignment.tipoResolucion === 'DECLARACIÓN DE INTERÉS' || assignment.tipoResolucion === 'SUBSIDIO') {
                                                        if (!currentData['Localidad'] && formData.locationName) {
                                                            currentData['Localidad'] = formData.locationName;
                                                        }
                                                    }
                                                    return (
                                                        <div className="space-y-4 p-4 bg-gray-800/80 border border-gray-600 rounded-lg shadow-inner">
                                                            {sortedCampos.map(ac => {
                                                                const campo = ac.atributo;

                                                                // Lógica condicional específica para SUBSIDIO
                                                                if (assignment.tipoResolucion === 'SUBSIDIO') {
                                                                    const tipoPedido = currentData['Tipo de pedido'] || '';
                                                                    const camposPersonal = [
                                                                        'Nombre y apellido', 'DNI', 'Teléfono', 'Compañía', 'Dirección de DNI',
                                                                        'DNI frente', 'DNI dorso', 'Constancia de CBU'
                                                                    ];
                                                                    const camposInstitucionalDinero = [
                                                                        'Dirección de institución', 'Localidad',
                                                                        'Responsable 1: Nombre', 'Responsable 1: DNI', 'Responsable 1: Cargo',
                                                                        'Responsable 2: Nombre', 'Responsable 2: DNI', 'Responsable 2: Cargo',
                                                                        'Nota de pedido'
                                                                    ];
                                                                    const camposInstitucionalEspecie = [
                                                                        'Fecha del evento', 'Descripción del monto y bienes solicitados'
                                                                    ];

                                                                    // Campos exclusivos de tipo Personal
                                                                    if (camposPersonal.includes(campo.nombre) && tipoPedido !== 'Personal') {
                                                                        return null;
                                                                    }
                                                                    // Nombre de institución es común a Institucional en dinero e Institucional en especie
                                                                    if (campo.nombre === 'Nombre de institución' && tipoPedido !== 'Institucional en dinero' && tipoPedido !== 'Institucional en especie') {
                                                                        return null;
                                                                    }
                                                                    // Campos exclusivos de Institucional en dinero
                                                                    if (camposInstitucionalDinero.includes(campo.nombre) && tipoPedido !== 'Institucional en dinero') {
                                                                        return null;
                                                                    }
                                                                    // Campos exclusivos de Institucional en especie
                                                                    if (camposInstitucionalEspecie.includes(campo.nombre) && tipoPedido !== 'Institucional en especie') {
                                                                        return null;
                                                                    }
                                                                    // En Institucional en especie, el monto y los bienes se describen en su campo específico
                                                                    if (campo.nombre === 'Monto' && tipoPedido === 'Institucional en especie') {
                                                                        return null;
                                                                    }
                                                                }

                                                                // Lógica condicional específica para AGENDA (Etapa 11)
                                                                if (assignment.tipoResolucion === 'AGENDA') {
                                                                    if (campo.nombre === 'Descripción/monto' && currentData['Aporte?'] !== 'si') {
                                                                        return null;
                                                                    }
                                                                }

                                                                // Campo de Localidad para SUBSIDIO: Input de texto libre con sugerencias mediante datalist
                                                                if (assignment.tipoResolucion === 'SUBSIDIO' && campo.nombre === 'Localidad') {
                                                                    const datalistId = `datalist-localidades-subsidio-${index}`;
                                                                    return (
                                                                        <div key={campo.id}>
                                                                            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                                                                                {campo.nombre} {ac.requerido && <span className="text-red-400">*</span>}
                                                                            </label>
                                                                            <input
                                                                                type="text"
                                                                                list={datalistId}
                                                                                placeholder="Escribir o seleccionar localidad..."
                                                                                value={currentData[campo.nombre] || ''}
                                                                                onChange={e => {
                                                                                    const newAssignments = [...formData.assignments];
                                                                                    newAssignments[index].detalle = { ...currentData, [campo.nombre]: e.target.value };
                                                                                    setFormData({ ...formData, assignments: newAssignments });
                                                                                }}
                                                                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none block disabled:opacity-50"
                                                                                disabled={!canEditThis}
                                                                            />
                                                                            <datalist id={datalistId}>
                                                                                {availableCities.map(c => (
                                                                                    <option key={c.id} value={c.name} />
                                                                                ))}
                                                                            </datalist>
                                                                        </div>
                                                                    );
                                                                }

                                                                // Desplegable de Localidad para AGENDA y DECLARACION DE INTERES
                                                                if (campo.nombre === 'Lugar - Localidad' || ((assignment.tipoResolucion === 'DECLARACION DE INTERES' || assignment.tipoResolucion === 'DECLARACIÓN DE INTERÉS') && campo.nombre === 'Localidad')) {
                                                                    return (
                                                                        <div key={campo.id}>
                                                                            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                                                                                {campo.nombre} {ac.requerido && <span className="text-red-400">*</span>}
                                                                            </label>
                                                                            <select
                                                                                value={currentData[campo.nombre] || ''}
                                                                                onChange={e => {
                                                                                    const newAssignments = [...formData.assignments];
                                                                                    const updated = { ...currentData, [campo.nombre]: e.target.value };
                                                                                    if (campo.nombre === 'Lugar - Localidad') {
                                                                                        updated['Lugar - Barrio'] = '';
                                                                                    }
                                                                                    newAssignments[index].detalle = updated;
                                                                                    setFormData({ ...formData, assignments: newAssignments });
                                                                                }}
                                                                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                                                disabled={!canEditThis}
                                                                            >
                                                                                <option value="">Seleccionar Localidad...</option>
                                                                                {availableCities.map(c => (
                                                                                    <option key={c.id} value={c.name}>{c.name}</option>
                                                                                ))}
                                                                            </select>
                                                                        </div>
                                                                    );
                                                                }

                                                                // Desplegable de Barrio para AGENDA
                                                                if (campo.nombre === 'Lugar - Barrio') {
                                                                    const agendaCityName = (currentData['Lugar - Localidad'] || '').trim().toLowerCase();
                                                                    const selectedAgendaCity = availableCities.find(c => c.name.toLowerCase() === agendaCityName);
                                                                    const agendaNeighborhoods = selectedAgendaCity ? locations.filter(l => {
                                                                        const parentId = typeof l.parent === 'object' ? l.parent?.id : l.parent;
                                                                        return l.type === 'NEIGHBORHOOD' && parentId === selectedAgendaCity.id;
                                                                    }) : [];

                                                                    return (
                                                                        <div key={campo.id}>
                                                                            <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                                                                                {campo.nombre} {ac.requerido && <span className="text-red-400">*</span>}
                                                                            </label>
                                                                            <select
                                                                                value={currentData['Lugar - Barrio'] || ''}
                                                                                onChange={e => {
                                                                                    const newAssignments = [...formData.assignments];
                                                                                    newAssignments[index].detalle = { ...currentData, 'Lugar - Barrio': e.target.value };
                                                                                    setFormData({ ...formData, assignments: newAssignments });
                                                                                }}
                                                                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
                                                                                disabled={!canEditThis || !agendaCityName}
                                                                            >
                                                                                <option value="">Seleccionar Barrio...</option>
                                                                                {agendaNeighborhoods.map(b => (
                                                                                    <option key={b.id} value={b.name}>{b.name}</option>
                                                                                ))}
                                                                                <option value="Otro">Otro</option>
                                                                            </select>
                                                                        </div>
                                                                    );
                                                                }

                                                                return (
                                                                <div key={campo.id}>
                                                                    <label className="block text-[11px] text-gray-400 mb-1 uppercase tracking-wider font-semibold">
                                                                        {campo.nombre} {ac.requerido && <span className="text-red-400">*</span>}
                                                                    </label>
                                                                    {campo.tipoDato === 'SELECT' ? (
                                                                        <select
                                                                            value={currentData[campo.nombre] || ''}
                                                                            onChange={e => {
                                                                                const val = e.target.value;
                                                                                const newDetalle = { ...currentData, [campo.nombre]: val };
                                                                                if (campo.nombre === 'Aporte?' && val !== 'si') {
                                                                                    delete newDetalle['Descripción/monto'];
                                                                                }
                                                                                // Precargar datos del solicitante si se selecciona tipo Personal en SUBSIDIO
                                                                                if (assignment.tipoResolucion === 'SUBSIDIO' && campo.nombre === 'Tipo de pedido' && val === 'Personal') {
                                                                                    if (!newDetalle['Nombre y apellido'] && formData.person?.name) {
                                                                                        newDetalle['Nombre y apellido'] = formData.person.name;
                                                                                    }
                                                                                    if (!newDetalle['DNI'] && formData.person?.dni) {
                                                                                        newDetalle['DNI'] = formData.person.dni;
                                                                                    }
                                                                                    if (!newDetalle['Teléfono'] && formData.person?.phone) {
                                                                                        newDetalle['Teléfono'] = formData.person.phone;
                                                                                    }
                                                                                }
                                                                                const newAssignments = [...formData.assignments];
                                                                                newAssignments[index].detalle = newDetalle;
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
                                                                    ) : campo.tipoDato === 'FILE' ? (
                                                                        <div className="mt-1 flex flex-col gap-2 p-3 bg-gray-900/40 border border-gray-700/50 rounded-lg">
                                                                            {currentData[campo.nombre] ? (
                                                                                <div className="flex items-center justify-between text-xs text-indigo-300">
                                                                                    {currentData[campo.nombre] === 'pending' ? (
                                                                                        <span className="font-semibold flex items-center gap-1.5 text-amber-300">
                                                                                            📎 {currentData[`${campo.nombre}_filename`] || 'Archivo seleccionado'}
                                                                                            <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
                                                                                                Listo para subir
                                                                                            </span>
                                                                                        </span>
                                                                                    ) : (
                                                                                        <a 
                                                                                            href={`${api.defaults.baseURL || ''}${currentData[campo.nombre]}`} 
                                                                                            target="_blank" 
                                                                                            rel="noopener noreferrer" 
                                                                                            className="font-bold underline flex items-center gap-1 hover:text-indigo-200"
                                                                                            title="Descargar/Ver archivo"
                                                                                            onClick={async (e) => {
                                                                                                e.preventDefault();
                                                                                                try {
                                                                                                    const res = await api.get(currentData[campo.nombre], { responseType: 'blob' });
                                                                                                    const url = window.URL.createObjectURL(new Blob([res.data]));
                                                                                                    const link = document.createElement('a');
                                                                                                    link.href = url;
                                                                                                    link.setAttribute('download', currentData[`${campo.nombre}_filename`] || 'archivo');
                                                                                                    document.body.appendChild(link);
                                                                                                    link.click();
                                                                                                    link.remove();
                                                                                                    setTimeout(() => window.URL.revokeObjectURL(url), 100);
                                                                                                } catch (err) {
                                                                                                    console.error("Error al descargar archivo dinámico", err);
                                                                                                    toast.error("Error al descargar archivo");
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            📎 {currentData[`${campo.nombre}_filename`] || 'Ver archivo'}
                                                                                        </a>
                                                                                    )}
                                                                                    {canEditThis && (
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => handleDynamicFileDelete(index, campo.nombre, currentData[`${campo.nombre}_id`])}
                                                                                            className="text-red-400 hover:text-red-300 font-semibold"
                                                                                        >
                                                                                            {currentData[campo.nombre] === 'pending' ? 'Quitar' : 'Eliminar'}
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            ) : (
                                                                                <div>
                                                                                    {uploadingFields[`${index}_${campo.nombre}`] ? (
                                                                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                                                                            <span className="animate-spin text-indigo-500">⏳</span> Subiendo archivo...
                                                                                        </div>
                                                                                    ) : (
                                                                                        <div className="flex items-center justify-between gap-2">
                                                                                            <input
                                                                                                type="file"
                                                                                                disabled={!canEditThis}
                                                                                                onChange={async (e) => {
                                                                                                    if (e.target.files && e.target.files.length > 0) {
                                                                                                        await handleDynamicFileUpload(index, campo.nombre, e.target.files[0]);
                                                                                                    }
                                                                                                }}
                                                                                                className="w-full text-xs text-gray-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600/30 file:text-indigo-300 hover:file:bg-indigo-600/40 disabled:opacity-50"
                                                                                            />
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ) : (() => {
                                                                        const nombreCampoNorm = (campo.nombre || '').toLowerCase();
                                                                        const esCampoPersona = (nombreCampoNorm.includes('responsable') && nombreCampoNorm.includes('nombre')) ||
                                                                                               nombreCampoNorm.includes('representante') ||
                                                                                               (nombreCampoNorm.includes('contacto') && !nombreCampoNorm.includes('fecha'));

                                                                        if (esCampoPersona) {
                                                                            return (
                                                                                <PersonAutocomplete
                                                                                    value={currentData[campo.nombre] || ''}
                                                                                    label=""
                                                                                    placeholder={`Buscar o ingresar ${campo.nombre}...`}
                                                                                    disabled={!canEditThis}
                                                                                    showStatsBadge={false}
                                                                                    onChange={val => {
                                                                                        const newAssignments = [...formData.assignments];
                                                                                        newAssignments[index].detalle = { ...currentData, [campo.nombre]: val };
                                                                                        setFormData({ ...formData, assignments: newAssignments });
                                                                                    }}
                                                                                    onSelect={p => {
                                                                                        const newAssignments = [...formData.assignments];
                                                                                        const updatedDetalle = { ...currentData, [campo.nombre]: p.name };
                                                                                        if (campo.nombre.includes('1') && p.dni) {
                                                                                            updatedDetalle['Responsable 1: DNI'] = p.dni;
                                                                                        } else if (campo.nombre.includes('2') && p.dni) {
                                                                                            updatedDetalle['Responsable 2: DNI'] = p.dni;
                                                                                        } else if (p.dni && updatedDetalle['DNI'] !== undefined) {
                                                                                            updatedDetalle['DNI'] = p.dni;
                                                                                        }
                                                                                        newAssignments[index].detalle = updatedDetalle;
                                                                                        setFormData({ ...formData, assignments: newAssignments });
                                                                                        toast.success(`Datos de ${p.name} autocompletados en ${campo.nombre}`);
                                                                                    }}
                                                                                    onClear={() => {
                                                                                        const newAssignments = [...formData.assignments];
                                                                                        newAssignments[index].detalle = { ...currentData, [campo.nombre]: '' };
                                                                                        setFormData({ ...formData, assignments: newAssignments });
                                                                                    }}
                                                                                />
                                                                            );
                                                                        }

                                                                        return (
                                                                            <input
                                                                                type={campo.tipoDato === 'DATE' || campo.nombre === 'Día' ? 'date' : (campo.tipoDato === 'TIME' || campo.nombre === 'Hora' ? 'time' : (campo.tipoDato === 'NUMBER' ? 'number' : 'text'))}
                                                                                value={currentData[campo.nombre] || ''}
                                                                                onChange={e => {
                                                                                    const newAssignments = [...formData.assignments];
                                                                                    newAssignments[index].detalle = { ...currentData, [campo.nombre]: e.target.value };
                                                                                    setFormData({ ...formData, assignments: newAssignments });
                                                                                }}
                                                                                className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none block disabled:opacity-50"
                                                                                disabled={!canEditThis}
                                                                            />
                                                                        );
                                                                    })()}
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
                                            {assignment.approved && (
                                                <div className="mt-2 p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-800/40 text-xs text-emerald-200">
                                                    <span className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                                                        ✔️ Aprobado y Agendado
                                                    </span>
                                                    {assignment.observaciones && (
                                                        <p className="text-[11px] text-emerald-100 italic">"{assignment.observaciones}"</p>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    )}
                    
                    {/* Carga rápida de adjuntos (Habilitada al crear y al editar) */}
                    <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700 mt-6 animate-in slide-in-from-bottom-2">
                        <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2 mb-3">
                            <FileText className="h-4 w-4 text-indigo-400" /> Adjuntos Rápidos
                        </h3>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-4">
                                <label className={`bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-lg font-bold cursor-pointer transition-colors flex items-center gap-2 text-sm ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <UploadCloud className="h-4 w-4" />
                                    {isUploading ? 'Subiendo...' : 'Seleccionar Archivo'}
                                    <input type="file" className="hidden" disabled={isUploading} onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            handleFileUpload(e.target.files[0]);
                                        }
                                    }} />
                                </label>
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <span className="font-bold text-white bg-gray-800 px-2 py-0.5 rounded">
                                        {formData.id ? adjuntos.length : pendingGeneralFiles.length}
                                    </span>
                                    {formData.id ? 'adjuntos guardados.' : 'archivo(s) seleccionado(s) listos para subir.'}
                                </span>
                            </div>

                            {/* Mostrar lista de archivos generales pendientes de subida al crear */}
                            {!formData.id && pendingGeneralFiles.length > 0 && (
                                <div className="space-y-1.5 mt-2 pt-2 border-t border-gray-800">
                                    {pendingGeneralFiles.map((file, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 bg-gray-800/60 rounded border border-gray-700 text-xs">
                                            <span className="text-indigo-300 font-medium flex items-center gap-1">
                                                📎 {file.name} <span className="text-gray-500">({(file.size / (1024 * 1024)).toFixed(2)} MB)</span>
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemovePendingGeneralFile(idx)}
                                                className="text-red-400 hover:text-red-300 font-bold px-2 py-0.5"
                                            >
                                                ✕ Quitar
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                            </fieldset>
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
                                                    <button type="button" onClick={() => handleViewInline(adj)} className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors" title="Visualizar">
                                                        <Eye className="h-4 w-4" />
                                                    </button>
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
                        {!isReadOnly && isPendingResolutor && (
                            <button
                                type="button"
                                onClick={() => setShowApproveConfirm(true)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                Aprobar Resolución
                            </button>
                        )}
                        {!isReadOnly && canTomar && (
                            <button
                                type="button"
                                onClick={handleTomar}
                                disabled={loading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2"
                                title="Tomar y auto-asignarme esta solicitud"
                            >
                                <UserCheck className="h-4 w-4" />
                                Tomar Solicitud
                            </button>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
                        >
                            {isReadOnly ? 'Cerrar' : 'Cancelar'}
                        </button>
                        {!isReadOnly && (
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-lg font-bold transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                            >
                                <Save className="h-4 w-4" />
                                {loading ? (saveProgress || 'Guardando...') : 'Guardar Solicitud'}
                            </button>
                        )}
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
                            {myAssignment?.tipoResolucion === 'AGENDA' && (
                                <div className="space-y-2 bg-gray-900/50 p-3 rounded-xl border border-gray-700">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest">Asistencia Obligatoria</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="asistencia"
                                                value="con asistencia"
                                                checked={asistencia === 'con asistencia'}
                                                onChange={(e) => setAsistencia(e.target.value)}
                                                className="text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-700"
                                            />
                                            <span className="text-sm text-gray-300">Con Asistencia</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="asistencia"
                                                value="sin asistencia"
                                                checked={asistencia === 'sin asistencia'}
                                                onChange={(e) => setAsistencia(e.target.value)}
                                                className="text-emerald-500 focus:ring-emerald-500 bg-gray-900 border-gray-700"
                                            />
                                            <span className="text-sm text-gray-300">Sin Asistencia</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {myAssignment?.tipoResolucion === 'AGENDA' && (
                                <div className="space-y-3 bg-blue-950/30 p-4 rounded-xl border border-blue-500/30">
                                    <label className="flex items-center gap-2 cursor-pointer mb-2">
                                        <input
                                            type="checkbox"
                                            checked={createCalendarEvent}
                                            onChange={(e) => setCreateCalendarEvent(e.target.checked)}
                                            className="w-4 h-4 text-blue-500 bg-gray-900 border-gray-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="text-sm font-bold text-blue-300 flex items-center gap-1">
                                            <Calendar className="h-4 w-4" /> Crear evento en Google Calendar
                                        </span>
                                    </label>

                                    {createCalendarEvent && (
                                        <div className="space-y-3 animate-in slide-in-from-top-2 duration-200 pl-6 border-l-2 border-blue-500/30">
                                            <div>
                                                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Título</label>
                                                <input
                                                    type="text"
                                                    value={calendarTitle}
                                                    onChange={(e) => setCalendarTitle(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Fecha</label>
                                                    <input
                                                        type="date"
                                                        value={calendarDate}
                                                        onChange={(e) => setCalendarDate(e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Hora (Opcional)</label>
                                                    <input
                                                        type="time"
                                                        value={calendarTime}
                                                        onChange={(e) => setCalendarTime(e.target.value)}
                                                        className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Ubicación</label>
                                                <input
                                                    type="text"
                                                    value={calendarLocation}
                                                    onChange={(e) => setCalendarLocation(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] text-gray-400 uppercase font-bold mb-1">Descripción</label>
                                                <textarea
                                                    rows="3"
                                                    value={calendarDescription}
                                                    onChange={(e) => setCalendarDescription(e.target.value)}
                                                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                                />
                                            </div>

                                            {/* Selector de Invitados Frecuentes (CDU-15) */}
                                            <div className="pt-2 border-t border-blue-500/20">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <label className="text-[10px] text-blue-300 uppercase font-bold flex items-center gap-1">
                                                        <Users className="h-3.5 w-3.5" /> Invitados al evento ({selectedGuests.length})
                                                    </label>
                                                    {availableGuests.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                if (selectedGuests.length === availableGuests.length) {
                                                                    setSelectedGuests([]);
                                                                } else {
                                                                    setSelectedGuests(availableGuests.map(g => g.email));
                                                                }
                                                            }}
                                                            className="text-[10px] text-indigo-400 hover:text-indigo-300 underline font-semibold"
                                                        >
                                                            {selectedGuests.length === availableGuests.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                                                        </button>
                                                    )}
                                                </div>

                                                {availableGuests.length === 0 ? (
                                                    <p className="text-[11px] text-gray-400 italic bg-gray-900/60 p-2 rounded-lg border border-gray-800">
                                                        No hay invitados frecuentes configurados en la Agenda. Puede registrarlos desde la Configuración de Agenda.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-1 max-h-36 overflow-y-auto pr-1 bg-gray-900/70 p-2 rounded-lg border border-gray-800">
                                                        {availableGuests.map(guest => {
                                                            const isChecked = selectedGuests.includes(guest.email);
                                                            return (
                                                                <label
                                                                    key={guest.id}
                                                                    className="flex items-center justify-between p-1 rounded hover:bg-gray-800/60 cursor-pointer text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isChecked}
                                                                            onChange={(e) => {
                                                                                if (e.target.checked) {
                                                                                    setSelectedGuests(prev => [...prev, guest.email]);
                                                                                } else {
                                                                                    setSelectedGuests(prev => prev.filter(em => em !== guest.email));
                                                                                }
                                                                            }}
                                                                            className="w-3.5 h-3.5 text-blue-500 bg-gray-950 border-gray-700 rounded focus:ring-blue-500"
                                                                        />
                                                                        <span className="text-gray-200 font-medium truncate">{guest.name}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-gray-500 font-mono truncate">{guest.email}</span>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setShowApproveConfirm(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Volver
                                </button>
                                <button
                                    onClick={handleAprobar}
                                    disabled={isApproveDisabled}
                                    className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
