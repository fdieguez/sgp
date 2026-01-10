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

// Add a request interceptor to inject the token if it exists
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
