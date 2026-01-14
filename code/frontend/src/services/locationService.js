import api from '../config/axios';

const locationService = {
    getAll: async () => {
        const response = await api.get('/api/locations');
        return response.data;
    },

    create: async (location) => {
        const response = await api.post('/api/locations', location);
        return response.data;
    }
};

export default locationService;
