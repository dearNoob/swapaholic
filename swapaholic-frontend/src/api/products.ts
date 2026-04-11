import apiClient from '../lib/apiClient';
import { ApiResponse, PaginatedResponse, PaginationParams, FilterParams } from '../types/api';

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    category: string;
    condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
    images: string[];
    sellerId: string;
    sellerName: string;
    sellerAvatar?: string;
    location?: string;
    status: 'active' | 'sold' | 'expired' | 'draft';
    auctionEndTime?: string;
    auctionDuration?: number; // Added
    currentBid?: number;
    bidCount?: number;
    viewCount?: number;
    createdAt: string;
    updatedAt: string;
    geometry?: {
        type: 'Point';
        coordinates: [number, number];
    };
    aiSuggestedPrice?: number;
}

export interface CreateProductData {
    title: string;
    description: string;
    price: number;
    category: string;
    condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
    location?: string;
    auctionEndTime?: string;
    isAuction?: boolean;
}

export interface UpdateProductData extends Partial<CreateProductData> {
    status?: 'active' | 'sold' | 'expired' | 'draft';
}

export interface RegenerateDescriptionData {
    title?: string;
    description?: string;
    category?: string;
    condition?: string;
    [key: string]: unknown;
}

export interface ProductFilters extends FilterParams, PaginationParams {
    status?: 'active' | 'sold' | 'all';
    sellerId?: string;
    isFeatured?: boolean;
}

/**
 * Products API Service
 * Handles all product-related API calls
 */
export const productsApi = {
    /**
     * Get list of products with filters and pagination
     */
    async getProducts(filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products', {
            params: filters
        });
        return response.data.data;
    },

    /**
     * Get single product by ID
     */
    async getProductById(id: string): Promise<Product> {
        const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
        return response.data.data;
    },

    /**
     * Create new product
     */
    async createProduct(data: CreateProductData | FormData): Promise<Product> {
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await apiClient.post<ApiResponse<Product>>('/products', data, { headers });
        return response.data.data;
    },

    /**
     * Update existing product
     */
    async updateProduct(id: string, data: UpdateProductData | FormData): Promise<Product> {
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await apiClient.put<ApiResponse<Product>>(`/products/${id}`, data, { headers });
        return response.data.data;
    },

    /**
     * Delete product
     */
    async deleteProduct(id: string): Promise<{ message: string }> {
        const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/products/${id}`);
        return response.data.data;
    },

    /**
     * Upload product images
     */
    async uploadImages(productId: string, files: File[]): Promise<{ images: string[] }> {
        const formData = new FormData();
        files.forEach(file => {
            formData.append('images', file);
        });

        const response = await apiClient.post<ApiResponse<{ images: string[] }>>(
            `/products/${productId}/images`,
            formData,
            {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }
        );
        return response.data.data;
    },

    /**
     * Search products
     */
    async searchProducts(query: string, filters?: ProductFilters): Promise<PaginatedResponse<Product>> {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>('/products/search', {
            params: { search: query, ...filters }
        });
        return response.data.data;
    },

    /**
     * Get product categories
     */
    async getCategories(): Promise<string[]> {
        const response = await apiClient.get<ApiResponse<string[]>>('/products/categories');
        return response.data.data;
    },

    /**
     * Get featured products
     */
    async getFeaturedProducts(limit = 10): Promise<Product[]> {
        const response = await apiClient.get<Product[]>('/products/featured', {
            params: { limit }
        });
        return response.data;
    },

    /**
     * Get search suggestions
     */
    async getSearchSuggestions(query: string): Promise<{ type: 'category' | 'title', value: string }[]> {
        const response = await apiClient.get<{ suggestions: { type: 'category' | 'title', value: string }[] }>('/products/search/suggestions', {
            params: { q: query }
        });
        return response.data.suggestions;
    },

    /**
     * Get products by seller
     */
    async getSellerProducts(sellerId: string, filters?: PaginationParams): Promise<PaginatedResponse<Product>> {
        const response = await apiClient.get<ApiResponse<PaginatedResponse<Product>>>(
            `/products/seller/${sellerId}`,
            { params: filters }
        );
        return response.data.data;
    },

    /**
     * Get similar products
     */
    async getSimilarProducts(productId: string, limit = 6): Promise<Product[]> {
        const response = await apiClient.get<ApiResponse<Product[]>>(`/products/${productId}/similar`, {
            params: { limit }
        });
        return response.data.data;
    },

    /**
     * Increment view count
     */
    async incrementViewCount(productId: string): Promise<void> {
        await apiClient.post(`/products/${productId}/view`);
    },

    /**
     * Regenerate product description
     */
    async regenerateDescription(data: RegenerateDescriptionData): Promise<{ generatedDescription: string; score: number }> {
        const response = await apiClient.post<{ generatedDescription: string; score: number }>('/products/regenerate-description', data);
        return response.data;
    },

    /**
     * Analyze product images with AI
     */
    async analyzeProduct(formData: FormData): Promise<{ description: string; score: number }> {
        const response = await apiClient.post<{ description: string; score: number }>('/products/analyze', formData);
        return response.data;
    },

    /**
     * Get AI suggested price
     */
    async predictPrice(data: { category: string; brand: string; model: string; original_price: number; condition?: string; product_age?: string; location?: string }): Promise<{ success: boolean; suggestedPrice?: number; source?: string; message?: string; error?: string }> {
        const response = await apiClient.post('/products/price/predict', data);
        return response.data;
    },

};
