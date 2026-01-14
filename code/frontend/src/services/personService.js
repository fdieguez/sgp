import api from '../config/axios';

const personService = {
    getAll: async (search = '') => {
        const response = await api.get('/api/persons', {
            params: { search }
        });
        return response.data;
    },

    create: async (person) => {
        const response = await api.post('/api/persons', person);
        return response.data;
    }
};

export default personService;
