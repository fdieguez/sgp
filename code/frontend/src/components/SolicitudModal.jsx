import { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, MapPin, Clipboard, Phone, DollarSign, Calendar } from 'lucide-react';
import api from '../config/axios';

export default function SolicitudModal({ isOpen, onClose, onSuccess, initialData, configId }) {
    const [formData, setFormData] = useState({
        type: 'PEDIDO',
        description: '',
        status: 'PENDING',
        origin: 'MANUAL',
        entryDate: new Date().toISOString().split('T')[0],
        person: { name: '', phone: '' },
        locationName: '',
        barrio: '',
        responsableId: '',
        amount: '',
        grantDate: ''
    });

    const [responsables, setResponsables] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchResponsables();
            if (initialData) {
                // Map entity to form
                setFormData({
                    ...initialData,
                    type: initialData.amount !== undefined ? 'SUBSIDIO' : 'PEDIDO',
                    person: initialData.person || { name: '', phone: '' },
                    locationName: initialData.location?.name || '',
                    responsableId: initialData.responsable?.id || '',
                    amount: initialData.amount || '',
                    grantDate: initialData.grantDate || '',
                    zone: initialData.zone || '',
                    contactDate: initialData.contactDate || '',
                    resolutionDate: initialData.resolutionDate || '',
                    observation: initialData.observation || '',
                    resolution: initialData.resolution || '',
                    detail: initialData.detail || '',
                    firstContactControl: initialData.firstContactControl || false
                });
            } else {
                setFormData({
                    type: 'PEDIDO',
                    description: '',
                    status: 'PENDING',
                    origin: 'MANUAL',
                    entryDate: new Date().toISOString().split('T')[0],
                    person: { name: '', phone: '' },
                    locationName: '',
                    barrio: '',
                    responsableId: '',
                    amount: '',
                    grantDate: '',
                    zone: '',
                    contactDate: '',
                    resolutionDate: '',
                    observation: '',
                    resolution: '',
                    detail: '',
                    firstContactControl: false
                });
            }
        }
    }, [isOpen, initialData]);

    const fetchResponsables = async () => {
        try {
            const res = await api.get('/api/responsables');
            setResponsables(res.data);
        } catch (err) {
            console.error("Error fetching responsables", err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                sheetsConfig: { id: configId },
                // Backend will handle finding/creating person and location based on these strings 
                // In a real scenario, we might want separate lookups, but let's keep it simple for now
                // Actually, our backend Solicitud entity expects Person and Location objects.
                // For simplicity, let's just send names and let the backend service handle it?
                // No, the backend SolicitudController expects the Solicitud object.
            };

            if (formData.id) {
                await api.put(`/api/solicitudes/${formData.id}`, payload);
            } else {
                await api.post('/api/solicitudes', payload);
            }
            onSuccess();
            onClose();
        } catch (err) {
            console.error("Error saving solicitud", err);
            alert("Error al guardar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gray-800/50">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Clipboard className="text-indigo-500" />
                        {formData.id ? 'Editar Solicitud' : 'Nueva Solicitud'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Type and Status */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Tipo</label>
                            <select
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.type}
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
                                <option value="PENDING">Pendiente</option>
                                <option value="IN_PROGRESS">En Proceso</option>
                                <option value="COMPLETED">Completado</option>
                                <option value="REJECTED">Rechazado</option>
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
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.locationName}
                                    onChange={(e) => setFormData({ ...formData, locationName: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Barrio</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.barrio}
                                    onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Zona / Eje</label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    value={formData.zone}
                                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
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
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white outline-none focus:ring-2 focus:ring-indigo-500"
                                value={formData.responsableId}
                                onChange={(e) => setFormData({ ...formData, responsableId: e.target.value })}
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
                </form>

                <div className="p-6 border-t border-gray-700 bg-gray-800/50 flex justify-end gap-3">
                    <button
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
        </div>
    );
}
