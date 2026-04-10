import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { User } from '../types/api';

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
};
