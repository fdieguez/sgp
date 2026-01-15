import api from '../config/axios';

const dashboardService = {
    getStats: async () => {
        const response = await api.get('/api/dashboard/stats');
        return response.data;
    }
};

export default dashboardService;
