'use client';

import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';

interface Bid {
    id: string;
    product: {
        id: string;
        title: string;
        image: string;
    };
    bidder: {
        name: string;
        image: string;
        id: string;
    };
    amount: number;
    time: string;
    status: string;
}

interface RecentBidsProps {
    bids: Bid[];
}

export default function RecentBids({ bids }: RecentBidsProps) {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Recent Bids</h2>
                <Link href="/seller/bids" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                    View All
                </Link>
            </div>

            <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
                {bids.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No bids received yet
                    </div>
                ) : (
                    bids.map((bid) => (
                        <div key={bid.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                            {/* Product Image */}
                            <div className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                <Image
                                    src={bid.product.image}
                                    alt={bid.product.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className="text-sm font-semibold text-gray-900 truncate pr-2">
                                        {bid.product.title}
                                    </h3>
                                    <span className="text-sm font-bold text-indigo-600 shrink-0">
                                        ৳{bid.amount.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                        <span>by</span>
                                        <span className="font-medium text-gray-700">{bid.bidder.name}</span>
                                    </div>
                                    <span>{format(new Date(bid.time), 'MMM d, h:mm a')}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
