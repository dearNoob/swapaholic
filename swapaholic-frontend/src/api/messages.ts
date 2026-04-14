import api from './axios';
import { ConversationMessage, ConversationSummary } from '../types/messages';

const coerceConversationList = (payload: unknown): ConversationSummary[] => {
    if (Array.isArray(payload)) {
        return payload as ConversationSummary[];
    }

    if (payload && typeof payload === 'object') {
        const record = payload as { data?: unknown; conversations?: unknown };
        return coerceConversationList(record.data ?? record.conversations ?? []);
    }

    return [];
};

const coerceMessages = (payload: unknown): ConversationMessage[] => {
    if (Array.isArray(payload)) {
        return payload as ConversationMessage[];
    }

    if (payload && typeof payload === 'object') {
        const record = payload as { data?: { messages?: unknown }; messages?: unknown };
        return coerceMessages(record.data?.messages ?? record.messages ?? []);
    }

    return [];
};

const coerceUnreadCount = (payload: unknown): number => {
    if (typeof payload === 'number') {
        return payload;
    }

    if (payload && typeof payload === 'object') {
        const record = payload as { data?: { unreadCount?: unknown }; unreadCount?: unknown; count?: unknown };
        return coerceUnreadCount(record.data?.unreadCount ?? record.unreadCount ?? record.count ?? 0);
    }

    return 0;
};

export const messagesApi = {
    // Get all conversations
    getConversations: async (): Promise<ConversationSummary[]> => {
        const response = await api.get('/messages/conversations');
        return coerceConversationList(response.data);
    },

    // Get messages for a specific conversation
    getMessages: async (conversationId: string, page: number = 1): Promise<ConversationMessage[]> => {
        const response = await api.get(`/messages/conversations/${conversationId}?page=${page}`);
        return coerceMessages(response.data);
    },

    // Send a message
    sendMessage: async (conversationId: string, content: string, attachments?: File[]): Promise<ConversationMessage> => {
        const formData = new FormData();
        formData.append('content', content);
        if (attachments) {
            attachments.forEach(file => formData.append('attachments', file));
        }
        const response = await api.post(`/messages/conversations/${conversationId}/send`, formData);
        return response.data.data;
    },

    // Start a new conversation
    startConversation: async (recipientId: string, orderId?: string, productId?: string): Promise<{ conversationId: string; existing: boolean }> => {
        const response = await api.post('/messages/conversations/start', { recipientId, orderId, productId });
        return response.data.data;
    },

    // Mark conversation as read
    markAsRead: async (conversationId: string): Promise<{ success: boolean; message: string }> => {
        const response = await api.put(`/messages/conversations/${conversationId}/read`);
        return response.data;
    },

    // Get unread count
    getUnreadCount: async (): Promise<number> => {
        const response = await api.get('/messages/unread-count');
        return coerceUnreadCount(response.data);
    },

    // Search conversations
    searchConversations: async (query: string): Promise<ConversationSummary[]> => {
        const response = await api.get(`/messages/search?q=${query}`);
        return coerceConversationList(response.data);
    },

    // Block user
    blockUser: async (userId: string) => {
        const response = await api.post(`/messages/block/${userId}`);
        return response.data;
    },

    // Unblock user
    unblockUser: async (userId: string) => {
        const response = await api.delete(`/messages/block/${userId}`);
        return response.data;
    },

    // React to a message
    reactToMessage: async (messageId: string, emoji: string) => {
        const response = await api.post(`/messages/${messageId}/react`, { emoji });
        return response.data;
    },

    // Report user
    reportUser: async (userId: string, reason: string) => {
        const response = await api.post(`/messages/report/${userId}`, { reason });
        return response.data;
    },

    // Get blocked users
    getBlockedUsers: async (): Promise<Array<{ id: string; name: string; avatar?: string | null; blockedAt: string }>> => {
        const response = await api.get('/messages/blocked');
        return response.data.data;
    },
};
