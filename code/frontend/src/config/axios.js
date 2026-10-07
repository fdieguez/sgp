import axios from 'axios';
import toast from 'react-hot-toast';

const getBaseUrl = () => {
    if (window.ENV && window.ENV.API_URL) {
        return window.ENV.API_URL;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

// Interceptor de peticiones para inyectar token JWT y rol activo
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        const activeRole = localStorage.getItem('activeRole');
        if (activeRole) {
            config.headers['X-Active-Role'] = activeRole;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Bandera para evitar ejecuciones o redirecciones múltiples simultáneas
let isHandlingAuthError = false;

// Interceptor de respuestas para capturar expiración de sesión (401/403)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const requestUrl = error.config?.url || '';
        const isAuthLoginRequest = requestUrl.includes('/api/auth/login');

        // Si la petición no es de login y devuelve 401 (Unauthorized) o 403 (Forbidden)
        if ((status === 401 || status === 403) && !isAuthLoginRequest) {
            const currentPath = window.location.pathname;

            if (!isHandlingAuthError && currentPath !== '/login') {
                isHandlingAuthError = true;

                // Limpieza de credenciales locales
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                localStorage.removeItem('activeRole');

                // Notificación amigable al usuario con ID único para evitar toasts duplicados
                toast.error('Su sesión ha expirado. Por favor inicie sesión nuevamente', {
                    id: 'session-expired-toast',
                    duration: 4000,
                });

                // Redirección suave a la pantalla de login
                setTimeout(() => {
                    window.location.href = '/login';
                    isHandlingAuthError = false;
                }, 400);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
