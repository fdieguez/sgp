import { useState, useEffect } from 'react';
import api from '../config/axios';
import { Users, UserPlus, Trash2, Mail, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Componente modular para la administración de invitados frecuentes a eventos de Google Calendar (CDU-14).
 * Permite listar, agregar y eliminar contactos predefinidos vinculados a la configuración de Agenda.
 */
export default function AgendaGuestsManager({ configId }) {
    const [guests, setGuests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        if (configId) {
            fetchGuests();
        }
    }, [configId]);

    const fetchGuests = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/config/${configId}/guests`);
            setGuests(res.data || []);
        } catch (err) {
            console.error('Error al cargar invitados frecuentes:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddGuest = async (e) => {
        e.preventDefault();
        if (!name.trim() || !email.trim()) {
            toast.error('Nombre y correo electrónico son obligatorios.');
            return;
        }

        // Validación simple de formato de correo
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
            toast.error('Ingrese un correo electrónico válido.');
            return;
        }

        setAdding(true);
        try {
            const res = await api.post(`/api/config/${configId}/guests`, {
                name: name.trim(),
                email: email.trim().toLowerCase()
            });
            setGuests(prev => [...prev, res.data]);
            setName('');
            setEmail('');
            toast.success('Invitado frecuente agregado con éxito.');
        } catch (err) {
            console.error('Error al agregar invitado:', err);
            toast.error(err.response?.data?.message || 'Error al agregar el invitado frecuente.');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteGuest = async (guestId) => {
        if (!window.confirm('¿Desea eliminar este invitado frecuente de la lista?')) return;
        try {
            await api.delete(`/api/config/${configId}/guests/${guestId}`);
            setGuests(prev => prev.filter(g => g.id !== guestId));
            toast.success('Invitado eliminado correctamente.');
        } catch (err) {
            console.error('Error al eliminar invitado:', err);
            toast.error('Error al eliminar el invitado frecuente.');
        }
    };

    if (!configId) return null;

    return (
        <div className="bg-gray-900/60 border border-gray-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-indigo-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white tracking-wide">Invitados Frecuentes de Agenda</h3>
                        <p className="text-xs text-gray-400">Contactos sugeridos por defecto para sumar a eventos de Google Calendar.</p>
                    </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-950/70 text-indigo-300 border border-indigo-700/50">
                    {guests.length} {guests.length === 1 ? 'contacto' : 'contactos'}
                </span>
            </div>

            {/* Formulario de Alta Rápida */}
            <form onSubmit={handleAddGuest} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Nombre Completo</label>
                    <input
                        type="text"
                        placeholder="Ej: Lic. Martín Nocioni"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                <div className="md:col-span-5">
                    <label className="block text-[11px] font-semibold text-gray-400 uppercase mb-1">Correo Electrónico (Gmail)</label>
                    <div className="relative">
                        <input
                            type="email"
                            placeholder="contacto@gmail.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <Mail className="h-4 w-4 text-gray-500 absolute left-2.5 top-2.5" />
                    </div>
                </div>
                <div className="md:col-span-2">
                    <button
                        type="submit"
                        disabled={adding || !name || !email}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95"
                    >
                        <UserPlus className="h-4 w-4" />
                        {adding ? 'Guardando...' : 'Agregar'}
                    </button>
                </div>
            </form>

            {/* Listado de Contactos */}
            <div className="space-y-2 pt-1">
                {loading ? (
                    <div className="text-center py-4 text-xs text-gray-400">Cargando invitados frecuentes...</div>
                ) : guests.length === 0 ? (
                    <div className="text-center py-4 border border-dashed border-gray-700/70 rounded-xl text-xs text-gray-500">
                        No hay invitados frecuentes configurados aún. Añade los primeros contactos arriba.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                        {guests.map((guest) => (
                            <div
                                key={guest.id}
                                className="flex items-center justify-between p-2.5 bg-gray-950/70 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-xs font-bold text-gray-200 truncate flex items-center gap-1.5">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        <span className="truncate">{guest.name}</span>
                                    </div>
                                    <div className="text-[11px] text-gray-400 font-mono truncate">{guest.email}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleDeleteGuest(guest.id)}
                                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                                    title="Eliminar invitado"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
