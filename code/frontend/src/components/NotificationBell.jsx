import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, MessageSquare } from 'lucide-react';
import api from '../config/axios';

const POLLING_INTERVAL_MS = 45000;

/**
 * Campanita de notificaciones in-app en la barra superior (Navbar).
 * Muestra badge de no leídas, panel desplegable con pestañas y navegación directa al seguimiento.
 */
export default function NotificationBell() {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const containerRef = useRef(null);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const res = await api.get('/api/notificaciones/unread-count');
            setUnreadCount(res.data?.count ?? 0);
        } catch (err) {
            console.error('Error obteniendo contador de notificaciones', err);
        }
    }, []);

    const fetchNotifications = useCallback(async (tab = activeTab) => {
        setLoading(true);
        try {
            const res = await api.get('/api/notificaciones', {
                params: {
                    unreadOnly: tab === 'unread',
                    page: 0,
                    size: 20
                }
            });
            setNotifications(res.data?.content || []);
        } catch (err) {
            console.error('Error listando notificaciones', err);
        } finally {
            setLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        fetchUnreadCount();
        const intervalId = setInterval(fetchUnreadCount, POLLING_INTERVAL_MS);
        return () => clearInterval(intervalId);
    }, [fetchUnreadCount]);

    useEffect(() => {
        if (open) {
            fetchNotifications(activeTab);
            fetchUnreadCount();
        }
    }, [open, activeTab, fetchNotifications, fetchUnreadCount]);

    // Cerrar popover al hacer clic fuera
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const handleNotificationClick = async (notif) => {
        if (!notif.leida) {
            try {
                const res = await api.put(`/api/notificaciones/${notif.id}/read`);
                const newCount = res.data?.unreadCount;
                setUnreadCount((prev) => (typeof newCount === 'number' ? newCount : Math.max(0, prev - 1)));
                setNotifications((prev) =>
                    prev.map((item) => (item.id === notif.id ? { ...item, leida: true } : item))
                );
            } catch (err) {
                console.error('Error marcando notificación como leída', err);
            }
        }

        setOpen(false);
        window.dispatchEvent(
            new CustomEvent('sgp:open-solicitud-notificacion', {
                detail: { solicitudId: notif.solicitudId }
            })
        );
    };

    const handleMarkAllAsRead = async () => {
        try {
            await api.put('/api/notificaciones/read-all');
            setUnreadCount(0);
            setNotifications((prev) => prev.map((item) => ({ ...item, leida: true })));
        } catch (err) {
            console.error('Error marcando todas las notificaciones como leídas', err);
        }
    };

    const visibleNotifications = activeTab === 'unread'
        ? notifications.filter((n) => !n.leida)
        : notifications;

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                data-testid="notification-bell-btn"
                onClick={() => setOpen((prev) => !prev)}
                className="relative flex items-center justify-center p-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                title="Notificaciones"
            >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span
                        data-testid="notification-badge"
                        className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-black leading-none shadow"
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div
                    data-testid="notification-popover"
                    className="absolute right-0 mt-2 w-80 sm:w-96 bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl z-50 overflow-hidden"
                >
                    {/* Cabecera */}
                    <div className="px-4 py-3 bg-gray-900/70 border-b border-gray-700 flex items-center justify-between">
                        <span className="text-sm font-bold text-white">Notificaciones</span>
                        <button
                            type="button"
                            data-testid="mark-all-read-btn"
                            onClick={handleMarkAllAsRead}
                            disabled={unreadCount === 0}
                            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Marcar todas como leídas
                        </button>
                    </div>

                    {/* Pestañas */}
                    <div className="flex border-b border-gray-700 bg-gray-900/40">
                        <button
                            type="button"
                            data-testid="notif-tab-all"
                            onClick={() => setActiveTab('all')}
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${
                                activeTab === 'all'
                                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-gray-800/60'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            Todas
                        </button>
                        <button
                            type="button"
                            data-testid="notif-tab-unread"
                            onClick={() => setActiveTab('unread')}
                            className={`flex-1 py-2 text-xs font-bold transition-colors ${
                                activeTab === 'unread'
                                    ? 'text-indigo-400 border-b-2 border-indigo-500 bg-gray-800/60'
                                    : 'text-gray-400 hover:text-gray-200'
                            }`}
                        >
                            No leídas ({unreadCount})
                        </button>
                    </div>

                    {/* Lista de notificaciones */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-700/60">
                        {loading ? (
                            <div className="p-6 text-center text-xs text-gray-400">
                                Cargando notificaciones...
                            </div>
                        ) : visibleNotifications.length === 0 ? (
                            <div className="p-6 text-center text-xs text-gray-400 italic">
                                {activeTab === 'unread'
                                    ? 'No tenés notificaciones pendientes.'
                                    : 'Todavía no tenés notificaciones.'}
                            </div>
                        ) : (
                            visibleNotifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    type="button"
                                    data-testid={`notification-item-${notif.id}`}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors hover:bg-gray-700/50 ${
                                        !notif.leida ? 'bg-indigo-950/30' : ''
                                    }`}
                                >
                                    <div className={`mt-1 p-1.5 rounded-lg ${
                                        !notif.leida
                                            ? 'bg-indigo-500/20 text-indigo-400'
                                            : 'bg-gray-700/60 text-gray-400'
                                    }`}>
                                        <MessageSquare className="h-4 w-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs leading-snug ${
                                            !notif.leida ? 'text-white font-semibold' : 'text-gray-300'
                                        }`}>
                                            {notif.mensaje}
                                        </p>
                                        <span className="text-[10px] text-gray-400 mt-1 block">
                                            {new Date(notif.fechaCreacion).toLocaleString()}
                                        </span>
                                    </div>
                                    {!notif.leida && (
                                        <span className="mt-2 h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
