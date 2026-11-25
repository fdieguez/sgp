import { Sun, Moon, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * Panel reutilizable de configuración de apariencia (Tema Claro / Oscuro).
 * Guarda automáticamente la preferencia en el navegador mediante ThemeContext.
 */
export default function AparienciaPanel() {
    const { theme, setTheme } = useTheme();

    return (
        <div
            data-testid="apariencia-panel"
            className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm shadow-xl space-y-6"
        >
            <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {theme === 'dark' ? (
                        <Moon className="h-5 w-5 text-indigo-400" />
                    ) : (
                        <Sun className="h-5 w-5 text-yellow-400" />
                    )}
                    Apariencia del Sistema
                </h2>
                <p className="text-xs text-gray-400 mt-1">
                    Elegí el tema visual de la plataforma. Tu preferencia queda guardada automáticamente en este dispositivo.
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <button
                    type="button"
                    data-testid="theme-option-dark"
                    onClick={() => setTheme('dark')}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-start justify-between gap-4 ${
                        theme === 'dark'
                            ? 'bg-indigo-600/20 border-indigo-500 ring-2 ring-indigo-500/40'
                            : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-gray-800 border border-gray-700 text-indigo-400">
                            <Moon className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm">Modo Oscuro</div>
                            <p className="text-xs text-gray-400 mt-1">
                                Menor fatiga visual en jornadas prolongadas y ambientes con poca luz.
                            </p>
                        </div>
                    </div>
                    {theme === 'dark' && (
                        <span className="p-1 rounded-full bg-indigo-500 text-white shrink-0">
                            <Check className="h-3.5 w-3.5" />
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    data-testid="theme-option-light"
                    onClick={() => setTheme('light')}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-start justify-between gap-4 ${
                        theme === 'light'
                            ? 'bg-amber-500/15 border-amber-400 ring-2 ring-amber-400/40'
                            : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'
                    }`}
                >
                    <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-yellow-400">
                            <Sun className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-white text-sm">Modo Claro</div>
                            <p className="text-xs text-gray-400 mt-1">
                                Fondo luminoso con alto contraste ideal para ambientes muy iluminados.
                            </p>
                        </div>
                    </div>
                    {theme === 'light' && (
                        <span className="p-1 rounded-full bg-amber-500 text-white shrink-0">
                            <Check className="h-3.5 w-3.5" />
                        </span>
                    )}
                </button>
            </div>
        </div>
    );
}
