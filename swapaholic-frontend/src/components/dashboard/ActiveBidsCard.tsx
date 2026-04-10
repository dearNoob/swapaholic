'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaClock, FaTrophy, FaExclamationCircle, FaGavel, FaArrowRight, FaFire, FaArrowUp } from 'react-icons/fa';
import { useState, useEffect } from 'react';

interface ActiveBid {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    yourBid: number;
    currentBid: number;
    endTime: string;
    status: 'winning' | 'outbid' | 'losing';
}

interface ActiveBidsCardProps {
    bids: ActiveBid[];
}

export default function ActiveBidsCard({ bids }: ActiveBidsCardProps) {
    const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, string>>({});

    useEffect(() => {
        const updateTimers = () => {
            const newMap: Record<string, string> = {};
            bids.forEach((bid) => {
                const now = new Date().getTime();
                const end = new Date(bid.endTime).getTime();
                const distance = end - now;

                if (distance < 0) {
                    newMap[bid.id] = 'Ended';
                } else {
                    const hours = Math.floor(distance / (1000 * 60 * 60));
                    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                    newMap[bid.id] = `${hours}h ${minutes}m ${seconds}s`;
                }
            });
            setTimeRemainingMap(newMap);
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000); // Update every second for smoother countdown
        return () => clearInterval(interval);
    }, [bids]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'winning':
                return {
                    text: 'Winning',
                    class: 'bg-emerald-100 text-emerald-700 border-emerald-200',
                    icon: FaTrophy,
                    gradient: 'from-emerald-500 to-teal-500'
                };
            case 'outbid':
                return {
                    text: 'Outbid',
                    class: 'bg-rose-100 text-rose-700 border-rose-200',
                    icon: FaExclamationCircle,
                    gradient: 'from-rose-500 to-red-500'
                };
            default:
                return {
                    text: 'Active',
                    class: 'bg-blue-100 text-blue-700 border-blue-200',
                    icon: FaClock,
                    gradient: 'from-blue-500 to-indigo-500'
                };
        }
    };

    if (bids.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaGavel className="text-3xl text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Bids</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    You haven't placed any bids yet. Explore our marketplace to find unique items and start bidding!
                </p>
                <Link
                    href="/products"
                    className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
                >
                    Start Bidding <FaArrowRight className="ml-2" />
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                        <FaFire />
                    </span>
                    Active Bids
                    <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {bids.length}
                    </span>
                </h2>
                <Link href="/buyer/bids" className="text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center">
                    View All <FaArrowRight className="ml-1" />
                </Link>
            </div>

            <div className="divide-y divide-gray-50">
                {bids.map((bid) => {
                    const statusBadge = getStatusBadge(bid.status);
                    const StatusIcon = statusBadge.icon;
                    const isEndingSoon = bid.endTime && new Date(bid.endTime).getTime() - Date.now() < 3600000; // < 1 hour

                    return (
                        <div key={bid.id} className="p-6 hover:bg-gray-50 transition-colors group">
                            <div className="flex flex-col sm:flex-row gap-6">
                                {/* Product Image */}
                                <Link href={`/products/${bid.productId}`} className="flex-shrink-0">
                                    <div className="relative w-full sm:w-32 h-32 rounded-xl overflow-hidden shadow-sm group-hover:shadow-md transition">
                                        <Image
                                            src={bid.productImage}
                                            alt={bid.productTitle}
                                            fill
                                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                        {isEndingSoon && (
                                            <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-[10px] font-bold py-1 text-center backdrop-blur-sm">
                                                ENDING SOON
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            <Link href={`/products/${bid.productId}`} className="hover:text-indigo-600 transition">
                                                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{bid.productTitle}</h3>
                                            </Link>
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 border ${statusBadge.class}`}>
                                                <StatusIcon />
                                                {statusBadge.text}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                            <div className="bg-gray-50 p-3 rounded-lg">
                                                <p className="text-xs text-gray-500 mb-1">Your Max Bid</p>
                                                <p className="text-lg font-bold text-gray-900">৳{bid.yourBid.toLocaleString()}</p>
                                            </div>
                                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                                                <p className="text-xs text-indigo-600 mb-1">Current Highest</p>
                                                <p className="text-lg font-bold text-indigo-700">৳{bid.currentBid.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-4">
                                        <div className={`flex items-center gap-2 text-sm font-medium ${isEndingSoon ? 'text-red-600 animate-pulse' : 'text-gray-500'}`}>
                                            <FaClock />
                                            <span>{timeRemainingMap[bid.id] || 'Calculating...'}</span>
                                        </div>

                                        {bid.status === 'outbid' ? (
                                            <button className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200 flex items-center">
                                                Bid Higher <FaArrowUp className="ml-2" />
                                            </button>
                                        ) : (
                                            <Link
                                                href={`/products/${bid.productId}`}
                                                className="px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition flex items-center"
                                            >
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
