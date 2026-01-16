import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Bid {
    id: string;
    productId: string;
    bidderId: string;
    amount: number;
    timestamp: string;
    bidderName?: string;
}

interface BidState {
    currentBids: Bid[];
    highestBid: Bid | null;
    auctionEndTime: string | null;
    isLive: boolean;
    isLoading: boolean;
    error: string | null;
}

const initialState: BidState = {
    currentBids: [],
    highestBid: null,
    auctionEndTime: null,
    isLive: false,
    isLoading: false,
    error: null,
};

const bidSlice = createSlice({
    name: 'bid',
    initialState,
    reducers: {
        setBids: (state, action: PayloadAction<Bid[]>) => {
            state.currentBids = action.payload;
            // Recalculate highest bid
            if (action.payload.length > 0) {
                state.highestBid = action.payload.reduce((prev, current) =>
                    (prev.amount > current.amount) ? prev : current
                );
            } else {
                state.highestBid = null;
            }
        },
        addBid: (state, action: PayloadAction<Bid>) => {
            state.currentBids.push(action.payload);
            if (!state.highestBid || action.payload.amount > state.highestBid.amount) {
                state.highestBid = action.payload;
            }
        },
        setAuctionStatus: (state, action: PayloadAction<{ endTime: string; isLive: boolean }>) => {
            state.auctionEndTime = action.payload.endTime;
            state.isLive = action.payload.isLive;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
    },
});

export const { setBids, addBid, setAuctionStatus, setLoading, setError } = bidSlice.actions;
export default bidSlice.reducer;
