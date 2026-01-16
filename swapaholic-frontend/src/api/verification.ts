'use client';

import axiosInstance from './axios';

export interface Verification {
    id: string;
    userId: string;
    fullName: string;
    email: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: string;
    documents: string[];
}

export const verificationApi = {
    // Upload identity documents (multipart/form-data)
    uploadDocuments: async (formData: FormData) => {
        const response = await axiosInstance.post('/verification/documents', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },
    // Submit personal info for verification
    submitInfo: async (payload: { fullName: string; dob: string; address: string }) => {
        const response = await axiosInstance.post('/verification/info', payload);
        return response.data;
    },
    // Get current user's verification status
    getUserStatus: async () => {
        const response = await axiosInstance.get('/verification/status');
        return response.data;
    },
    // Admin: fetch all pending verifications
    getPendingVerifications: async () => {
        const response = await axiosInstance.get('/admin/verification/pending');
        return response.data;
    },
    // Admin: approve a verification request
    approveVerification: async (id: string) => {
        const response = await axiosInstance.post(`/admin/verification/${id}/approve`);
        return response.data;
    },
    // Admin: reject a verification request
    rejectVerification: async (id: string, reason?: string) => {
        const response = await axiosInstance.post(`/admin/verification/${id}/reject`, { reason });
        return response.data;
    },
};
