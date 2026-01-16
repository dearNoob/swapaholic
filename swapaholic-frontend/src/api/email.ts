// src/api/email.ts
import api from './axios';

export const emailApi = {
    // Notification emails
    bidPlaced: async (bidId: string, userId: string) => {
        const response = await api.post('/emails/bid-placed', { bidId, userId });
        return response.data;
    },
    auctionWon: async (auctionId: string, userId: string) => {
        const response = await api.post('/emails/auction-won', { auctionId, userId });
        return response.data;
    },
    orderShipped: async (orderId: string, userId: string) => {
        const response = await api.post('/emails/order-shipped', { orderId, userId });
        return response.data;
    },
    wishlistPriceDrop: async (productId: string, userId: string) => {
        const response = await api.post('/emails/wishlist-price-drop', { productId, userId });
        return response.data;
    },
    // Account related emails
    verification: async (email: string, token: string) => {
        const response = await api.post('/emails/verification', { email, token });
        return response.data;
    },
    passwordReset: async (email: string, token: string) => {
        const response = await api.post('/emails/password-reset', { email, token });
        return response.data;
    },
};
