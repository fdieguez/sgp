import axios from 'axios';

const getBaseUrl = () => {
    if (window.ENV && window.ENV.API_URL) {
        return window.ENV.API_URL;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:8080';
};

const api = axios.create({
    baseURL: getBaseUrl(),
});

// Add a request interceptor to inject the token and active role if they exist
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

export default api;
