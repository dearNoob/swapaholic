import api from './axios';

export interface Notification {
    id: string;
    type: string;
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

type NotificationPayload = Partial<Notification> & {
    _id?: string;
    id?: string;
    read?: boolean;
    isRead?: boolean;
    timestamp?: string | Date;
    data?: NotificationPayload;
};

export const normalizeNotificationPayload = (payload: unknown): Notification => {
    const fallback: Notification = {
        id: Date.now().toString(),
        type: 'system',
        title: 'New Notification',
        message: '',
        isRead: false,
        createdAt: new Date().toISOString(),
    };

    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return fallback;
    }

    const record = payload as NotificationPayload;
    const nested = record.data && typeof record.data === 'object' ? record.data : {};
    const source = { ...record, ...nested };

    const timestamp = source.createdAt || source.timestamp;
    const createdAt = timestamp instanceof Date
        ? timestamp.toISOString()
        : typeof timestamp === 'string'
            ? timestamp
            : fallback.createdAt;

    return {
        id: String(source._id || source.id || fallback.id),
        type: source.type || fallback.type,
        title: source.title || fallback.title,
        message: source.message || fallback.message,
        isRead: source.read !== undefined ? source.read : (source.isRead ?? fallback.isRead),
        createdAt,
        metadata: source.metadata,
        actionUrl: source.actionUrl,
    };
};

export const notificationApi = {
    getAll: async () => {
        const response = await api.get('/notifications');
        const data = response.data;
        const notifications =
            Array.isArray(data) ? data :
            Array.isArray(data?.data) ? data.data :
            Array.isArray(data?.notifications) ? data.notifications :
            Array.isArray(data?.data?.notifications) ? data.data.notifications :
            [];

        return notifications.map((n: NotificationApiPayload) => normalizeNotificationPayload(n));
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
        const response = await api.put('/notifications/read/all');
        return response.data;
    },

    delete: async (notificationId: string) => {
        const response = await api.delete(`/notifications/${notificationId}`);
        return response.data;
    },
};
