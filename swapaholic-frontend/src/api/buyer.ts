import api from './axios';

export const buyerApi = {
    // Get buyer dashboard data
    getDashboard: async () => {
        const response = await api.get('/buyer/dashboard');
        return response.data;
    },

    // Get recommended products based on user preferences
    getRecommendedProducts: async (limit: number = 6) => {
        const response = await api.get(`/buyer/recommendations?limit=${limit}`);
        return response.data;
    },

    // Get ongoing auctions where user has bids
    getOngoingAuctions: async () => {
        const response = await api.get('/buyer/ongoing-auctions');
        return response.data;
    },

    // Get recent activity
    getRecentActivity: async (limit: number = 10) => {
        const response = await api.get(`/buyer/activity?limit=${limit}`);
        return response.data;
    },

    // Get personalized feed
    getPersonalizedFeed: async (limit: number = 8) => {
        const response = await api.get(`/buyer/feed?limit=${limit}`);
        return response.data;
    },

    // Get quick stats
    getQuickStats: async () => {
        const response = await api.get('/buyer/stats');
        return response.data;
    },
};
