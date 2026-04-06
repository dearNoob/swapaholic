import api from './axios';

export const contentApi = {
    // Public Content Fetching
    getContent: async (type: string) => {
        const response = await api.get(`/public/content/${type}`);
        return response.data;
    }
};
