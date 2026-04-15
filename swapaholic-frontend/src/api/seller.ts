import api from './axios';

export const sellerApi = {
    // Get seller dashboard data (revenue, listings, sales, trends)
    getDashboardData: async () => {
        const response = await api.get('/seller/dashboard');
        return response.data;
    },

    // Get all seller's listings with stats
    getListings: async () => {
        const response = await api.get('/seller/listings');
        return response.data;
    },

    // Delete one of the seller's listings using the same authenticated client
    deleteListing: async (id: string) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },

    // Get sales analytics by period
    getSalesAnalytics: async (period: '7d' | '30d' | '90d' = '30d') => {
        const response = await api.get(`/seller/analytics?period=${period}`);
        return response.data;
    },

    // Get seller's orders
    getOrders: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await api.get('/seller/orders', { params });
        return response.data;
    },

    // Update order status
    updateOrderStatus: async (orderId: string, status: string, trackingNumber?: string) => {
        const response = await api.put(`/orders/${orderId}`, { status, trackingNumber });
        return response.data;
    },

    // Get recent orders for dashboard
    getRecentOrders: async (limit: number = 5) => {
        const response = await api.get(`/seller/orders/recent?limit=${limit}`);
        return response.data;
    },

    // Get performance metrics
    getPerformanceMetrics: async () => {
        const response = await api.get('/seller/performance');
        return response.data;
    },

    // Get recent bids
    getRecentBids: async (limit: number = 5) => {
        const response = await api.get(`/seller/bids/recent?limit=${limit}`);
        return response.data;
    },

    // Get all bids (paginated)
    getAllBids: async (page: number = 1, limit: number = 10) => {
        const response = await api.get(`/seller/bids/recent?page=${page}&limit=${limit}`);
        return response.data;
    },

    // Get earnings summary
    getEarningsSummary: async () => {
        const response = await api.get('/seller/earnings');
        return response.data;
    },

    // Get comprehensive analytics data
    getAnalytics: async (period: '7d' | '30d' | '90d' | '1y' = '30d') => {
        const response = await api.get(`/seller/analytics/comprehensive?period=${period}`);
        return response.data;
    },

    // Export analytics to PDF or CSV
    exportAnalytics: async (format: 'pdf' | 'csv', period: '7d' | '30d' | '90d' | '1y' = '30d') => {
        const response = await api.get(`/seller/analytics/export?format=${format}&period=${period}`, {
            responseType: 'blob',
        });

        // Create download link
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `analytics-report-${period}.${format}`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        return response.data;
    },
};
