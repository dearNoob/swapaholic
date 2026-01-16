'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaCheckCircle, FaExclamationCircle, FaClock } from 'react-icons/fa';

interface Auction {
    id: string;
    productTitle: string;
    productImage: string;
    yourBid: number;
    currentBid: number;
    endTime: string;
    isLeading: boolean;
}

interface OngoingAuctionsProps {
    auctions: Auction[];
}

export default function OngoingAuctions({ auctions }: OngoingAuctionsProps) {
    const getTimeRemaining = (endTime: string) => {
        const diff = new Date(endTime).getTime() - Date.now();
        const hours = Math.floor(diff / 3600000);
        const minutes = Math.floor((diff % 3600000) / 60000);

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}d ${hours % 24}h`;
        }
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaClock className="text-indigo-600" />
                    Your Ongoing Auctions
                </h2>
                <Link
                    href="/buyer/bids"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                >
                    View All →
                </Link>
            </div>

            <div className="space-y-4">
                {auctions.map((auction) => (
                    <div
                        key={auction.id}
                        className={`flex items-center gap-4 p-4 border-2 rounded-lg transition ${auction.isLeading
                                ? 'border-green-300 bg-green-50'
                                : 'border-red-300 bg-red-50'
                            }`}
                    >
                        {/* Product Image */}
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src={auction.productImage}
                                alt={auction.productTitle}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1">
                            <Link
                                href={`/products/${auction.id}`}
                                className="font-semibold text-gray-900 hover:text-indigo-600 transition block"
                            >
                                {auction.productTitle}
                            </Link>

                            <div className="flex items-center gap-4 mt-2 text-sm">
                                <div>
                                    <span className="text-gray-600">Your Bid: </span>
                                    <span className="font-semibold text-gray-900">09f3{auction.yourBid}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Current: </span>
                                    <span className="font-semibold text-gray-900">09f3{auction.currentBid}</span>
                                </div>
                                <div className="flex items-center gap-1 text-gray-600">
                                    <FaClock className="text-xs" />
                                    {getTimeRemaining(auction.endTime)}
                                </div>
                            </div>
                        </div>

                        {/* Status Badge */}
                        <div className="text-right">
                            {auction.isLeading ? (
                                <div className="flex items-center gap-2 text-green-700 font-semibold">
                                    <FaCheckCircle />
                                    Leading
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-red-700 font-semibold">
                                    <FaExclamationCircle />
                                    Outbid
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
