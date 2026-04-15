import { useState } from 'react';
import Navbar from '../components/Navbar';
import UsersPage from './UsersPage';
import TiposResolucionABM from '../components/TiposResolucionABM';
import AtributosABM from '../components/AtributosABM';
import { Users, FileText, Settings, Key } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('USERS');

    return (
        <div className="min-h-screen bg-gray-900 text-white">
            <Navbar />
            <div className="p-8 max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-white mb-2">Configuración</h1>
                        <p className="text-gray-500 font-medium">Panel de administración global del sistema</p>
                    </div>
                </div>

                <div className="flex border-b border-gray-700/50 mb-8 space-x-8">
                    <button
                        onClick={() => setActiveTab('USERS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'USERS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Users className="h-4 w-4" />
                        Usuarios
                    </button>
                    <button
                        onClick={() => setActiveTab('TIPOS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'TIPOS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <FileText className="h-4 w-4" />
                        Tipos de Resolución
                    </button>
                    <button
                        onClick={() => setActiveTab('ATRIBUTOS')}
                        className={`pb-4 flex items-center gap-2 font-bold uppercase text-xs tracking-widest transition-all ${activeTab === 'ATRIBUTOS' ? 'text-indigo-400 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Settings className="h-4 w-4" />
                        Catálogo de Atributos
                    </button>
                </div>

                <div className="animate-in fade-in duration-500">
                    {activeTab === 'USERS' && (
                        <div className="bg-gray-800/40 p-6 rounded-3xl border border-gray-700/50 backdrop-blur-sm shadow-xl min-h-[500px] relative overflow-hidden">
                           <div className="absolute inset-0 z-0 opacity-5 pointer-events-none overflow-hidden scale-[1.02]">
                                <UsersPage isEmbedded={true} />
                           </div>
                           <div className="relative z-10 w-full h-full">
                               <UsersPage />
                           </div>
                        </div>
                    )}
                    {activeTab === 'TIPOS' && <TiposResolucionABM />}
                    {activeTab === 'ATRIBUTOS' && <AtributosABM />}
                </div>
            </div>
        </div>
    );
}
