import api from './axios';

export const reportsApi = {
    // Report a product
    reportProduct: async (productId: string, reason: string, details: string) => {
        const response = await api.post('/reports/product', {
            productId,
            reason,
            details,
        });
        return response.data;
    },

    // Report a user
    reportUser: async (userId: string, reason: string, details: string) => {
        const response = await api.post('/reports/user', {
            userId,
            reason,
            details,
        });
        return response.data;
    },

    // Report a review
    reportReview: async (reviewId: string, reason: string, details: string) => {
        const response = await api.post('/reports/review', {
            reviewId,
            reason,
            details,
        });
        return response.data;
    },

    // Flag inappropriate content (general)
    flagContent: async (contentType: string, contentId: string, reason: string, details: string) => {
        const response = await api.post('/reports/flag', {
            contentType,
            contentId,
            reason,
            details,
        });
        return response.data;
    },

    // Admin: Get all reports
    getAllReports: async (params?: { status?: string; type?: string; page?: number }) => {
        const response = await api.get('/admin/reports', { params });
        return response.data;
    },

    // Admin: Review report
    reviewReport: async (reportId: string, action: 'dismiss' | 'action_taken' | 'escalate', notes: string) => {
        const response = await api.put(`/admin/reports/${reportId}/review`, {
            action,
            notes,
        });
        return response.data;
    },

    // Admin: Get report details
    getReportDetails: async (reportId: string) => {
        const response = await api.get(`/admin/reports/${reportId}`);
        return response.data;
    },

    // Get report reasons
    getReportReasons: async (type: 'product' | 'user' | 'review' | 'content') => {
        const response = await api.get(`/reports/reasons/${type}`);
        return response.data;
    },
};
