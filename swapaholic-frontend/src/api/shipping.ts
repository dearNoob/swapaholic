import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';

export interface Address {
    id: string;
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface CreateAddressData {
    fullName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    isDefault?: boolean;
}

export interface ShippingOption {
    id: string;
    name: string;
    description: string;
    price: number;
    estimatedDays: number;
    carrier: string;
}

/**
 * Shipping API Service
 * Handles all shipping and address-related API calls
 */
export const shippingApi = {
    /**
     * Get user's saved addresses
     */
    async getAddresses(): Promise<Address[]> {
        const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
        return response.data.data;
    },

    /**
     * Get single address by ID
     */
    async getAddressById(id: string): Promise<Address> {
        const response = await apiClient.get<ApiResponse<Address>>(`/addresses/${id}`);
        return response.data.data;
    },

    /**
     * Add new address
     */
    async addAddress(data: CreateAddressData): Promise<Address> {
        const response = await apiClient.post<ApiResponse<Address>>('/addresses', data);
        return response.data.data;
    },

    /**
     * Update address
     */
    async updateAddress(id: string, data: Partial<CreateAddressData>): Promise<Address> {
        const response = await apiClient.put<ApiResponse<Address>>(`/addresses/${id}`, data);
        return response.data.data;
    },

    /**
     * Delete address
     */
    async deleteAddress(id: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/addresses/${id}`);
        return response.data.data;
    },

    /**
     * Set default address
     */
    async setDefaultAddress(id: string): Promise<{ message: string }> {
        const response = await apiClient.put<ApiResponse<{ message: string }>>(
            `/addresses/${id}/default`
        );
        return response.data.data;
    },

    /**
     * Get shipping options for order
     */
    async getShippingOptions(addressId: string, items: Array<{ productId: string; quantity: number }>): Promise<ShippingOption[]> {
        const response = await apiClient.post<ApiResponse<ShippingOption[]>>(
            '/shipping/options',
            { addressId, items }
        );
        return response.data.data;
    },

    /**
     * Calculate shipping cost
     */
    async calculateShippingCost(addressId: string, weight: number): Promise<{ cost: number }> {
        const response = await apiClient.post<ApiResponse<{ cost: number }>>(
            '/shipping/calculate',
            { addressId, weight }
        );
        return response.data.data;
    }
};
