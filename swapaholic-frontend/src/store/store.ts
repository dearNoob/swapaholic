import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import userReducer from './userSlice';
import listingReducer from './listingSlice';
import bidReducer from './bidSlice';
import deliveryReducer from './deliverySlice';
import adminReducer from './adminSlice';

export const store = configureStore({
    reducer: {
        auth: authReducer,
        user: userReducer,
        listing: listingReducer,
        bid: bidReducer,
        delivery: deliveryReducer,
        admin: adminReducer,
    },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
