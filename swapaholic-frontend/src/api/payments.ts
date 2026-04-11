import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { Payment } from '../types/api';

export interface PaymentMethod {
    id: string;
    type: string;
    brand?: string;
    last4?: string;
    expiryMonth?: number;
    expiryYear?: number;
    isDefault: boolean;
}

export interface AddPaymentMethodData {
    type: string;
    cardNumber: string;
    expiryMonth: number;
    expiryYear: number;
    cvv: string;
    cardholderName: string;
}

export interface Transaction {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'payment' | 'payout';
    status: 'completed' | 'pending' | 'failed';
}

export const paymentsApi = {
    // Initiate a payment for an order
    async initiate(data: { orderId: string; method: 'card' | 'paypal' | 'stripe' | 'bkash' | 'rocket' | 'nagad' }): Promise<Payment> {
        const response = await apiClient.post<ApiResponse<Payment>>('/payments/initiate', data);
        return response.data.data;
    },

    // Process a payment (e.g., after redirect from gateway)
    async process(data: { paymentId: string; details?: { stripePaymentIntentId?: string }; stripePaymentIntentId?: string }): Promise<Payment> {
        const response = await apiClient.post<ApiResponse<Payment>>('/payments/process', data);
        return response.data.data;
    },

    // Get payment details by ID
    async getPayment(paymentId: string): Promise<Payment> {
        const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${paymentId}`);
        return response.data.data;
    },

    // Get user's transaction history
    async getTransactions(): Promise<Transaction[]> {
        const response = await apiClient.get<ApiResponse<Transaction[]>>('/payments/history');
        return response.data.data;
    },

    // Release payment to seller after order completion
    async release(paymentId: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(`/payments/${paymentId}/release`);
        return response.data.data;
    },

    // Refund a payment
    async refund(paymentId: string, reason?: string): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(`/payments/${paymentId}/refund`, { reason });
        return response.data.data;
    },

    // Get all payment methods
    async getPaymentMethods(): Promise<PaymentMethod[]> {
        const response = await apiClient.get<ApiResponse<PaymentMethod[]>>('/payments/methods');
        return response.data.data;
    },

    // Add a new payment method
    async addPaymentMethod(data: AddPaymentMethodData): Promise<PaymentMethod> {
        const response = await apiClient.post<ApiResponse<PaymentMethod>>('/payments/methods', data);
        return response.data.data;
    },

    // Remove a payment method
    async removePaymentMethod(id: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/payments/methods/${id}`);
        return response.data.data;
    },

    // Set default payment method
    async setDefaultPaymentMethod(id: string): Promise<{ message: string }> {
        const response = await apiClient.put<ApiResponse<{ message: string }>>(`/payments/methods/${id}/default`);
        return response.data.data;
    },

    // Escrow methods (aliases for now, can be specialized if needed)
    async initiateEscrow(orderId: string, _amount: number): Promise<Payment> {
        void _amount;
        return this.initiate({ orderId, method: 'stripe' }); // Default to stripe for escrow
    },

    async releaseEscrow(paymentId: string): Promise<{ message: string }> {
        return this.release(paymentId);
    },

    async refundEscrow(paymentId: string): Promise<{ message: string }> {
        return this.refund(paymentId);
    },

    async generateInvoice(paymentId: string): Promise<Blob> {
        const response = await apiClient.get(`/payments/${paymentId}/invoice`, { responseType: 'blob' });
        return response.data;
    },

    // ═══════════════════════════════════════════════
    // ADMIN PAYOUT MANAGEMENT
    // ═══════════════════════════════════════════════

    /**
     * Get all pending payouts (admin only)
     */
    async getPendingPayouts(): Promise<PendingPayout[]> {
        const response = await apiClient.get<{ success: boolean; data: PendingPayout[]; total: number }>('/payments/admin/pending-payouts');
        return response.data.data;
    },

    /**
     * Admin manually releases escrowed payment to seller
     */
    async adminReleasePayout(orderId: string): Promise<{ message: string; payment: Payment & { platformFee?: number; netAmount?: number; releasedBy?: string } }> {
        const response = await apiClient.post(`/payments/admin/release/${orderId}`);
        return response.data;
    }
};

export interface PendingPayout {
    orderId: string;
    product: { id: string; title: string; images: string[] } | null;
    buyer: { id: string; name: string; email: string } | null;
    seller: { id: string; name: string; email: string } | null;
    amount: number;
    platformFee: number;
    netAmount: number;
    deliveredAt: string;
    hoursSinceDelivery: number;
    autoReleaseEligible: boolean;
}
