import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Selector desplegable reutilizable con selección múltiple (checkboxes) y buscador opcional.
 * Recibe y emite un arreglo de valores string (`value: string[]`).
 */
export default function MultiSelectDropdown({
    options = [],
    value = [],
    onChange,
    placeholder = 'Todos',
    searchable = false,
    testId = 'multiselect'
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const containerRef = useRef(null);

    const selectedValues = Array.isArray(value)
        ? value.map(String)
        : (value ? String(value).split(',').map(v => v.trim()).filter(Boolean) : []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        if (open) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [open]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !query.trim()) return options;
        const q = query.trim().toLowerCase();
        return options.filter(opt => String(opt.label).toLowerCase().includes(q));
    }, [options, searchable, query]);

    const toggleOption = (optVal) => {
        const strVal = String(optVal);
        const exists = selectedValues.includes(strVal);
        const next = exists
            ? selectedValues.filter(v => v !== strVal)
            : [...selectedValues, strVal];
        onChange(next);
    };

    const getSummaryLabel = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === 1) {
            const match = options.find(o => String(o.value) === selectedValues[0]);
            return match ? match.label : selectedValues[0];
        }
        return `${selectedValues.length} seleccionados`;
    };

    return (
        <div ref={containerRef} className="relative">
            <button
                type="button"
                data-testid={`${testId}-trigger`}
                onClick={() => setOpen(prev => !prev)}
                className={`w-full bg-gray-900 text-sm border rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2 outline-none transition-all ${
                    selectedValues.length > 0
                        ? 'border-indigo-500 text-white'
                        : 'border-gray-700 text-gray-200 hover:border-gray-500'
                }`}
            >
                <span className="truncate">{getSummaryLabel()}</span>
                <div className="flex items-center gap-1 shrink-0">
                    {selectedValues.length > 0 && (
                        <span
                            role="button"
                            tabIndex={0}
                            title="Limpiar filtro"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange([]);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.stopPropagation();
                                    onChange([]);
                                }
                            }}
                            className="p-0.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                    <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {open && (
                <div
                    data-testid={`${testId}-menu`}
                    className="absolute left-0 right-0 mt-1.5 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[210px]"
                >
                    {searchable && (
                        <div className="p-2 border-b border-gray-800 relative">
                            <Search className="h-3.5 w-3.5 text-gray-500 absolute left-4 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Buscar..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white outline-none focus:border-indigo-500"
                            />
                        </div>
                    )}

                    <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
                        {filteredOptions.length === 0 ? (
                            <div className="text-xs text-gray-500 text-center py-3 italic">Sin coincidencias</div>
                        ) : (
                            filteredOptions.map(opt => {
                                const strVal = String(opt.value);
                                const checked = selectedValues.includes(strVal);
                                return (
                                    <button
                                        key={strVal}
                                        type="button"
                                        data-testid={`${testId}-opt-${strVal}`}
                                        onClick={() => toggleOption(strVal)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                                            checked
                                                ? 'bg-indigo-600/25 text-white font-semibold'
                                                : 'text-gray-300 hover:bg-gray-800'
                                        }`}
                                    >
                                        <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                            checked
                                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                                : 'border-gray-600 bg-gray-800'
                                        }`}>
                                            {checked && <Check className="h-3 w-3" />}
                                        </span>
                                        <span className="truncate">{opt.label}</span>
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {selectedValues.length > 0 && (
                        <div className="border-t border-gray-800 p-1.5 bg-gray-950/60 flex justify-between items-center">
                            <span className="text-[10px] text-gray-400 px-1.5">
                                {selectedValues.length} seleccionado(s)
                            </span>
                            <button
                                type="button"
                                onClick={() => onChange([])}
                                className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 px-2 py-0.5"
                            >
                                Limpiar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
