import { useState } from 'react';
import api from '../config/axios';
import { X, Loader2, FileSpreadsheet } from 'lucide-react';

export default function CreateConfigModal({ isOpen, onClose, onSuccess }) {
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [sheetName, setSheetName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/api/config', {
                spreadsheetId,
                sheetName
            });
            setSpreadsheetId('');
            setSheetName('');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
            setError('Error al crear la configuración. Verifica los datos.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-700 bg-gray-900/50">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-indigo-500" />
                        Nueva Planilla
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Spreadsheet ID
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: 1wbFbc2CAX4w..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                            value={spreadsheetId}
                            onChange={(e) => setSpreadsheetId(e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            El código largo en la URL de tu Google Sheet.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Nombre de la Hoja
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Ej: Hoja 1"
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded border border-red-900/50">
                            {error}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Guardar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
