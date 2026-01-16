import React, { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addBid, setBids } from '../../store/bidSlice';
import { getSocket, connectSocket, disconnectSocket } from '../../utils/socket';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { toast } from 'react-toastify';

interface BidPanelProps {
    productId: string;
    basePrice: number;
}

export const BidPanel: React.FC<BidPanelProps> = ({ productId, basePrice }) => {
    const dispatch = useAppDispatch();
    const { highestBid, currentBids } = useAppSelector((state) => state.bid);
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [bidAmount, setBidAmount] = useState<string>('');
    const [isPlacingBid, setIsPlacingBid] = useState(false);

    useEffect(() => {
        const socket = connectSocket();

        if (socket) {
            // Join product room
            socket.emit('join_product', productId);

            // Listen for bid updates
            socket.on('bid_update', (bid: any) => {
                dispatch(addBid(bid));
                toast.info(`New bid: ৳${bid.amount}`);
            });

            // Listen for initial bids (optional, if backend sends them on join)
            socket.on('initial_bids', (bids: any[]) => {
                dispatch(setBids(bids));
            });
        }

        return () => {
            if (socket) {
                socket.emit('leave_product', productId);
                socket.off('bid_update');
                socket.off('initial_bids');
            }
            // Don't disconnect socket here as it might be shared, or manage connection globally
            // For now, we keep it connected
        };
    }, [dispatch, productId]);

    const handlePlaceBid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error('Please login to place a bid');
            return;
        }

        const amount = parseFloat(bidAmount);
        if (isNaN(amount)) {
            toast.error('Invalid bid amount');
            return;
        }

        const currentHighest = highestBid ? highestBid.amount : basePrice;
        if (amount <= currentHighest) {
            toast.error(`Bid must be higher than $${currentHighest}`);
            return;
        }

        setIsPlacingBid(true);
        const socket = getSocket();

        if (!socket) return;

        socket.emit('place_bid', {
            productId,
            amount,
            bidderId: user?.id,
            userName: user ? `${user.firstName} ${user.lastName}` : 'Anonymous',
        }, (response: any) => {
            setIsPlacingBid(false);
            if (response.success) {
                toast.success('Bid placed successfully!');
                setBidAmount('');
            } else {
                toast.error(response.error || 'Failed to place bid');
            }
        });
    };

    const currentPrice = highestBid ? highestBid.amount : basePrice;

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Live Auction</h3>

            <div className="mb-6">
                <p className="text-sm text-gray-500">Current Highest Bid</p>
                <p className="text-3xl font-bold text-blue-600">09f3{currentPrice}</p>
                {highestBid && (
                    <p className="text-xs text-gray-400 mt-1">
                        by {highestBid.bidderName || 'Unknown'}
                    </p>
                )}
            </div>

            <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                    <label htmlFor="bidAmount" className="block text-sm font-medium text-gray-700">
                        Your Bid
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <Input
                            type="number"
                            name="bidAmount"
                            id="bidAmount"
                            className="pl-7"
                            placeholder={`${currentPrice + 1}`}
                            value={bidAmount}
                            onChange={(e) => setBidAmount(e.target.value)}
                            min={currentPrice + 1}
                            step="0.01"
                            disabled={isPlacingBid}
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    fullWidth
                    isLoading={isPlacingBid}
                    disabled={!isAuthenticated}
                >
                    {isAuthenticated ? 'Place Bid' : 'Login to Bid'}
                </Button>
            </form>

            <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Recent Bids</h4>
                <ul className="space-y-2 max-h-40 overflow-y-auto">
                    {currentBids.slice().reverse().map((bid, index) => (
                        <li key={index} className="flex justify-between text-sm">
                            <span className="text-gray-600">{bid.bidderName || 'User'}</span>
                            <span className="font-medium text-gray-900">৳{bid.amount}</span>
                        </li>
                    ))}
                    {currentBids.length === 0 && (
                        <li className="text-sm text-gray-500 italic">No bids yet</li>
                    )}
                </ul>
            </div>
        </div>
    );
};
