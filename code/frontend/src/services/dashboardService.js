import api from '../config/axios';

const dashboardService = {
    getStats: async (type = '', year = '') => {
        const response = await api.get('/api/dashboard/stats', {
            params: { type, year }
        });
        return response.data;
    }
};

export default dashboardService;
