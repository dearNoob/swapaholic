import api from './axios';

export interface Review {
    id: string;
    productId: string;
    sellerId: string;
    buyerId: string;
    buyerName: string;
    buyerAvatar?: string;
    rating: number;
    comment: string;
    createdAt: string;
    helpful: number;
    response?: {
        text: string;
        createdAt: string;
    };
}

export interface CreateReviewData {
    productId: string;
    sellerId: string;
    rating: number;
    comment: string;
}

export const reviewsApi = {
    // Get reviews for a product
    getProductReviews: async (productId: string) => {
        const response = await api.get(`/reviews/product/${productId}`);
        return response.data;
    },

    // Get reviews for a seller
    getSellerReviews: async (sellerId: string) => {
        const response = await api.get(`/reviews/seller/${sellerId}`);
        return response.data;
    },

    // Get user's reviews (reviews they've written)
    getUserReviews: async () => {
        const response = await api.get('/reviews/user');
        return response.data;
    },

    // Create a review
    create: async (data: CreateReviewData) => {
        const response = await api.post('/reviews', data);
        return response.data;
    },

    // Update a review
    update: async (reviewId: string, data: Partial<CreateReviewData>) => {
        const response = await api.put(`/reviews/${reviewId}`, data);
        return response.data;
    },

    // Delete a review
    delete: async (reviewId: string) => {
        const response = await api.delete(`/reviews/${reviewId}`);
        return response.data;
    },

    // Mark review as helpful
    markHelpful: async (reviewId: string) => {
        const response = await api.post(`/reviews/${reviewId}/helpful`);
        return response.data;
    },

    // Seller responds to review
    respond: async (reviewId: string, responseText: string) => {
        const response = await api.post(`/reviews/${reviewId}/respond`, { response: responseText });
        return response.data;
    },

    // Get seller rating statistics
    getSellerStats: async (sellerId: string) => {
        const response = await api.get(`/reviews/seller/${sellerId}/stats`);
        return response.data;
    },
};
