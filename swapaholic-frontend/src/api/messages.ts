import api from './axios';

export const messagesApi = {
    // Get all conversations
    getConversations: async () => {
        const response = await api.get('/messages/conversations');
        return response.data;
    },

    // Get messages for a specific conversation
    getMessages: async (conversationId: string, page: number = 1) => {
        const response = await api.get(`/messages/conversations/${conversationId}?page=${page}`);
        return response.data;
    },

    // Send a message
    sendMessage: async (conversationId: string, content: string, attachments?: File[]) => {
        const formData = new FormData();
        formData.append('content', content);
        if (attachments) {
            attachments.forEach(file => formData.append('attachments', file));
        }
        const response = await api.post(`/messages/conversations/${conversationId}/send`, formData);
        return response.data;
    },

    // Start a new conversation
    startConversation: async (recipientId: string, orderId?: string) => {
        const response = await api.post('/messages/conversations/start', { recipientId, orderId });
        return response.data;
    },

    // Mark conversation as read
    markAsRead: async (conversationId: string) => {
        const response = await api.put(`/messages/conversations/${conversationId}/read`);
        return response.data;
    },

    // Get unread count
    getUnreadCount: async () => {
        const response = await api.get('/messages/unread-count');
        return response.data;
    },

    // Search conversations
    searchConversations: async (query: string) => {
        const response = await api.get(`/messages/search?q=${query}`);
        return response.data;
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
    getBlockedUsers: async () => {
        const response = await api.get('/messages/blocked');
        return response.data;
    },
};
