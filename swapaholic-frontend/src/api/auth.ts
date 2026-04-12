import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { User } from '../types/api';

type RegisterPayload = {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    role?: User['role'];
};

type RegisterSuccessResponse = { user: User; accessToken: string };
type RegisterVerificationResponse = { requireVerification: boolean; message: string; email: string };
type LoginSuccessResponse = { accessToken: string; user: User };
type LoginRequiresTwoFactorResponse = { require2FA: boolean; message: string; otpDispatched?: boolean };
type LogisticsRegistrationResponse = { message: string };
type VerifyOtpResponse = { message: string; accessToken?: string; user?: User; resetToken?: string };

export const authApi = {
    // Register a new user
    async register(data: RegisterPayload): Promise<RegisterSuccessResponse | RegisterVerificationResponse> {
        const response = await apiClient.post<ApiResponse<RegisterSuccessResponse> & Partial<RegisterVerificationResponse>>('/auth/register', data);
        // Backend returns { success, requireVerification, message, email } (no data wrapper) when OTP is needed
        if (response.data.requireVerification) {
            return {
                requireVerification: true,
                message: response.data.message ?? 'Verification required.',
                email: response.data.email ?? data.email,
            };
        }
        return response.data.data;
    },

    // Login and receive JWT tokens (access token stored in cookie, refresh token HttpOnly)
    async login(data: { email: string; password: string }): Promise<LoginSuccessResponse | LoginRequiresTwoFactorResponse> {
        const response = await apiClient.post<ApiResponse<LoginSuccessResponse> & Partial<LoginRequiresTwoFactorResponse>>('/auth/login', data);
        if (response.data.require2FA) {
            return {
                require2FA: true,
                message: response.data.message ?? 'Two-factor authentication required.',
                otpDispatched: response.data.otpDispatched,
            };
        }
        return response.data.data;
    },

    async resendOTP(data: { email: string; purpose: 'PHONE_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET' }): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/auth/resend-otp', data);
        return response.data;
    },

    // Admin Login (separate portal for admin users)
    async adminLogin(data: { email: string; password: string }): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/auth/admin/login', data);
        return response.data.data;
    },

    // Logistics Officer Login (separate portal)
    async logisticsLogin(data: { email: string; password: string }): Promise<{ accessToken: string; user: User }> {
        const response = await apiClient.post<ApiResponse<{ accessToken: string; user: User }>>('/logistics/login', data);
        return response.data.data;
    },

    // Logistics Officer Registration
    async logisticsRegister(data: { firstName: string; lastName: string; email: string; password: string; phone: string; address?: string }): Promise<LogisticsRegistrationResponse> {
        const response = await apiClient.post<LogisticsRegistrationResponse>('/logistics/register', data);
        return response.data;
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
        const response = await apiClient.post<{ message: string; requireOtp: boolean }>('/auth/forgot-password', { email });
        return response.data;
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

    // Verify OTP (Generic)
    async verifyOTP(data: { email: string; otp: string; purpose: 'PHONE_VERIFY' | 'LOGIN_2FA' | 'PASSWORD_RESET' }): Promise<VerifyOtpResponse> {
        const response = await apiClient.post<ApiResponse<VerifyOtpResponse> & Partial<VerifyOtpResponse>>('/auth/verify-otp', data);
        // Backend returns inconsistent structures:
        // LOGIN_2FA / PHONE_VERIFY: { success: true, data: { accessToken, user } }
        // PASSWORD_RESET: { success: true, message, resetToken }
        if (response.data.data) {
            return response.data.data;
        }
        return {
            message: response.data.message ?? 'OTP verified successfully.',
            accessToken: response.data.accessToken,
            user: response.data.user,
            resetToken: response.data.resetToken,
        };
    },

    // Reset Password with OTP Token
    async resetPasswordWithOTP(data: { resetToken: string; newPassword: string }): Promise<{ message: string }> {
        const response = await apiClient.post<{ message: string }>('/auth/reset-password-otp', data);
        return response.data;
    },
};
