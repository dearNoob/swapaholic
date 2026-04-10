'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaTrophy, FaCreditCard, FaTruck, FaCheckCircle, FaBoxOpen, FaArrowRight } from 'react-icons/fa';

interface WonAuction {
    id: string;
    productId: string;
    productTitle: string;
    productImage: string;
    winningBid: number;
    wonDate: string;
    paymentStatus: 'pending' | 'paid' | 'completed';
    deliveryStatus?: 'pending' | 'shipped' | 'delivered';
    orderId?: string;
}

interface WonAuctionsCardProps {
    auctions: WonAuction[];
}

export default function WonAuctionsCard({ auctions }: WonAuctionsCardProps) {
    const getStepStatus = (step: number, currentStatus: number) => {
        if (step < currentStatus) return 'completed';
        if (step === currentStatus) return 'current';
        return 'upcoming';
    };

    const getAuctionProgress = (auction: WonAuction) => {
        if (auction.deliveryStatus === 'delivered') return 4;
        if (auction.deliveryStatus === 'shipped') return 3;
        if (auction.paymentStatus === 'paid' || auction.paymentStatus === 'completed') return 2;
        return 1; // Won but not paid
    };

    if (auctions.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaTrophy className="text-3xl text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Won Auctions Yet</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Keep bidding! When you win an auction, it will appear here so you can complete the purchase.
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <FaTrophy />
                    </span>
                    Won Auctions
                    <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {auctions.length}
                    </span>
                </h2>
            </div>

            <div className="divide-y divide-gray-50">
                {auctions.map((auction) => {
                    const currentStep = getAuctionProgress(auction);
                    const steps = [
                        { label: 'Won', icon: FaTrophy },
                        { label: 'Pay', icon: FaCreditCard },
                        { label: 'Ship', icon: FaTruck },
                        { label: 'Done', icon: FaCheckCircle },
                    ];

                    return (
                        <div key={auction.id} className="p-6 hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col lg:flex-row gap-8">
                                {/* Product Info */}
                                <div className="flex gap-4 lg:w-1/3">
                                    <Link href={`/products/${auction.productId}`} className="flex-shrink-0">
                                        <div className="relative w-24 h-24 rounded-xl overflow-hidden shadow-sm">
                                            <Image src={auction.productImage} alt={auction.productTitle} fill className="object-cover" />
                                        </div>
                                    </Link>
                                    <div>
                                        <Link href={`/products/${auction.productId}`} className="hover:text-indigo-600 transition">
                                            <h3 className="font-bold text-gray-900 line-clamp-2 mb-1">{auction.productTitle}</h3>
                                        </Link>
                                        <p className="text-xs text-gray-500 mb-2">
                                            Won on {new Date(auction.wonDate).toLocaleDateString()}
                                        </p>
                                        <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-green-50 text-green-700 text-sm font-bold border border-green-100">
                                            ৳{auction.winningBid.toLocaleString()}
                                        </div>
                                    </div>
                                </div>

                                {/* Progress Tracker */}
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="relative flex justify-between items-center w-full max-w-md mx-auto lg:mx-0">
                                        {/* Progress Bar Background */}
                                        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -z-10 rounded-full" />

                                        {/* Active Progress Bar */}
                                        <div
                                            className="absolute top-1/2 left-0 h-1 bg-green-500 -z-10 rounded-full transition-all duration-500"
                                            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
                                        />

                                        {steps.map((step, index) => {
                                            const status = getStepStatus(index + 1, currentStep);
                                            const StepIcon = step.icon;

                                            return (
                                                <div key={step.label} className="flex flex-col items-center bg-white px-2">
                                                    <div className={`
                                                        w-8 h-8 rounded-full flex items-center justify-center text-xs border-2 transition-all duration-300
                                                        ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                                                            status === 'current' ? 'bg-white border-green-500 text-green-600 shadow-md scale-110' :
                                                                'bg-white border-gray-300 text-gray-400'}
                                                    `}>
                                                        {status === 'completed' ? <FaCheckCircle /> : <StepIcon />}
                                                    </div>
                                                    <span className={`text-xs mt-2 font-medium ${status === 'upcoming' ? 'text-gray-400' : 'text-gray-800'}`}>
                                                        {step.label}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col justify-center items-end gap-3 lg:w-48">
                                    {auction.paymentStatus === 'pending' && (
                                        <Link
                                            href={`/payments/${auction.orderId}`}
                                            className="w-full px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition shadow-md shadow-green-200 flex items-center justify-center gap-2"
                                        >
                                            <FaCreditCard />
                                            Pay Now
                                        </Link>
                                    )}

                                    {auction.paymentStatus === 'paid' && auction.deliveryStatus !== 'delivered' && auction.orderId && (
                                        <Link
                                            href={`/delivery/${auction.orderId}`}
                                            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition shadow-md shadow-blue-200 flex items-center justify-center gap-2"
                                        >
                                            <FaTruck />
                                            Track Order
                                        </Link>
                                    )}

                                    {auction.deliveryStatus === 'delivered' && (
                                        <button className="w-full px-4 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition flex items-center justify-center gap-2">
                                            <FaBoxOpen />
                                            Order Details
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
