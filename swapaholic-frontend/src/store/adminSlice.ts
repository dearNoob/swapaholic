import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AdminStats {
    totalUsers: number;
    activeListings: number;
    totalSales: number;
    pendingVerifications: number;
    openDisputes: number;
}

interface AdminState {
    stats: AdminStats | null;
    pendingUsers: any[]; // Replace with proper User type if needed
    pendingListings: any[]; // Replace with proper Product type if needed
    disputes: any[];
    isLoading: boolean;
    error: string | null;
}

const initialState: AdminState = {
    stats: null,
    pendingUsers: [],
    pendingListings: [],
    disputes: [],
    isLoading: false,
    error: null,
};

const adminSlice = createSlice({
    name: 'admin',
    initialState,
    reducers: {
        setStats: (state, action: PayloadAction<AdminStats>) => {
            state.stats = action.payload;
        },
        setPendingUsers: (state, action: PayloadAction<any[]>) => {
            state.pendingUsers = action.payload;
        },
        setPendingListings: (state, action: PayloadAction<any[]>) => {
            state.pendingListings = action.payload;
        },
        setDisputes: (state, action: PayloadAction<any[]>) => {
            state.disputes = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setStats, setPendingUsers, setPendingListings, setDisputes, setLoading, setError } = adminSlice.actions;
export default adminSlice.reducer;
