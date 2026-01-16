import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Delivery {
    id: string;
    productId: string;
    buyerId: string;
    sellerId: string;
    status: 'pending' | 'assigned' | 'picked_up' | 'in_transit' | 'delivered' | 'returned';
    trackingCode: string;
    assignedTo?: string; // Delivery personnel ID
    pickupTime?: string;
    deliveryTime?: string;
    proofOfDelivery?: string;
}

interface DeliveryState {
    deliveries: Delivery[];
    currentDelivery: Delivery | null;
    isLoading: boolean;
    error: string | null;
}

const initialState: DeliveryState = {
    deliveries: [],
    currentDelivery: null,
    isLoading: false,
    error: null,
};

const deliverySlice = createSlice({
    name: 'delivery',
    initialState,
    reducers: {
        setDeliveries: (state, action: PayloadAction<Delivery[]>) => {
            state.deliveries = action.payload;
        },
        setCurrentDelivery: (state, action: PayloadAction<Delivery>) => {
            state.currentDelivery = action.payload;
        },
        updateDeliveryStatus: (state, action: PayloadAction<{ id: string; status: Delivery['status'] }>) => {
            const delivery = state.deliveries.find(d => d.id === action.payload.id);
            if (delivery) {
                delivery.status = action.payload.status;
            }
            if (state.currentDelivery && state.currentDelivery.id === action.payload.id) {
                state.currentDelivery.status = action.payload.status;
            }
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setDeliveries, setCurrentDelivery, updateDeliveryStatus, setLoading, setError } = deliverySlice.actions;
export default deliverySlice.reducer;
