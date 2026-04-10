import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { User } from '../types/api';

export type ActiveMode = 'buyer' | 'seller';

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    activeMode: ActiveMode;
    isLoading: boolean;
    error: string | null;
}

// Load initial state from localStorage (with SSR check)
const loadAuthFromStorage = (): Partial<AuthState> => {
    if (typeof window === 'undefined') {
        return {};
    }

    try {
        const token = localStorage.getItem('accessToken');
        const userStr = localStorage.getItem('user');
        const activeMode = localStorage.getItem('activeMode') as ActiveMode | null;

        if (token && userStr && userStr !== 'undefined' && userStr !== 'null') {
            const user = JSON.parse(userStr);
            return {
                accessToken: token,
                user,
                isAuthenticated: true,
                activeMode: activeMode || 'buyer',
            };
        }
    } catch (error) {
        console.error('Error loading auth from storage:', error);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('user');
        localStorage.removeItem('activeMode');
    }

    return {};
};

const initialState: AuthState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    activeMode: 'buyer',
    isLoading: false,
    error: null,
    ...loadAuthFromStorage(),
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<{ user: User; accessToken: string }>
        ) => {
            state.user = action.payload.user;
            state.accessToken = action.payload.accessToken;
            state.isAuthenticated = true;
            state.error = null;

            // Persist to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', action.payload.accessToken);
                localStorage.setItem('user', JSON.stringify(action.payload.user));
            }
        },
        logout: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.activeMode = 'buyer';
            state.error = null;

            // Clear localStorage
            if (typeof window !== 'undefined') {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('user');
                localStorage.removeItem('activeMode');
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        // New action for switching between buyer and seller modes
        switchMode: (state) => {
            state.activeMode = state.activeMode === 'buyer' ? 'seller' : 'buyer';

            // Persist mode to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('activeMode', state.activeMode);
            }
        },
        // Set specific mode
        setActiveMode: (state, action: PayloadAction<ActiveMode>) => {
            state.activeMode = action.payload;

            if (typeof window !== 'undefined') {
                localStorage.setItem('activeMode', state.activeMode);
            }
        },
        // Update user profile (for profile edits)
        updateUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;

            // Persist updated user to localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('user', JSON.stringify(action.payload));
            }
        },
    },
});

export const { setCredentials, logout, setLoading, setError, switchMode, setActiveMode, updateUser } = authSlice.actions;
export default authSlice.reducer;
