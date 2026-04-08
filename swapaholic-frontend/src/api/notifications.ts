import api from './axios';

export interface Notification {
    id: string;
    type: 'bid' | 'payment' | 'delivery' | 'dispute' | 'system' | 'verification' | 'new_product_match';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: any;
    actionUrl?: string;
}

export const notificationApi = {
    getAll: async () => {
        const response = await api.get('/notifications');
        return response.data;
    },

    getUnreadCount: async () => {
        const response = await api.get('/notifications/unread/count');
        return response.data;
    },

    markAsRead: async (notificationId: string) => {
        const response = await api.put(`/notifications/${notificationId}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.put('/notifications/read-all');
        return response.data;
    },

    delete: async (notificationId: string) => {
        const response = await api.delete(`/notifications/${notificationId}`);
        return response.data;
    },
};
