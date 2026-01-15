import api from '../config/axios';

const orderService = {
    getAll: async (params = {}) => {
        const response = await api.get('/api/orders', { params });
        return response.data;
    },

    create: async (order) => {
        const response = await api.post('/api/orders', order);
        return response.data;
    },

    updateStatus: async (id, status) => {
        const response = await api.put(`/api/orders/${id}/status`, status, {
            headers: { 'Content-Type': 'text/plain' }
        });
        return response.data;
    }
};

export default orderService;
