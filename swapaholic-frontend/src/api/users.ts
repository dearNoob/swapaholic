import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { User } from '../types/api';

export interface BuyerDashboardBid {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    yourBid: number;
    currentBid: number;
    endTime: string;
    status: 'winning' | 'outbid' | 'losing';
}

export interface BuyerDashboardWonAuction {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    winningBid: number;
    wonDate: string;
    paymentStatus: 'pending' | 'paid' | 'completed';
    deliveryStatus?: 'pending' | 'shipped' | 'delivered';
    orderId?: string;
}

export interface BuyerDashboardSavedProduct {
    id: string;
    productId: string;
    title: string;
    image: string;
    currentPrice: number;
    originalPrice: number;
    priceAlert: boolean;
    endTime?: string;
}

export interface BuyerDashboardOrder {
    id: string;
    orderNumber: string;
    productId: string;
    productTitle: string;
    productImage: string;
    amount: number;
    orderDate: string;
    status: string;
}

export interface BuyerDashboardSummary {
    stats: {
        activeBids: number;
        wonAuctions: number;
        totalOrders: number;
        savedItems: number;
    };
    activeBids: BuyerDashboardBid[];
    wonAuctions: BuyerDashboardWonAuction[];
    recentOrders: BuyerDashboardOrder[];
    savedProducts: BuyerDashboardSavedProduct[];
}

export const usersApi = {
    // Get current user's profile
    async getProfile(): Promise<User> {
        const response = await apiClient.get<ApiResponse<User>>('/users/profile');
        return response.data.data;
    },

    // Get user by ID
    async getUserById(userId: string): Promise<User> {
        const response = await apiClient.get<ApiResponse<User>>(`/users/${userId}`);
        return response.data.data;
    },

    // Update user profile fields
    async updateProfile(data: Partial<User>): Promise<User> {
        const response = await apiClient.put<ApiResponse<User>>('/users/profile', data);
        return response.data.data;
    },

    // Follow a user
    async followUser(userId: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(`/users/${userId}/follow`);
        return response.data.data;
    },

    // Unfollow a user
    async unfollowUser(userId: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/users/${userId}/follow`);
        return response.data.data;
    },

    async getBuyerDashboard(): Promise<BuyerDashboardSummary> {
        const response = await apiClient.get<ApiResponse<BuyerDashboardSummary>>('/users/dashboard/buyer');
        return response.data.data;
    },
};
