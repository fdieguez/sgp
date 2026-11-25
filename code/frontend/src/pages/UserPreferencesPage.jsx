import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from '../components/Navbar';
import AparienciaPanel from '../components/AparienciaPanel';

/**
 * Pantalla de Configuración / Preferencias personales accesible para todos los roles.
 */
export default function UserPreferencesPage() {
    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-8 max-w-5xl mx-auto space-y-6">
                <Link
                    to="/dashboard"
                    className="inline-flex items-center text-gray-400 hover:text-white transition-colors group text-sm"
                >
                    <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                    Volver al Inicio
                </Link>

                <div>
                    <h1 className="text-3xl font-black tracking-tight text-white">Configuración</h1>
                    <p className="text-gray-400 text-sm mt-1">Preferencias visuales de tu cuenta en la plataforma</p>
                </div>

                <AparienciaPanel />
            </div>
        </div>
    );
}
