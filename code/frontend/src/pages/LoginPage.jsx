import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck, ArrowRight } from 'lucide-react';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Capturar la URL de redirección si existe
    const queryParams = new URLSearchParams(location.search);
    const redirectTo = queryParams.get('redirectTo');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const loggedInUser = await login(email, password);
            if (redirectTo) {
                navigate(redirectTo);
            } else if (loggedInUser && (loggedInUser.role === 'ADMINISTRADOR' || loggedInUser.role === 'AUDITOR')) {
                navigate('/dashboard');
            } else {
                navigate('/mis-solicitudes');
            }
        } catch (err) {
            setError('Credenciales inválidas. Verifique su correo y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
            {/* Círculos decorativos de fondo con desenfoque */}
            <div className="absolute top-[-15%] left-[-10%] w-[45vw] h-[45vw] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none"></div>
            <div className="absolute bottom-[-15%] right-[-10%] w-[45vw] h-[45vw] bg-emerald-600/10 rounded-full blur-[140px] pointer-events-none"></div>

            {/* Contenedor de la Tarjeta Central */}
            <div className="w-full max-w-md bg-gray-900/80 border border-gray-800/90 backdrop-blur-2xl rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10 space-y-6">
                
                {/* Cabecera institucional con Logo Oficial */}
                <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-3xl blur opacity-30 group-hover:opacity-50 transition duration-700"></div>
                        <div className="relative bg-gray-950/80 border border-gray-800 p-3.5 rounded-3xl shadow-xl flex items-center justify-center">
                            <img 
                                src="/logo-sgp.svg" 
                                alt="SGP - Sistema de Gestión Política" 
                                className="h-14 w-14 drop-shadow-md"
                            />
                        </div>
                    </div>

                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        SGP — MÓDULO GESTIÓN DE PEDIDOS
                    </span>

                    <div className="space-y-1.5">
                        <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-100 to-gray-300">
                            Sistema de Gestión Política
                        </h1>
                        <p className="text-xs sm:text-sm text-gray-400 leading-relaxed font-medium max-w-sm mx-auto">
                            Plataforma integral de gestión territorial y resolución de demandas ciudadanas e institucionales.
                        </p>
                    </div>
                </div>

                {/* Formulario de Login */}
                <form className="space-y-5" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        {/* Campo Email */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-300 tracking-wide uppercase">
                                Correo Electrónico
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="email-address"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    className="block w-full rounded-2xl border border-gray-800 bg-gray-950/60 py-3 pl-10 pr-4 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="usuario@dominio.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Campo Contraseña */}
                        <div className="space-y-1.5">
                            <label className="block text-xs font-semibold text-gray-300 tracking-wide uppercase">
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    required
                                    className="block w-full rounded-2xl border border-gray-800 bg-gray-950/60 py-3 pl-10 pr-11 text-sm text-white placeholder:text-gray-500 focus:border-indigo-500 focus:bg-gray-950 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                    placeholder="••••••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-gray-400 hover:text-white transition-colors"
                                    onClick={() => setShowPassword(!showPassword)}
                                    tabIndex={-1}
                                    aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Mensaje de Error */}
                    {error && (
                        <div className="text-rose-300 text-xs text-center bg-rose-950/50 border border-rose-800/60 p-3 rounded-2xl animate-shake">
                            {error}
                        </div>
                    )}

                    {/* Botón Ingresar */}
                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-indigo-800 hover:from-indigo-500 hover:to-indigo-600 px-4 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-900/30 border border-indigo-400/20 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span>Verificando acceso...</span>
                                </>
                            ) : (
                                <>
                                    <span>Ingresar a la Plataforma</span>
                                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* Sello de Seguridad */}
                <div className="pt-4 border-t border-gray-800/70 text-center flex items-center justify-center gap-2 text-[11px] text-gray-500 font-medium">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Acceso institucional seguro • Cifrado SSL de 256 bits</span>
                </div>
            </div>

            {/* Pie de Página */}
            <div className="text-center text-[10px] font-mono tracking-widest text-gray-600 mt-6 z-10">
                SGP PLATFORM • v1.0 • GOBIERNO TERRITORIAL
            </div>
        </div>
    );
}
