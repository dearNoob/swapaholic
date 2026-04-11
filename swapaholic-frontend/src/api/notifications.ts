import api from './axios';

export interface Notification {
    id: string;
    type: 'bid' | 'payment' | 'delivery' | 'dispute' | 'system' | 'verification' | 'new_product_match';
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
    metadata?: Record<string, unknown>;
    actionUrl?: string;
}

interface NotificationApiPayload extends Omit<Notification, 'id' | 'isRead'> {
    _id?: string;
    id?: string;
    read?: boolean;
    isRead?: boolean;
}

export const notificationApi = {
    getAll: async () => {
        const response = await api.get('/notifications');
        const data = response.data;
        const notifications = Array.isArray(data) ? data : (data.notifications || []);
        
        return notifications.map((n: NotificationApiPayload) => ({
            ...n,
            id: n._id || n.id,
            isRead: n.read !== undefined ? n.read : n.isRead,
            createdAt: n.createdAt
        }));
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
