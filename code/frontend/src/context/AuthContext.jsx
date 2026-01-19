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
            setToken(response.data.token);
            setUser({
                email: response.data.email,
                role: response.data.role
            });
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

    const [loading, setLoading] = useState(false); // Can be improved with actual token validation

    return (
        <AuthContext.Provider value={{ token, isAuthenticated: !!token, login, logout, user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
