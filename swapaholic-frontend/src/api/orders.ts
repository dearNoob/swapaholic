import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { Order } from '../types/api';

export const ordersApi = {
    // Create an order from an accepted bid
    async createOrder(data: { bidId: string }): Promise<Order> {
        const response = await apiClient.post<ApiResponse<Order>>('/orders', data);
        return response.data.data;
    },

    // Get current user's orders with pagination
    async getOrders(
        page = 1,
        limit = 20,
        options?: { scope?: 'buyer' | 'seller'; status?: Order['status'] }
    ): Promise<{ data: Order[]; total: number }> {
        const response = await apiClient.get<ApiResponse<{ data: Order[]; total: number }>>('/orders', {
            params: { page, limit, ...options },
        });
        return response.data.data;
    },

    async getBuyerOrders(page = 1, limit = 20): Promise<{ data: Order[]; total: number }> {
        return this.getOrders(page, limit, { scope: 'buyer' });
    },

    // Get order by ID
    async getOrderById(id: string): Promise<Order> {
        const response = await apiClient.get<ApiResponse<Order>>(`/orders/${id}`);
        return response.data.data;
    },

    // Update order status (e.g., confirm delivery, cancel)
    async updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
        const response = await apiClient.put<ApiResponse<Order>>(`/orders/${id}`, { status });
        return response.data.data;
    },
    // Confirm delivery (Buyer only)
    async confirmDelivery(id: string): Promise<Order> {
        const response = await apiClient.put<ApiResponse<Order>>(`/orders/${id}/confirm-delivery`);
        return response.data.data;
    },
    // Raise a dispute
    async fileDispute(orderId: string, reason: string, description: string): Promise<{ message: string }> {
        const response = await apiClient.put<ApiResponse<{ message: string }>>(`/orders/${orderId}/dispute`, { reason, description });
        return response.data.data;
    },
};
