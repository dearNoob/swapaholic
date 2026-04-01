// API Response Types

export interface ApiResponse<T = unknown> {
    success: boolean;
    data: T;
    message?: string;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
}

export interface ApiError {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
    code?: string;
}

// Common request params
export interface PaginationParams {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FilterParams {
    search?: string;
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
    location?: string;
}

// Auth types
export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterData {
    email: string;
    password: string;
    username: string;
    firstName: string;
    lastName: string;
}

export interface AuthResponse {
    user: User;
    accessToken: string;
    refreshToken: string;
}

export interface User {
    id: string;
    email: string;
    username?: string;
    firstName: string;
    lastName: string;
    name?: string; // Computed property: firstName + lastName
    avatar?: string;
    role: 'user' | 'admin' | 'moderator' | 'buyer' | 'seller' | 'verifier' | 'delivery' | 'quality_controller' | 'logistics_officer';
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    phone?: string;
    address?: string;
    kycVerified?: boolean;
    accountStatus?: 'active' | 'suspended' | 'banned' | 'deleted';
    loginHistory?: Array<{ ip: string; deviceFingerprint: string; lastLogin: string; isTrusted: boolean }>;
    interests?: string[];
    nidNumber?: string;
    profileCompletionScore?: number;
    isVerifiedUser?: boolean;
}

// Token types
export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

// New API type interfaces
export interface Order {
    id: string;
    userId: string;
    products: Array<{ productId: string; quantity: number }>;
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'qc_pending' | 'qc_approved' | 'in_delivery' | 'delivered' | 'completed' | 'disputed' | 'cancelled';
    createdAt: string;
    updatedAt: string;
}

export interface Payment {
    id: string;
    orderId: string;
    amount: number;
    method: 'card' | 'paypal' | 'stripe' | 'bkash' | 'rocket' | 'nagad';
    status: 'initiated' | 'processed' | 'failed' | 'refunded';
    createdAt: string;
    updatedAt: string;
    clientSecret?: string;
}

export interface Review {
    id: string;
    productId: string;
    userId: string;
    rating: number; // 1-5
    comment?: string;
    createdAt: string;
    updatedAt: string;
}

export interface Notification {
    id: string;
    userId: string;
    type: 'bid' | 'order' | 'message' | 'system';
    message: string;
    read: boolean;
    createdAt: string;
}

// Analytics types
export interface GrowthMetrics {
    users: number;
    products: number;
    orders: number;
    revenue: number;
}

export interface UserMetrics {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    retentionRate: number;
}

export interface ProductMetrics {
    totalProducts: number;
    activeListings: number;
    averagePrice: number;
    categoriesCount: number;
}

export interface RevenueMetrics {
    totalRevenue: number;
    commissionEarned: number;
    averageOrderValue: number;
    transactionCount: number;
}

export interface TopCategory {
    name: string;
    count: number;
    revenue: number;
}

export interface PlatformAnalytics {
    growth: GrowthMetrics;
    userMetrics: UserMetrics;
    productMetrics: ProductMetrics;
    revenueMetrics: RevenueMetrics;
    topCategories: TopCategory[];
}
