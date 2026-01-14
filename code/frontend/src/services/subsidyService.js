import api from '../config/axios';

const subsidyService = {
    getAll: async () => {
        const response = await api.get('/api/subsidies');
        return response.data;
    },

    create: async (orderId, subsidy) => {
        const response = await api.post(`/api/subsidies/order/${orderId}`, subsidy);
        return response.data;
    }
};

export default subsidyService;
