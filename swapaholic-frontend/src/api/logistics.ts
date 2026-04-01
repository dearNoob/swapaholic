import apiClient from '../lib/apiClient';

export const logisticsApi = {
    // Dashboard stats
    getDashboardStats: async () => {
        const response = await apiClient.get('/logistics/dashboard/stats');
        return response.data;
    },

    // Get active tasks (QC + delivery combined)
    getMyTasks: async (params?: { type?: string; status?: string; page?: number; limit?: number }) => {
        const response = await apiClient.get('/logistics/tasks', { params });
        return response.data;
    },

    // Get task history
    getTaskHistory: async (params?: { page?: number; limit?: number }) => {
        const response = await apiClient.get('/logistics/tasks/history', { params });
        return response.data;
    },

    // Pickup order (auto-assign QC + delivery)
    pickupOrder: async (orderId: string) => {
        const response = await apiClient.post(`/logistics/tasks/${orderId}/pickup`);
        return response.data;
    },

    // QC Operations
    getQCList: async (params?: { status?: string; page?: number; limit?: number }) => {
        const response = await apiClient.get('/logistics/qc/list', { params });
        return response.data;
    },

    getQCStats: async () => {
        const response = await apiClient.get('/logistics/qc/stats');
        return response.data;
    },

    getQCStatus: async (orderId: string) => {
        const response = await apiClient.get(`/logistics/qc/${orderId}/status`);
        return response.data;
    },

    initiateQC: async (data: { orderId: string; inspectionNotes?: string; images?: string[] }) => {
        const response = await apiClient.post('/logistics/qc/initiate', data);
        return response.data;
    },

    reviewQC: async (qcId: string, qualityChecklist?: any) => {
        const response = await apiClient.put(`/logistics/qc/${qcId}/review`, { qualityChecklist });
        return response.data;
    },

    approveQC: async (qcId: string, data?: { qualityValidation?: number; notes?: string }) => {
        const response = await apiClient.put(`/logistics/qc/${qcId}/approve`, data);
        return response.data;
    },

    rejectQC: async (qcId: string, data: { rejectionReason: string; notes?: string }) => {
        const response = await apiClient.put(`/logistics/qc/${qcId}/reject`, data);
        return response.data;
    },

    // Delivery Operations
    getActiveDeliveries: async (params?: { page?: number; limit?: number }) => {
        const response = await apiClient.get('/logistics/delivery/active', { params });
        return response.data;
    },

    getDeliveryStats: async () => {
        const response = await apiClient.get('/logistics/delivery/stats');
        return response.data;
    },

    trackDelivery: async (orderId: string) => {
        const response = await apiClient.get(`/logistics/delivery/${orderId}/track`);
        return response.data;
    },

    updateDeliveryStatus: async (orderId: string, data: { status: string; currentLocation?: any; notes?: string; proofOfDelivery?: string }) => {
        const response = await apiClient.put(`/logistics/delivery/${orderId}/status`, data);
        return response.data;
    },

    // Profile
    getMyProfile: async () => {
        const response = await apiClient.get('/logistics/profile');
        return response.data;
    },

    updateMyProfile: async (data: { firstName?: string; lastName?: string; phone?: string; bio?: string }) => {
        const response = await apiClient.put('/logistics/profile', data);
        return response.data;
    },
};
