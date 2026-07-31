import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../config/axios';
import { FileText, Download, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Componente que gestiona la descarga segura de archivos adjuntos.
 * Requiere que el usuario esté autenticado. Si no, lo redirige al Login.
 */
export default function DescargarAdjunto() {
    const { adjuntoId } = useParams();
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [descargando, setDescargando] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Esperar a que la autenticación del contexto termine de cargar
        if (authLoading) return;

        if (!user) {
            // Si el usuario no está autenticado, redirigir a Login con el parámetro de retorno
            const currentPath = location.pathname;
            toast.error("Debe iniciar sesión para descargar este archivo.");
            navigate(`/login?redirectTo=${encodeURIComponent(currentPath)}`);
            return;
        }

        descargarArchivo();
    }, [user, authLoading, adjuntoId]);

    const descargarArchivo = async () => {
        setDescargando(true);
        setError(null);
        try {
            // Petición de tipo blob al endpoint seguro
            const res = await api.get(`/api/solicitudes/adjuntos/${adjuntoId}/download`, {
                responseType: 'blob'
            });

            // Crear el blob y simular el click para descargar
            const contentType = res.headers['content-type'] || 'application/octet-stream';
            const blob = new Blob([res.data], { type: contentType });
            const url = window.URL.createObjectURL(blob);
            
            // Extraer el nombre original del archivo desde las cabeceras si está presente
            const contentDisposition = res.headers['content-disposition'];
            let filename = `adjunto_${adjuntoId}`;
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success("Archivo descargado correctamente.");
        } catch (err) {
            console.error("Error al descargar el archivo adjunto:", err);
            setError("No se pudo descargar el archivo. Es posible que el archivo no exista o que no tenga permisos suficientes.");
            toast.error("Error al descargar el archivo.");
        } finally {
            setDescargando(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-indigo-500 animate-spin" />
                <p className="text-gray-400">Verificando autenticación...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 text-center">
                <div className="mx-auto w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400">
                    <FileText className="h-8 w-8" />
                </div>
                
                <h2 className="text-2xl font-black tracking-tight">Descarga Segura</h2>
                
                {descargando && (
                    <div className="flex flex-col items-center space-y-3">
                        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                        <p className="text-sm text-gray-400">Descargando archivo adjunto...</p>
                    </div>
                )}

                {error && (
                    <div className="space-y-4">
                        <div className="bg-red-900/20 border border-red-800 p-4 rounded-xl flex items-start gap-3 text-left">
                            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                        </div>
                        <button
                            onClick={descargarArchivo}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 px-4 rounded-xl font-bold transition-all shadow-lg text-sm flex items-center justify-center gap-2"
                        >
                            <Download className="h-4 w-4" /> Reintentar Descarga
                        </button>
                    </div>
                )}

                {!descargando && !error && (
                    <div className="space-y-2">
                        <p className="text-sm text-green-400 font-bold">¡Descarga exitosa!</p>
                        <p className="text-xs text-gray-400">El archivo se ha transferido a su dispositivo.</p>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-700/50">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="text-xs text-gray-500 hover:text-white flex items-center gap-2 mx-auto transition-colors"
                    >
                        <ArrowLeft className="h-3 w-3" /> Ir al Panel Principal
                    </button>
                </div>
            </div>
        </div>
    );
}
