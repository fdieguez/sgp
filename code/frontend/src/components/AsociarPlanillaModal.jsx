import { useState, useEffect } from 'react';
import api from '../config/axios';
import toast from 'react-hot-toast';
import { X, Loader2, FileSpreadsheet, Settings, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';

/**
 * Componente modal premium con efecto de cristal esmerilado (glassmorphism)
 * para asociar un nuevo ID de planilla de Google Sheets.
 *
 * Cumple con la directriz RULE[user_global] (comentarios e indicaciones en español).
 */
export default function AsociarPlanillaModal({ isOpen, onClose, onSuccess, config }) {
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [loading, setLoading] = useState(false);

    // Inicializar el ID de la planilla cuando se carga la configuración o abre el modal
    useEffect(() => {
        if (isOpen && config) {
            setSpreadsheetId(config.spreadsheetId || '');
            setSheetName(config.sheetName || '');
        }
    }, [config, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!spreadsheetId.trim()) {
            toast.error('El ID de la planilla no puede estar vacío');
            return;
        }
        if (!sheetName.trim()) {
            toast.error('El nombre de la hoja no puede estar vacío');
            return;
        }

        setLoading(true);
        try {
            // Realizar la petición PUT al endpoint dinámico de configuración
            await api.put(`/api/config/${config.id}`, {
                ...config,
                spreadsheetId: spreadsheetId.trim(),
                sheetName: sheetName.trim()
            });

            toast.success('Planilla asociada correctamente');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Error al guardar la planilla:', err);
            const errMsg = err.response?.data?.message || 'Error al actualizar la asociación de la planilla';
            toast.error(errMsg);
        } finally {
            setLoading(false);
        }
    };

    // Determinar clase de estado de sincronización
    const isSyncActive = config?.status === 'ACTIVE' || config?.status === 'SYNCING';
    const statusLabel = config?.status === 'ACTIVE' ? 'Activo' : (config?.status === 'SYNCING' ? 'Sincronizando' : 'Error');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
            {/* Contenedor del Modal con efecto cristal esmerilado */}
            <div className="bg-gray-900/85 border border-gray-700/60 backdrop-blur-xl w-full max-w-lg shadow-2xl rounded-2xl overflow-hidden transform transition-all duration-300 scale-100 flex flex-col animate-in zoom-in-95 duration-200">
                
                {/* Cabecera del Modal */}
                <div className="flex justify-between items-center p-5 border-b border-gray-800/80 bg-gray-950/40">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
                            <Settings className="h-5 w-5 animate-pulse" />
                        </div>
                        Asociar Planilla Externa
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white p-1.5 hover:bg-gray-800/50 rounded-lg transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    
                    {/* Información de la Hoja Actual */}
                    <div className="grid grid-cols-2 gap-4 p-4 bg-gray-950/30 border border-gray-850 rounded-xl">
                        <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Hoja de Cálculo</span>
                            <span className="text-sm font-medium text-gray-200 flex items-center gap-1.5 mt-0.5">
                                <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
                                {config?.sheetName || 'Sin especificar'}
                            </span>
                        </div>
                        <div>
                            <span className="block text-[10px] uppercase font-semibold text-gray-500 tracking-wider">Estado Sincronización</span>
                            <span className="text-sm font-medium flex items-center gap-1.5 mt-0.5">
                                <span className={`h-2 w-2 rounded-full ${isSyncActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/50' : 'bg-red-500 shadow-lg shadow-red-500/50'}`}></span>
                                <span className={isSyncActive ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                                    {statusLabel}
                                </span>
                            </span>
                        </div>
                    </div>

                    {/* Input para el Spreadsheet ID */}
                    <div className="space-y-1.5">
                        <label className="block text-sm font-bold text-gray-300 flex items-center gap-1">
                            Google Spreadsheet ID
                            <HelpCircle className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300 cursor-help" title="El identificador único de la hoja de cálculo obtenido de la URL." />
                        </label>
                        <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Ej: 1jPw9ni4BW_bRfw_M9ajA7jO5RGX5IFq8w43T3WOXz6g"
                            className="w-full bg-gray-950/50 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm tracking-wide transition-all shadow-inner"
                            value={spreadsheetId}
                            onChange={(e) => setSpreadsheetId(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 italic">
                            Puedes copiar este ID desde la URL de tu navegador al visualizar el documento de Google Sheets.
                        </p>
                    </div>

                    {/* Input para el Nombre de la Hoja */}
                    <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                        <label className="block text-sm font-bold text-gray-300 flex items-center gap-1">
                            Nombre de la Hoja
                            <HelpCircle className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300 cursor-help" title="El nombre exacto de la pestaña de la hoja de cálculo (ej. SUBSIDIO, FRAN, etc.)." />
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: SUBSIDIO"
                            className="w-full bg-gray-950/50 border border-gray-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono text-sm tracking-wide transition-all shadow-inner"
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 italic">
                            Asegúrate de que la pestaña exista dentro de la planilla de Google Sheets.
                        </p>
                    </div>

                    {/* Alerta de Impacto del Cambio */}
                    <div className="bg-amber-500/5 border border-amber-500/25 rounded-xl p-4 flex gap-3 text-amber-400 text-xs leading-relaxed">
                        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500 mt-0.5" />
                        <div>
                            <span className="font-bold block mb-0.5">¡IMPORTANTE!</span>
                            Modificar la asociación de la planilla afectará directamente todos los procesos automáticos e interactivos de sincronización de datos de este tipo de resolución. Asegúrate de que la nueva planilla seleccionada cuente con el formato y permisos correctos.
                        </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-800/60">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2.5 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800/40 rounded-xl transition-all border border-transparent hover:border-gray-700/50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/30 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Asociar Planilla
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
