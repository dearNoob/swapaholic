import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { User } from '../types/api';

export const authApi = {
    // Register a new user
    async register(data: any): Promise<{ user: User; accessToken: string }> {
        const response = await apiClient.post<ApiResponse<{ user: User; accessToken: string }>>('/auth/register', data);
        return response.data.data;
    },

    // Login and receive JWT tokens (access token stored in cookie, refresh token HttpOnly)
    async login(data: { email: string; password: string }): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/login', data);
        return response.data.data;
    },

    // Admin Login (separate portal for admin users)
    async adminLogin(data: { email: string; password: string }): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/admin/login', data);
        return response.data.data;
    },

    // Logout user
    async logout(): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/logout');
        return response.data.data;
    },

    // Refresh access token using HttpOnly refresh token cookie
    async refreshToken(): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/refresh-token');
        return response.data.data;
    },

    // Request password reset
    async forgotPassword(email: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
        return response.data.data;
    },

    // Update user profile
    async updateProfile(data: Partial<User>): Promise<{ user: User; message: string }> {
        const response = await apiClient.put<ApiResponse<{ user: User; message: string }>>('/auth/profile', data);
        return response.data.data;
    },

    // Change password
    async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/change-password', data);
        return response.data.data;
    },

    // Verify email
    async verifyEmail(token: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/verify-email', { token });
        return response.data.data;
    },

    // 2FA: Generate Secret & QR Code
    async generate2FA(): Promise<{ secret: string; qrCode: string }> {
        const response = await apiClient.post<ApiResponse<{ secret: string; qrCode: string }>>('/auth/2fa/generate');
        return response.data.data;
    },

    // 2FA: Verify and Enable
    async verify2FA(token: string): Promise<{ message: string; backupCodes: string[] }> {
        const response = await apiClient.post<ApiResponse<{ message: string; backupCodes: string[] }>>('/auth/2fa/verify', { token });
        return response.data.data;
    },

    // 2FA: Disable
    async disable2FA(): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>('/auth/2fa/disable');
        return response.data.data;
    },

    // 2FA: Validate during login
    async validate2FA(data: { email: string; token: string }): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/2fa/validate', data);
        return response.data.data;
    },
};
