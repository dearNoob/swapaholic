import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { User } from '../types/api';

export type UserProfile = User;

interface UserState {
    profile: UserProfile | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: UserState = {
    profile: null,
    isLoading: false,
    error: null,
};

const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUserProfile: (state, action: PayloadAction<UserProfile | null>) => {
            state.profile = action.payload;
        },
        setUser: (state, action: PayloadAction<UserProfile | null>) => {
            state.profile = action.payload;
        },
        updateProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
            if (state.profile) {
                state.profile = { ...state.profile, ...action.payload };
            }
        },
        setUserLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setUserError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        clearUserData: (state) => {
            state.profile = null;
            state.isLoading = false;
            state.error = null;
        },
    },
});

export const { setUserProfile, setUser, updateProfile, setUserLoading, setUserError, clearUserData } = userSlice.actions;
export default userSlice.reducer;
