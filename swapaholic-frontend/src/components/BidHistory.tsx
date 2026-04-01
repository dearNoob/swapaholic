'use client';

import { FaTrophy, FaUser } from 'react-icons/fa';
import { formatRelativeTime } from '../utils/time';

interface Bid {
    id: string;
    bidderName: string;
    amount: number;
    timestamp: string;
    isCurrentUser?: boolean;
}

interface BidHistoryProps {
    bids: Bid[];
    maxDisplay?: number;
}

export default function BidHistory({ bids, maxDisplay = 5 }: BidHistoryProps) {
    const displayedBids = bids.slice(0, maxDisplay);
    const hasMore = bids.length > maxDisplay;

    // (Inside component)
    const formatTime = (timestamp: string) => {
        return formatRelativeTime(timestamp);
    };

    const anonymizeName = (name: string, isCurrentUser?: boolean) => {
        if (isCurrentUser) return 'You';
        if (name.length <= 3) return name;
        return name.charAt(0) + '*'.repeat(name.length - 2) + name.charAt(name.length - 1);
    };

    if (bids.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Bid History</h3>
                <div className="text-center py-8 text-gray-500">
                    <FaTrophy className="mx-auto text-4xl mb-2 text-gray-300" />
                    <p>No bids yet. Be the first!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FaTrophy className="text-yellow-500" />
                Bid History ({bids.length})
            </h3>

            <div className="space-y-3">
                {displayedBids.map((bid, index) => (
                    <div
                        key={bid.id}
                        className={`flex items-center justify-between p-3 rounded-lg ${bid.isCurrentUser
                                ? 'bg-indigo-50 border-2 border-indigo-200'
                                : index === 0
                                    ? 'bg-yellow-50 border border-yellow-200'
                                    : 'bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                                {index === 0 ? (
                                    <div className="w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center">
                                        <FaTrophy className="text-white" />
                                    </div>
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                                        <FaUser className="text-gray-600" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className={`font-semibold ৳{bid.isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                                    {anonymizeName(bid.bidderName, bid.isCurrentUser)}
                                    {index === 0 && <span className="ml-2 text-xs text-yellow-600">(Highest)</span>}
                                </p>
                                <p className="text-xs text-gray-500">{formatTime(bid.timestamp)}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-lg font-bold ৳{bid.isCurrentUser ? 'text-indigo-600' : 'text-gray-900'}`}>
                                ৳{bid.amount}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {hasMore && (
                <button className="w-full mt-4 text-indigo-600 hover:text-indigo-700 font-medium text-sm">
                    View all {bids.length} bids →
                </button>
            )}
        </div>
    );
}
