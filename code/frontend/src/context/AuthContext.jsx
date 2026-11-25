import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import api from '../config/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole'));
    const [activeTipoResolucion, setActiveTipoResolucion] = useState(localStorage.getItem('activeTipoResolucion'));

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }, [token]);

    useEffect(() => {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
        } else {
            localStorage.removeItem('user');
        }
    }, [user]);

    const selectTipoResolucion = (tipo) => {
        setActiveTipoResolucion(tipo);
        if (tipo) {
            localStorage.setItem('activeTipoResolucion', tipo);
        } else {
            localStorage.removeItem('activeTipoResolucion');
        }
    };

    const selectRole = (role, tipoResolucion = null) => {
        setActiveRole(role);
        if (role) {
            localStorage.setItem('activeRole', role);
        } else {
            localStorage.removeItem('activeRole');
        }

        if (role && role.toUpperCase() === 'RESOLUTOR') {
            selectTipoResolucion(tipoResolucion || null);
        } else {
            selectTipoResolucion(null);
        }
    };

    const login = async (email, password) => {
        try {
            // Point to Backend API using configured instance
            const response = await api.post('/api/auth/login', {
                email,
                password,
            });
            const newToken = response.data.token;
            setToken(newToken);
            localStorage.setItem('token', newToken); // Save immediately for the next request

            // Fetch full profile info
            try {
                const profileRes = await api.get('/api/users/me', {
                    headers: { Authorization: `Bearer ${newToken}` }
                });
                const finalUser = {
                    ...profileRes.data.user,
                    responsable: profileRes.data.responsable
                };
                
                // Si el usuario tiene un solo rol, lo seleccionamos por defecto
                const roles = finalUser.role ? finalUser.role.split(',') : [];
                if (roles.length === 1) {
                    const onlyRole = roles[0].trim();
                    const tipos = finalUser.tiposResolucion || [];
                    const defaultTipo = onlyRole.toUpperCase() === 'RESOLUTOR' && tipos.length === 1 ? tipos[0].tipo : null;
                    selectRole(onlyRole, defaultTipo);
                } else {
                    selectRole(null, null); // Obliga a elegir
                }
                
                setUser(finalUser);
                return finalUser;
            } catch (err) {
                console.error("Failed to fetch full profile", err);
                // Fallback to basic info from login
                const fallbackUser = {
                    email: response.data.email,
                    role: response.data.role
                };
                
                const roles = fallbackUser.role ? fallbackUser.role.split(',') : [];
                if (roles.length === 1) {
                    selectRole(roles[0].trim());
                } else {
                    selectRole(null);
                }
                
                setUser(fallbackUser);
                return fallbackUser;
            }
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setActiveRole(null);
        setActiveTipoResolucion(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('activeRole');
        localStorage.removeItem('activeTipoResolucion');
    };

    const [loading, setLoading] = useState(false);

    // Try to restore user profile fully on load if token exists but user lacks responsable details
    useEffect(() => {
        const needsRefresh = token && user && (
            !user.id || 
            (user.role === 'RESPONSABLE' && user.responsable === undefined)
        );

        if (needsRefresh) {
            api.get('/api/users/me')
                .then(res => {
                    const userData = res.data.user;
                    const responsableData = res.data.responsable;
                    
                    // Solo actualizar si realmente hay datos nuevos o diferentes para evitar loops
                    setUser(prev => {
                        if (prev && prev.id === userData.id && prev.responsable === responsableData) {
                            return prev;
                        }
                        return {
                            ...userData,
                            responsable: responsableData
                        };
                    });
                })
                .catch(err => {
                    console.error("Could not refresh user profile", err);
                    if (err.response?.status === 401) {
                        logout(); // Invalid token
                    }
                });
        }
    }, [token, user?.id, user?.role, user?.responsable]); // Dependencias más específicas

    const virtualUser = useMemo(() => {
        if (!user) return null;
        return {
            ...user,
            role: activeRole || user.role
        };
    }, [user, activeRole]);

    const allRoles = useMemo(() => {
        if (!user || !user.role) return [];
        return user.role.split(',').map(r => r.trim());
    }, [user]);

    const contextValue = useMemo(() => ({
        token,
        isAuthenticated: !!token,
        login,
        logout,
        user: virtualUser,
        allRoles,
        selectRole,
        activeRole,
        activeTipoResolucion,
        selectTipoResolucion,
        loading
    }), [token, virtualUser, allRoles, activeRole, activeTipoResolucion, loading]);

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
};
