import { useState, useEffect, useRef, useMemo } from 'react';
import { MessageSquare, Send, Clock, User } from 'lucide-react';
import api from '../config/axios';

// Normaliza texto removiendo tildes para búsquedas flexibles en el selector de menciones
const normalizeText = (value = '') =>
    String(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();

/**
 * Renderiza el texto de una nota resaltando visualmente las menciones (@usuario).
 */
function renderMensajeConMenciones(texto) {
    if (!texto) return null;
    const parts = String(texto).split(/(@[a-zA-Z0-9._-]+(?:@[a-zA-Z0-9._-]+)?)/g);
    return parts.map((part, idx) => {
        if (part.startsWith('@') && part.length > 1) {
            return (
                <span
                    key={idx}
                    className="inline-block bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold px-1.5 py-0.5 rounded-md mx-0.5"
                >
                    {part}
                </span>
            );
        }
        return <span key={idx}>{part}</span>;
    });
}

export default function TicketSeguimiento({ solicitudId }) {
    const [seguimientos, setSeguimientos] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Estados para autocompletado de menciones (@)
    const [mentionableUsers, setMentionableUsers] = useState([]);
    const [mentionQuery, setMentionQuery] = useState(null);
    const [mentionStartIndex, setMentionStartIndex] = useState(-1);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [selectedMentions, setSelectedMentions] = useState([]); // [{ id, handle }]
    const inputRef = useRef(null);

    useEffect(() => {
        if (solicitudId) {
            fetchSeguimientos();
        }
    }, [solicitudId]);

    useEffect(() => {
        // Carga única de usuarios activos disponibles para mencionar
        let mounted = true;
        api.get('/api/users/mentionable')
            .then((res) => {
                if (mounted && Array.isArray(res.data)) {
                    setMentionableUsers(res.data);
                }
            })
            .catch((err) => {
                console.error('Error cargando usuarios mencionables', err);
            });
        return () => {
            mounted = false;
        };
    }, []);

    const fetchSeguimientos = async () => {
        try {
            const res = await api.get(`/api/solicitudes/${solicitudId}/seguimiento`);
            setSeguimientos(res.data);
        } catch (err) {
            console.error('Error fetching seguimientos', err);
        }
    };

    const filteredUsers = useMemo(() => {
        if (mentionQuery === null) return [];
        const q = normalizeText(mentionQuery.trim());
        const matches = mentionableUsers.filter((u) => {
            if (!q) return true;
            const searchable = normalizeText(
                `${u.firstName || ''} ${u.lastName || ''} ${u.fullName || ''} ${u.email || ''} ${u.handle || ''}`
            );
            return searchable.includes(q);
        });
        return matches.slice(0, 8);
    }, [mentionQuery, mentionableUsers]);

    const detectMentionTrigger = (value, cursorPos) => {
        const textBeforeCursor = value.slice(0, cursorPos);
        // Detecta '@' al inicio o precedido por un espacio, seguido de caracteres sin espacio
        const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);
        if (match) {
            const query = match[1];
            const atPos = textBeforeCursor.lastIndexOf('@');
            setMentionQuery(query);
            setMentionStartIndex(atPos);
            setSelectedIndex(0);
        } else {
            setMentionQuery(null);
            setMentionStartIndex(-1);
        }
    };

    const handleInputChange = (e) => {
        const val = e.target.value;
        const cursor = e.target.selectionStart ?? val.length;
        setNewMessage(val);
        detectMentionTrigger(val, cursor);
    };

    const handleSelectUser = (user) => {
        if (mentionStartIndex < 0) return;
        const inputEl = inputRef.current;
        const cursor = inputEl?.selectionStart ?? newMessage.length;
        const before = newMessage.slice(0, mentionStartIndex);
        const after = newMessage.slice(cursor);
        const token = `@${user.handle}`;
        const updated = `${before}${token} ${after}`;

        setNewMessage(updated);
        setSelectedMentions((prev) => {
            if (prev.some((m) => m.id === user.id)) return prev;
            return [...prev, { id: user.id, handle: user.handle }];
        });
        setMentionQuery(null);
        setMentionStartIndex(-1);
        setSelectedIndex(0);

        requestAnimationFrame(() => {
            if (inputRef.current) {
                const newPos = before.length + token.length + 1;
                inputRef.current.focus();
                inputRef.current.setSelectionRange(newPos, newPos);
            }
        });
    };

    const handleKeyDown = (e) => {
        if (mentionQuery !== null && filteredUsers.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev + 1) % filteredUsers.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((prev) => (prev - 1 + filteredUsers.length) % filteredUsers.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                handleSelectUser(filteredUsers[selectedIndex] || filteredUsers[0]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setMentionQuery(null);
                setMentionStartIndex(-1);
                return;
            }
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        // Enviar solo los IDs cuya mención efectivamente permanece en el texto final
        const activeMentionIds = selectedMentions
            .filter((m) => newMessage.toLowerCase().includes(`@${m.handle.toLowerCase()}`))
            .map((m) => m.id);

        setLoading(true);
        try {
            await api.post(`/api/solicitudes/${solicitudId}/seguimiento`, {
                mensaje: newMessage,
                mentionedUserIds: activeMentionIds
            });
            setNewMessage('');
            setSelectedMentions([]);
            setMentionQuery(null);
            setMentionStartIndex(-1);
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

            {/* Lista de mensajes */}
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
                                {renderMensajeConMenciones(seg.mensaje)}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Formulario con selector flotante de menciones (@) */}
            <form onSubmit={handleSend} className="relative mt-auto">
                {mentionQuery !== null && filteredUsers.length > 0 && (
                    <div
                        data-testid="mention-suggestions"
                        className="absolute bottom-full left-0 right-0 mb-2 bg-gray-800 border border-indigo-500/40 rounded-xl shadow-2xl overflow-hidden z-50 max-h-56 overflow-y-auto"
                    >
                        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300 bg-gray-900/80 border-b border-gray-700">
                            Mencionar usuario activo
                        </div>
                        {filteredUsers.map((u, idx) => (
                            <button
                                key={u.id}
                                type="button"
                                data-testid={`mention-option-${u.handle}`}
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    handleSelectUser(u);
                                }}
                                className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs transition-colors ${
                                    idx === selectedIndex
                                        ? 'bg-indigo-600/40 text-white'
                                        : 'text-gray-200 hover:bg-gray-700/70'
                                }`}
                            >
                                <div className="flex flex-col">
                                    <span className="font-bold">{u.fullName || u.email}</span>
                                    <span className="text-[11px] text-gray-400">@{u.handle} · {u.email}</span>
                                </div>
                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-gray-900/70 text-indigo-300 border border-gray-700">
                                    {u.role}
                                </span>
                            </button>
                        ))}
                    </div>
                )}

                <input
                    ref={inputRef}
                    type="text"
                    data-testid="seguimiento-input"
                    className="w-full bg-gray-800 border border-gray-600 rounded-xl pl-4 pr-12 py-3 text-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="Escribir comentario... (usá @ para mencionar)"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button
                    type="submit"
                    data-testid="seguimiento-send-btn"
                    disabled={loading || !newMessage.trim()}
                    className="absolute right-2 top-2 p-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                    <Send className="h-4 w-4" />
                </button>
            </form>
        </div>
    );
}
