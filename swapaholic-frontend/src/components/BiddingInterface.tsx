'use client';

import { useState, useEffect } from 'react';
import { FaGavel, FaClock } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { bidsApi } from '../api/bids';
import { emailApi } from '../api/email';
import { useAppSelector } from '../store/hooks';
import BidConfirmationModal from './bidding/BidConfirmationModal';

interface BiddingInterfaceProps {
    productId: string;
    productName: string;
    productImage?: string;
    currentBid: number;
    startingPrice: number;
    minimumIncrement: number;
    endTime?: string;
    totalBids: number;
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
    onBidPlaced,
}: BiddingInterfaceProps) {
    const [bidAmount, setBidAmount] = useState<number>(currentBid + minimumIncrement);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState<string>('');
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Calculate minimum allowed bid (15% of base price or higher than current bid)
    const minBidFromBasePrice = startingPrice * 0.15;
    const minBid = currentBid > 0
        ? Math.max(currentBid + minimumIncrement, minBidFromBasePrice)
        : Math.max(startingPrice, minBidFromBasePrice);

    // Countdown timer
    useEffect(() => {
        if (!endTime) return;

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const distance = end - now;

            if (distance < 0) {
                setTimeRemaining('Auction ended');
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            if (days > 0) {
                setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
            } else if (hours > 0) {
                setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
            } else {
                setTimeRemaining(`${minutes}m ${seconds}s`);
            }
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [endTime]);

    const { user } = useAppSelector((state) => state.auth);

    const handleBidSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

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
            const result = await bidsApi.placeBid({ productId, amount: bidAmount });
            toast.success('Bid placed successfully!');
            setBidAmount(bidAmount + minimumIncrement);
            setShowConfirmModal(false);

            // Send email notification
            if (user?.id && result?.id) {
                try {
                    await emailApi.bidPlaced(result.id, user.id);
                } catch (emailError) {
                    console.error('Failed to send bid email notification:', emailError);
                }
            }

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
        suggestions.push(Math.max(minBid, basePrice * 0.15));

        // Add strategic amounts if they're above minimum
        if (basePrice * 0.25 > minBid) suggestions.push(basePrice * 0.25);
        if (basePrice * 0.5 > minBid) suggestions.push(basePrice * 0.5);
        if (basePrice > minBid) suggestions.push(basePrice);
        if (basePrice * 1.25 > minBid) suggestions.push(basePrice * 1.25);

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
            {endTime && timeRemaining && (
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
                    <FaClock />
                    <div>
                        <p className="text-xs font-medium">Time Remaining</p>
                        <p className="text-sm font-bold">{timeRemaining}</p>
                    </div>
                </div>
            )}

            {/* Bid Form */}
            <form onSubmit={handleBidSubmit} className="space-y-4">
                {/* Bidding Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                        💡 <strong>Bidding Rules:</strong> You can bid as low as 15% of the base price (৳{(startingPrice * 0.15).toFixed(2)}), but must be higher than the current highest bid if there are existing bids.
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
                            className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-lg font-semibold"
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
                                className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 transition"
                            >
                                ৳{amount.toFixed(2)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Place Bid Button */}
                <button
                    type="submit"
                    disabled={isSubmitting || bidAmount < minBid}
                    className="w-full bg-indigo-600 text-white py-4 rounded-lg font-semibold text-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
                >
                    <FaGavel />
                    {isSubmitting ? 'Placing Bid...' : 'Place Bid'}
                </button>
            </form>

            {/* Bid Info */}
            <div className="text-xs text-gray-500 space-y-1">
                <p>• Bids are binding commitments</p>
                <p>• Minimum increment: ৳{minimumIncrement}</p>
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
                minimumIncrement={minimumIncrement}
            />
        </div>
    );
}
