import { useState, useEffect } from 'react';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import api from '../config/axios';

export default function TicketSeguimiento({ solicitudId }) {
    const [seguimientos, setSeguimientos] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (solicitudId) {
            fetchSeguimientos();
        }
    }, [solicitudId]);

    const fetchSeguimientos = async () => {
        try {
            const res = await api.get(`/api/solicitudes/${solicitudId}/seguimiento`);
            setSeguimientos(res.data);
        } catch (err) {
            console.error('Error fetching seguimientos', err);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${solicitudId}/seguimiento`, {
                mensaje: newMessage
            });
            setNewMessage('');
            fetchSeguimientos();
        } catch (err) {
            console.error('Error saving seguimiento', err);
            alert('Error al guardar el comentario');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-gray-900/40 p-5 rounded-3xl border border-gray-700/50 mt-6 flex flex-col max-h-[400px]">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Historial de Seguimiento
            </h3>

            {/* List of messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 mb-4">
                {seguimientos.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 py-4 italic">
                        No hay comentarios de seguimiento aún.
                    </div>
                ) : (
                    seguimientos.map((seg) => (
                        <div key={seg.id} className="bg-gray-800/60 p-3 rounded-2xl border border-gray-700/50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
                                    <div className="bg-gray-700 rounded-full p-1"><User className="h-3 w-3 text-gray-400" /></div>
                                    {seg.autor}
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-gray-500 font-mono">
                                    <Clock className="h-3 w-3" />
                                    {new Date(seg.fecha).toLocaleString()}
                                </div>
                            </div>
                            <div className="text-sm text-gray-200 pl-8 whitespace-pre-wrap">
                                {seg.mensaje}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Input form */}
            <form onSubmit={handleSend} className="relative mt-auto">
                <input
                    type="text"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-4 pr-12 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Escribir una actualización o comentario..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading}
                />
                <button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
