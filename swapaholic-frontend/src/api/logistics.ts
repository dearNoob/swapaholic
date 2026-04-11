import apiClient from '../lib/apiClient';

type QualityChecklist = Record<string, unknown>;
type DeliveryLocation = {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    [key: string]: unknown;
};

export interface LogisticsDashboardStats {
    qc: {
        total: number;
        pending: number;
        myInReview: number;
        myApproved: number;
        myRejected: number;
    };
    delivery: {
        total: number;
        active: number;
        completed: number;
        failed: number;
    };
    today: {
        deliveriesCompleted: number;
        qcCompleted: number;
        totalCompleted: number;
    };
}

export interface LogisticsPagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export interface LogisticsOrderRef {
    _id: string;
    status?: string;
    finalPrice?: number;
    buyerId?: string;
    sellerId?: string;
    productId?: string;
}

export interface LogisticsProductSummary {
    title?: string;
    images?: string[];
    category?: string;
}

export interface LogisticsSellerSummary {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

export interface LogisticsBuyerSummary {
    id?: string;
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
}

export interface LogisticsTask {
    _id: string;
    type: 'qc' | 'delivery';
    orderId?: LogisticsOrderRef | null;
    product?: LogisticsProductSummary | null;
    seller?: LogisticsSellerSummary | null;
    buyer?: LogisticsBuyerSummary | null;
    status: string;
    createdAt?: string;
    reviewedAt?: string;
    pickupLocation?: string;
    deliveryLocation?: string;
    estimatedArrival?: string;
    pickupTime?: string;
    deliveryTime?: string;
    amount?: number;
    qualityScore?: number;
    inspectionNotes?: string;
    notes?: string;
}

export interface LogisticsTasksResponse {
    tasks: LogisticsTask[];
    pagination: LogisticsPagination;
}

export interface LogisticsTaskHistoryItem {
    _id: string;
    type: 'qc' | 'delivery';
    status: string;
    orderId?: LogisticsOrderRef | null;
    product?: LogisticsProductSummary | null;
    seller?: LogisticsSellerSummary | null;
    buyer?: LogisticsBuyerSummary | null;
    pickupLocation?: string;
    deliveryLocation?: string;
    amount?: number;
    completedAt?: string;
    qualityScore?: number;
}

export interface LogisticsTaskHistoryResponse {
    history: LogisticsTaskHistoryItem[];
    pagination: LogisticsPagination;
}

export const logisticsApi = {
    // Dashboard stats
    getDashboardStats: async (): Promise<LogisticsDashboardStats> => {
        const response = await apiClient.get<LogisticsDashboardStats>('/logistics/dashboard/stats');
        return response.data;
    },

    // Get active tasks (QC + delivery combined)
    getMyTasks: async (params?: { type?: string; status?: string; page?: number; limit?: number }): Promise<LogisticsTasksResponse> => {
        const response = await apiClient.get<LogisticsTasksResponse>('/logistics/tasks', { params });
        return response.data;
    },

    // Get task history
    getTaskHistory: async (params?: { page?: number; limit?: number }): Promise<LogisticsTaskHistoryResponse> => {
        const response = await apiClient.get<LogisticsTaskHistoryResponse>('/logistics/tasks/history', { params });
        return response.data;
    },

    // Pickup order (auto-assign QC + delivery)
    pickupOrder: async (orderId: string): Promise<{
        message: string;
        qc: { id: string; status: string } | null;
        delivery: { id: string; status: string };
    }> => {
        const response = await apiClient.post<{
            message: string;
            qc: { id: string; status: string } | null;
            delivery: { id: string; status: string };
        }>(`/logistics/tasks/${orderId}/pickup`);
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

    reviewQC: async (qcId: string, qualityChecklist?: QualityChecklist) => {
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

    updateDeliveryStatus: async (orderId: string, data: { status: string; currentLocation?: DeliveryLocation; notes?: string; proofOfDelivery?: string }): Promise<{ status?: string }> => {
        const response = await apiClient.put<{ status?: string }>(`/logistics/delivery/${orderId}/status`, data);
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
