import apiClient from '../lib/apiClient';
import { ApiResponse } from '../types/api';
import { Product } from './products';

export interface Bid {
    id: string;
    productId: string;
    userId: string;
    username: string;
    amount: number;
    isAutoBid: boolean;
    maxBidAmount?: number;
    createdAt: string;
}

export interface PlaceBidData {
    productId: string;
    amount: number;
}

export interface SetAutoBidData {
    productId: string;
    maxAmount: number;
    incrementAmount?: number;
}

export interface BidHistory extends Bid {
    product: Product;
    isWinning: boolean;
    isOutbid: boolean;
}

/**
 * Bids API Service
 * Handles all bidding-related API calls
 */
export const bidsApi = {
    /**
     * Place a bid on a product
     */
    async placeBid(data: PlaceBidData): Promise<Bid> {
        const response = await apiClient.post<ApiResponse<Bid>>('/bids', data);
        return response.data.data;
    },


    /**
     * Get user's bid history
     */
    async getMyBids(page = 1, limit = 20): Promise<{ data: BidHistory[]; total: number }> {
        const response = await apiClient.get<ApiResponse<{ data: BidHistory[]; total: number }>>('/bids/my-bids', {
            params: { page, limit }
        });
        return response.data.data;
    },

    // Get current user's bids (alias for getMyBids)
    async getUserBids(page = 1, limit = 20): Promise<{ data: BidHistory[]; total: number }> {
        return this.getMyBids(page, limit);
    },


    /**
     * Get bid history for a product
     */
    async getProductBids(productId: string): Promise<Bid[]> {
        const response = await apiClient.get<ApiResponse<Bid[]>>(`/products/${productId}/bids`);
        return response.data.data;
    },

    /**
     * Set auto-bid for a product
     */
    async setAutoBid(data: SetAutoBidData): Promise<{ message: string }> {
        const response = await apiClient.post<ApiResponse<{ message: string }>>(
            '/bids/auto-bid',
            data
        );
        return response.data.data;
    },

    /**
     * Cancel auto-bid
     */
    async cancelAutoBid(productId: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(
            `/bids/auto-bid/${productId}`
        );
        return response.data.data;
    },

    /**
     * Get active auto-bids
     */
    async getMyAutoBids(): Promise<Array<{ productId: string; maxAmount: number; currentBid: number }>> {
        const response = await apiClient.get<ApiResponse<Array<{ productId: string; maxAmount: number; currentBid: number }>>>(
            '/bids/my-auto-bids'
        );
        return response.data.data;
    },

    /**
     * Retract a bid (if allowed by business rules)
     */
    async retractBid(bidId: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/bids/৳{bidId}`);
        return response.data.data;
    },

    /**
     * Get bidding analytics
     */
    async getBiddingAnalytics(): Promise<{
        totalBids: number;
        auctionsWon: number;
        auctionsLost: number;
        activeAuctions: number;
        averageBid: number;
        totalSpent: number;
    }> {
        const response = await apiClient.get<ApiResponse<{
            totalBids: number;
            auctionsWon: number;
            auctionsLost: number;
            activeAuctions: number;
            averageBid: number;
            totalSpent: number;
        }>>('/bids/analytics');
        return response.data.data;
    }
};

