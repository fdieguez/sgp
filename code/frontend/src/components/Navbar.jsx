import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Users, HelpCircle, LogOut } from 'lucide-react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="bg-gray-800 border-b border-gray-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <LayoutDashboard className="h-8 w-8 text-indigo-500" />
                        <Link to="/dashboard" className="ml-2 text-xl font-bold text-white hover:text-indigo-400 transition-colors tracking-tight">
                            Panel SGP
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="hidden md:flex flex-col items-end mr-2 text-right">
                                <span className="text-sm font-bold text-white uppercase">{user.firstName} {user.lastName}</span>
                                <span className="text-[10px] tracking-widest uppercase text-indigo-400 font-black">{user.role === 'ADMIN' ? 'Administrador' : 'Responsable'}</span>
                            </div>
                        )}
                        {user?.role === 'ADMIN' && (
                            <button
                                onClick={() => navigate('/users')}
                                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                            >
                                <Users className="h-5 w-5" />
                                <span className="hidden sm:inline">Usuarios</span>
                            </button>
                        )}
                        <button
                            onClick={() => navigate('/help')}
                            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                        >
                            <HelpCircle className="h-5 w-5" />
                            <span className="hidden sm:inline">Ayuda</span>
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
                        >
                            <LogOut className="h-5 w-5" />
                            <span className="hidden sm:inline">Salir</span>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
