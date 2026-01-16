import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Product {
    id: string;
    title: string;
    description: string;
    price: number;
    currentBid?: number;
    images: string[];
    category: string;
    condition: string;
    sellerId: string;
    status: 'pending' | 'verified' | 'rejected' | 'sold' | 'active' | 'expired' | 'draft';
    createdAt: string;
    bidCount?: number;
    endTime?: string;
    mlScore?: number;
    mlSummary?: string;
    distance?: number; // distance in meters from user location
}

interface ListingState {
    products: Product[];
    currentProduct: Product | null;
    filters: {
        category: string | null;
        priceMin: number;
        priceMax: number;
        condition: string[];
        status: string[];
        searchQuery: string;
        lat: number | null;
        lng: number | null;
        radius: number | null;
    };
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    sort: {
        sortBy: 'price' | 'createdAt' | 'popularity';
        sortOrder: 'asc' | 'desc';
    };
    viewMode: 'grid' | 'list';
    isLoading: boolean;
    error: string | null;
}

const initialState: ListingState = {
    products: [],
    currentProduct: null,
    filters: {
        category: null,
        priceMin: 0,
        priceMax: 10000,
        condition: [],
        status: [],
        searchQuery: '',
        lat: null,
        lng: null,
        radius: null,
    },
    pagination: {
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
    },
    sort: {
        sortBy: 'createdAt',
        sortOrder: 'desc',
    },
    viewMode: 'grid',
    isLoading: false,
    error: null,
};

const listingSlice = createSlice({
    name: 'listing',
    initialState,
    reducers: {
        setProducts: (state, action: PayloadAction<{ products: Product[]; total: number }>) => {
            state.products = action.payload.products;
            state.pagination.total = action.payload.total;
            state.pagination.totalPages = Math.ceil(action.payload.total / state.pagination.limit);
            state.isLoading = false;
            state.error = null;
        },
        setCurrentProduct: (state, action: PayloadAction<Product>) => {
            state.currentProduct = action.payload;
        },
        setFilters: (state, action: PayloadAction<Partial<ListingState['filters']>>) => {
            state.filters = { ...state.filters, ...action.payload };
            state.pagination.page = 1; // Reset to first page when filters change
        },
        setPagination: (state, action: PayloadAction<Partial<ListingState['pagination']>>) => {
            state.pagination = { ...state.pagination, ...action.payload };
        },
        setSort: (state, action: PayloadAction<Partial<ListingState['sort']>>) => {
            state.sort = { ...state.sort, ...action.payload };
            state.pagination.page = 1; // Reset to first page when sort changes
        },
        setViewMode: (state, action: PayloadAction<'grid' | 'list'>) => {
            state.viewMode = action.payload;
        },
        clearFilters: (state) => {
            state.filters = initialState.filters;
            state.pagination.page = 1;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },
    },
});

export const {
    setProducts,
    setCurrentProduct,
    setFilters,
    setPagination,
    setSort,
    setViewMode,
    clearFilters,
    setLoading,
    setError
} = listingSlice.actions;

export default listingSlice.reducer;
