import api from './axios';

export interface WishlistItem {
    id: string;
    productId: string;
    product: {
        id: string;
        title: string;
        description: string;
        currentBid: number;
        startingPrice: number;
        images: string[];
        category: string;
        condition: string;
        endTime: string;
        status: 'active' | 'ended';
    };
    addedAt: string;
}

export const wishlistApi = {
    // Get all wishlist items
    getWishlist: async () => {
        const response = await api.get('/wishlist');
        return response.data;
    },

    // Add product to wishlist
    addToWishlist: async (productId: string) => {
        const response = await api.post('/wishlist', { productId });
        return response.data;
    },

    // Remove product from wishlist
    removeFromWishlist: async (productId: string) => {
        const response = await api.delete(`/wishlist/${productId}`);
        return response.data;
    },

    // Check if product is in wishlist
    isInWishlist: async (productId: string) => {
        const response = await api.get(`/wishlist/check/${productId}`);
        return response.data;
    },

    // Clear entire wishlist
    clearWishlist: async () => {
        const response = await api.delete('/wishlist/clear');
        return response.data;
    },
};
