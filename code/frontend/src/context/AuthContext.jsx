import { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('user');
        return savedUser ? JSON.parse(savedUser) : null;
    });

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
            // Interceptor handles the header
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
                setUser({
                    ...profileRes.data.user,
                    responsable: profileRes.data.responsable
                });
            } catch (err) {
                console.error("Failed to fetch full profile", err);
                // Fallback to basic info from login
                setUser({
                    email: response.data.email,
                    role: response.data.role
                });
            }
            return true;
        } catch (error) {
            console.error("Login failed", error);
            throw error;
        }
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    const [loading, setLoading] = useState(false);

    // Try to restore user profile fully on load if token exists but user lacks responsable details
    useEffect(() => {
        if (token && user && (!user.id || (user.role === 'RESPONSABLE' && user.responsable === undefined))) {
            api.get('/api/users/me')
                .then(res => {
                    setUser({
                        ...res.data.user,
                        responsable: res.data.responsable
                    });
                })
                .catch(err => {
                    console.error("Could not refresh user profile", err);
                    if (err.response?.status === 401) {
                        logout(); // Invalid token
                    }
                });
        }
    }, [token]);

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
