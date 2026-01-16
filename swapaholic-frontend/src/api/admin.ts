import api from './axios';

export const adminApi = {
    // Dashboard
    getDashboardStats: async () => {
        const response = await api.get('/admin/dashboard/stats');
        return response.data;
    },

    // User Management
    getUsers: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/admin/users', { params });
        return response.data;
    },

    verifyUser: async (userId: string) => {
        const response = await api.put(`/admin/users/${userId}/verify`);
        return response.data;
    },

    banUser: async (userId: string, reason: string) => {
        const response = await api.put(`/admin/users/${userId}/ban`, { reason });
        return response.data;
    },

    unbanUser: async (userId: string) => {
        const response = await api.put(`/admin/users/${userId}/unban`);
        return response.data;
    },

    // View User Dashboard (buyer or seller view)
    getUserDashboard: async (userId: string, viewAs: 'buyer' | 'seller') => {
        const response = await api.get(`/admin/users/${userId}/dashboard`, { params: { viewAs } });
        return response.data;
    },

    // Product Moderation
    getPendingProducts: async (params?: { page?: number; limit?: number }) => {
        const response = await api.get('/admin/products/pending', { params });
        return response.data;
    },

    approveProduct: async (productId: string) => {
        const response = await api.put(`/admin/products/${productId}/approve`);
        return response.data;
    },

    rejectProduct: async (productId: string, reason: string) => {
        const response = await api.put(`/admin/products/${productId}/reject`, { reason });
        return response.data;
    },

    // Order Oversight
    getAllOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/admin/orders', { params });
        return response.data;
    },

    updateOrderStatus: async (orderId: string, status: string) => {
        const response = await api.put(`/admin/orders/${orderId}/status`, { status });
        return response.data;
    },

    // Dispute Resolution
    getAllDisputes: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/admin/disputes', { params });
        return response.data;
    },

    resolveDispute: async (disputeId: string, decision: string, notes: string) => {
        const response = await api.put(`/admin/disputes/${disputeId}/resolve`, { decision, notes });
        return response.data;
    },

    // Platform Analytics
    getPlatformAnalytics: async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
        const response = await api.get(`/admin/analytics?period=${period}`);
        return response.data;
    },

    // Content Management
    getContent: async (type: string) => {
        const response = await api.get(`/admin/content/${type}`);
        return response.data;
    },

    updateContent: async (type: string, content: any) => {
        const response = await api.put(`/admin/content/${type}`, content);
        return response.data;
    },
};
