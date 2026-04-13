'use client';

import { useState } from 'react';
import { FaGavel, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bidsApi } from '../api/bids';
import { useAppSelector } from '../store/hooks';
import BidConfirmationModal from './bidding/BidConfirmationModal';
import { useAuctionTimer } from '../hooks/useAuctionTimer';

interface BiddingInterfaceProps {
    productId: string;
    productName: string;
    productImage?: string;
    currentBid: number;
    startingPrice: number;
    minimumIncrement: number;
    endTime?: string;
    totalBids: number;
    sellerId: string;
    onBidPlaced?: () => void;
}

export default function BiddingInterface({
    productId,
    productName,
    productImage,
    currentBid,
    startingPrice,
    minimumIncrement = 5,
    endTime,
    totalBids,
    sellerId,
    onBidPlaced,
}: BiddingInterfaceProps) {
    const [bidAmount, setBidAmount] = useState<number>(currentBid + minimumIncrement);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    
    // Unified timer logic
    const { formatted: timeRemaining, isEnded, isEndingSoon } = useAuctionTimer(endTime);

    // Calculate minimum allowed bid (5% higher than current price)
    const currentPrice = currentBid > 0 ? currentBid : startingPrice;
    const minBid = currentPrice * 1.05;

    const { user } = useAppSelector((state) => state.auth);

    const handleBidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (user?.id === sellerId) {
            toast.warning("You cannot bid on your own product.");
            return;
        }

        if (isEnded) {
            toast.error("This auction has already ended.");
            return;
        }

        if (bidAmount < minBid) {
            toast.error(`Minimum bid is ৳${minBid.toFixed(2)}`);
            return;
        }

        // Show confirmation modal
        setShowConfirmModal(true);
    };

    const handleConfirmBid = async () => {
        setIsSubmitting(true);
        try {
            await bidsApi.placeBid({ productId, amount: bidAmount });
            toast.success('Bid placed successfully!');
            setBidAmount(bidAmount + minimumIncrement);
            setShowConfirmModal(false);

            if (onBidPlaced) {
                onBidPlaced();
            }
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : 'Failed to place bid');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Generate strategic bid suggestions based on base price
    const generateBidSuggestions = () => {
        const suggestions = [];
        const basePrice = startingPrice;

        // Always include minimum bid
        suggestions.push(minBid);

        // Add strategic amounts (10%, 25%, 50% higher than current price)
        if (currentPrice * 1.10 > minBid) suggestions.push(currentPrice * 1.10);
        if (currentPrice * 1.25 > minBid) suggestions.push(currentPrice * 1.25);
        if (currentPrice * 1.50 > minBid) suggestions.push(currentPrice * 1.50);
        if (currentPrice * 2.00 > minBid) suggestions.push(currentPrice * 2.00);

        // Remove duplicates and return unique values
        return [...new Set(suggestions)].slice(0, 4);
    };

    const bidSuggestions = generateBidSuggestions();

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            {/* Current Bid Info */}
            <div className="border-b pb-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Current Bid</span>
                    <div className="flex items-center gap-2 text-gray-600">
                        <FaGavel className="text-indigo-600" />
                        <span className="text-sm">{totalBids} bids</span>
                    </div>
                </div>
                <div className="text-4xl font-bold text-indigo-600">
                    ৳{currentBid > 0 ? currentBid : startingPrice}
                </div>
                {currentBid > 0 && (
                    <p className="text-sm text-gray-500 mt-1">Starting price: ৳{startingPrice}</p>
                )}
            </div>

            {/* Time Remaining */}
            {endTime && (
                <div className={`flex items-center gap-2 p-3 rounded-lg border ${isEnded ? 'bg-gray-50 border-gray-100 text-gray-500' : isEndingSoon ? 'bg-red-50 border-red-100 text-red-600 ring-2 ring-red-500/10' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                    <FaClock className={isEndingSoon && !isEnded ? 'animate-pulse' : ''} />
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider">{isEnded ? 'Auction Status' : 'Time Remaining'}</p>
                        <p className="text-sm font-bold font-mono tabular-nums uppercase">{timeRemaining}</p>
                    </div>
                </div>
            )}

            {/* Bid Form */}
            <form onSubmit={handleBidSubmit} className="space-y-4">
                {/* Bidding Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                        💡 <strong>Bidding Rules:</strong> Your bid must be at least 5% higher than the current highest bid or the base price (min: ৳{minBid.toFixed(2)}).
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Bid (min: ৳{minBid.toFixed(2)})
                    </label>
                    <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg font-medium">
                            ৳
                        </span>
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => setBidAmount(Number(e.target.value))}
                            min={minBid}
                            step={minimumIncrement}
                            disabled={isEnded}
                            className={`w-full pl-8 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-black focus:border-indigo-500 text-lg font-semibold ${isEnded ? 'bg-gray-50 cursor-not-allowed border-gray-200' : 'border-gray-300'}`}
                            required
                        />
                    </div>
                </div>

                {/* Quick Bid Suggestions */}
                <div className="space-y-2">
                    <p className="text-xs text-gray-500">Quick bid amounts:</p>
                    <div className="grid grid-cols-2 gap-2">
                        {bidSuggestions.map((amount, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => setBidAmount(amount)}
                                disabled={isEnded}
                                className={`px-3 py-2 text-sm border rounded-lg text-black transition ${isEnded ? 'bg-gray-50 cursor-not-allowed border-gray-100 text-gray-400' : 'border-gray-300 hover:bg-indigo-50 hover:border-indigo-300'}`}
                            >
                                ৳{amount.toFixed(2)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Place Bid Button */}
                {user?.id === sellerId ? (
                    <div className="w-full bg-gray-100 text-gray-500 py-4 rounded-lg font-semibold text-lg text-center border border-gray-200">
                        You cannot bid on your own product
                    </div>
                ) : isEnded ? (
                    <div className="w-full bg-red-50 text-red-500 py-4 rounded-lg font-semibold text-lg text-center border border-red-100 uppercase tracking-widest">
                        Auction Ended
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={isSubmitting || bidAmount < minBid}
                        className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                    >
                        <FaGavel />
                        {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
                    </button>
                )}
            </form>

            {/* Bid Info */}
            <div className="text-xs text-gray-500 space-y-1">
                <p>• Bids are binding commitments</p>
                <p>• Minimum increment: 5% of current price (min: ৳{(currentPrice * 0.05).toFixed(2)})</p>
                <p>• You will be notified if outbid</p>
            </div>

            {/* Bid Confirmation Modal */}
            <BidConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handleConfirmBid}
                bidAmount={bidAmount}
                currentBid={currentBid}
                productName={productName}
                productImage={productImage}
                minBid={minBid}
            />
        </div>
    );
}
