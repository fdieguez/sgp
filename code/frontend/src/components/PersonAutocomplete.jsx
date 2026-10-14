import { useState, useEffect, useRef } from 'react';
import api from '../config/axios';
import { Search, User, MapPin, FileText, Check, Plus, AlertCircle, Loader2, X, Clock, CheckCircle2, History } from 'lucide-react';

/**
 * Componente universal de autocompletado y búsqueda flexible (Fuzzy) de personas (CDU-06).
 * Incluye visualización de badge contextual 360° (CDU-07) y prevención de duplicados (CDU-08).
 * Diseñado para reutilizarse tanto en el solicitante principal como en campos dinámicos (CDU-09).
 */
export default function PersonAutocomplete({
    value = '',
    onChange,
    onSelect,
    onClear,
    placeholder = 'Buscar por nombre o DNI...',
    required = false,
    disabled = false,
    label = 'Nombre Completo / Institución',
    showStatsBadge = true,
    selectedPerson = null,
    className = ''
}) {
    const [inputValue, setInputValue] = useState(value || '');
    const [suggestions, setSuggestions] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const wrapperRef = useRef(null);

    // Sincronizar valor externo
    useEffect(() => {
        setInputValue(value || '');
    }, [value]);

    // Cerrar sugerencias al hacer clic fuera del componente
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Búsqueda con Debounce de 300 ms (CDU-06)
    useEffect(() => {
        const query = inputValue.trim();
        if (!isOpen || query.length < 2) {
            setSuggestions([]);
            return;
        }

        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/persons/search?q=${encodeURIComponent(query)}&limit=8`);
                setSuggestions(res.data || []);
            } catch (err) {
                console.error('Error al buscar personas con autocompletado:', err);
                setSuggestions([]);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [inputValue, isOpen]);

    const handleInputChange = (e) => {
        const val = e.target.value;
        setInputValue(val);
        setIsOpen(true);
        if (onChange) onChange(val);
    };

    const handleSelectPerson = (person) => {
        setInputValue(person.name);
        setIsOpen(false);
        setSuggestions([]);
        if (onChange) onChange(person.name);
        if (onSelect) onSelect(person);
    };

    const handleClear = () => {
        setInputValue('');
        setIsOpen(false);
        setSuggestions([]);
        if (onChange) onChange('');
        if (onClear) onClear();
    };

    return (
        <div ref={wrapperRef} className={`relative space-y-1.5 ${className}`}>
            {label && (
                <div className="flex items-center justify-between">
                    <label className="block text-sm text-gray-500">
                        {label} {required && <span className="text-red-400">*</span>}
                    </label>
                </div>
            )}

            <div className="relative">
                <input
                    type="text"
                    required={required}
                    disabled={disabled}
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={handleInputChange}
                    onFocus={() => {
                        if (inputValue.trim().length >= 2) setIsOpen(true);
                    }}
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg pl-9 pr-8 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                />
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />

                {loading ? (
                    <Loader2 className="h-4 w-4 text-indigo-400 animate-spin absolute right-2.5 top-2.5" />
                ) : inputValue ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        disabled={disabled}
                        className="text-gray-400 hover:text-white absolute right-2.5 top-2.5 p-0.5 rounded-full"
                        title="Limpiar campo"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                ) : null}
            </div>

            {/* Dropdown flotante de sugerencias */}
            {isOpen && (inputValue.trim().length >= 2 || suggestions.length > 0) && (
                <div className="absolute z-[120] left-0 right-0 mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden divide-y divide-gray-800 animate-in fade-in duration-150 max-h-64 overflow-y-auto">
                    {suggestions.length > 0 ? (
                        suggestions.map((p, index) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => handleSelectPerson(p)}
                                className="w-full text-left px-3.5 py-2.5 hover:bg-gray-800/80 transition-colors flex items-center justify-between group cursor-pointer"
                            >
                                <div className="min-w-0 pr-2">
                                    <div className="text-sm font-semibold text-white group-hover:text-indigo-300 truncate flex items-center gap-1.5">
                                        <User className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                                        <span className="truncate">{p.name}</span>
                                    </div>
                                    <div className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 font-mono">
                                        {p.dni ? <span>DNI: {p.dni}</span> : <span className="italic text-gray-500">Sin DNI</span>}
                                        {p.locationName && (
                                            <>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="h-3 w-3 text-gray-500" />
                                                    {p.locationName}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Resumen contextual de solicitudes (CDU-07) */}
                                <div className="text-right shrink-0">
                                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700 font-sans">
                                        {p.totalSolicitudes} sol. ({p.pendientes} pend., {p.completadas} comp.)
                                    </span>
                                </div>
                            </button>
                        ))
                    ) : !loading && (
                        <div className="p-3 text-center text-xs text-gray-400">
                            No se encontraron personas registradas con ese criterio.
                            <div className="mt-1 text-[11px] text-indigo-400 font-semibold">
                                Puedes continuar escribiendo para registrar una nueva persona.
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Vista 360° / Badge Contextual del Solicitante Seleccionado (CDU-07) */}
            {showStatsBadge && selectedPerson && (selectedPerson.totalSolicitudes !== undefined || selectedPerson.id) && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-indigo-950/40 border border-indigo-700/40 rounded-lg text-xs text-indigo-200 mt-1 animate-in fade-in duration-200">
                    <History className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="font-semibold text-white">Historial del Solicitante:</span>
                    <span>
                        <strong className="text-white">{selectedPerson.totalSolicitudes || 0}</strong> solicitudes registradas
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-amber-300 font-medium">
                        {selectedPerson.pendientes || 0} pendientes
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-blue-300 font-medium">
                        {selectedPerson.enProceso || 0} en proceso
                    </span>
                    <span className="text-gray-400">•</span>
                    <span className="text-emerald-300 font-medium">
                        {selectedPerson.completadas || 0} completadas
                    </span>
                </div>
            )}
        </div>
    );
}
