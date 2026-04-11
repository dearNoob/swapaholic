import api from './axios';

type AdminContentPayload = Record<string, unknown>;

export const adminApi = {
    // Dashboard
    getDashboardStats: async () => {
        const response = await api.get('/admin/dashboard/stats');
        return response.data;
    },

    // User Management
    getUsers: async (params?: { status?: string; role?: string; search?: string; page?: number; limit?: number }) => {
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
    getAllOrders: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
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

    updateContent: async (type: string, content: AdminContentPayload) => {
        const response = await api.put(`/admin/content/${type}`, content);
        return response.data;
    },

    // System Health
    getSystemHealth: async () => {
        const response = await api.get('/admin/dashboard/health');
        return response.data;
    },

    // Top Performers
    getTopPerformers: async () => {
        const response = await api.get('/admin/dashboard/top-performers');
        return response.data;
    },

    // Revenue Stats
    getRevenueStats: async () => {
        const response = await api.get('/admin/dashboard/revenue');
        return response.data;
    },

    // User Growth
    getUserGrowth: async () => {
        const response = await api.get('/admin/dashboard/user-growth');
        return response.data;
    },

    // Suspend User
    suspendUser: async (userId: string, reason: string, duration?: number) => {
        const response = await api.put(`/admin/users/${userId}/suspend`, { reason, duration });
        return response.data;
    },

    // Unsuspend User
    unsuspendUser: async (userId: string) => {
        const response = await api.put(`/admin/users/${userId}/unsuspend`);
        return response.data;
    },

    // Get User Profile (admin view)
    getUserProfile: async (userId: string) => {
        const response = await api.get(`/admin/users/${userId}`);
        return response.data;
    },

    // Get User Transactions
    getUserTransactions: async (userId: string) => {
        const response = await api.get(`/admin/users/${userId}/transactions`);
        return response.data;
    },

    // Get User Support Tickets
    getUserTickets: async (userId: string) => {
        const response = await api.get(`/admin/users/${userId}/tickets`);
        return response.data;
    },

    // Get Dispute Details
    getDisputeDetails: async (orderId: string) => {
        const response = await api.get(`/admin/disputes/${orderId}`);
        return response.data;
    },

    // Dispute Stats
    getDisputeStats: async () => {
        const response = await api.get('/admin/disputes/stats/overview');
        return response.data;
    },

    // Assign Dispute
    assignDispute: async (orderId: string, assignedAdminId: string) => {
        const response = await api.put(`/admin/disputes/${orderId}/assign`, { assignedAdminId });
        return response.data;
    },

    // Add Investigation Notes
    addInvestigationNotes: async (orderId: string, notes: string) => {
        const response = await api.post(`/admin/disputes/${orderId}/notes`, { notes });
        return response.data;
    },

    // Get All Products (admin view)
    getAllProducts: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/admin/products', { params });
        return response.data;
    },

    // Remove Product
    removeProduct: async (productId: string) => {
        const response = await api.delete(`/admin/products/${productId}`);
        return response.data;
    },

    // Logistics Officer Management
    getLogisticsOfficers: async (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
        const response = await api.get('/admin/logistics-officers', { params });
        return response.data;
    },

    approveLogisticsOfficer: async (userId: string) => {
        const response = await api.put(`/admin/logistics-officers/${userId}/approve`);
        return response.data;
    },

    rejectLogisticsOfficer: async (userId: string, reason: string) => {
        const response = await api.put(`/admin/logistics-officers/${userId}/reject`, { reason });
        return response.data;
    },

    getLogisticsOfficerDetail: async (userId: string) => {
        const response = await api.get(`/admin/logistics-officers/${userId}/detail`);
        return response.data;
    },
};
