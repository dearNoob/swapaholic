'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaClock, FaGavel, FaCheckCircle } from 'react-icons/fa';

interface Product {
    id: string;
    title: string;
    price: number;
    currentBid?: number;
    category: string;
    condition: string;
    status: string;
    images: string[];
    bidCount?: number;
    endTime?: string;
    distance?: number; // distance in meters
}

interface ProductCardProps {
    product: Product;
    viewMode?: 'grid' | 'list';
}

export default function ProductCard({ product, viewMode = 'grid' }: ProductCardProps) {
    const isListView = viewMode === 'list';

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'verified':
            case 'active':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'sold':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-blue-100 text-blue-800';
        }
    };

    const getConditionColor = (condition: string) => {
        switch (condition.toLowerCase()) {
            case 'new':
                return 'text-green-600';
            case 'like new':
                return 'text-blue-600';
            case 'good':
                return 'text-yellow-600';
            case 'fair':
                return 'text-orange-600';
            default:
                return 'text-gray-600';
        }
    };

    const formatDistance = (meters: number) => {
        if (meters < 1000) return `${Math.round(meters)}m away`;
        return `${(meters / 1000).toFixed(1)}km away`;
    };

    if (isListView) {
        return (
            <Link href={`/products/${product.id}`}>
                <div className="flex gap-4 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-indigo-300">
                    <div className="relative w-48 h-48 flex-shrink-0">
                        <Image
                            src={product.images[0] || '/products/placeholder.png'}
                            alt={product.title}
                            fill
                            className="object-cover"
                            loading="lazy"
                        />
                    </div>
                    <div className="flex-1 p-4 flex flex-col justify-between">
                        <div>
                            <div className="flex items-start justify-between">
                                <h3 className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition">
                                    {product.title}
                                </h3>
                                <div className="flex flex-col items-end gap-1">
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                                        {product.status}
                                    </span>
                                    {product.distance !== undefined && (
                                        <span className="text-xs text-indigo-600 font-medium">
                                            {formatDistance(product.distance)}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                            <p className={`text-sm font-medium mt-2 ${getConditionColor(product.condition)}`}>
                                Condition: {product.condition}
                            </p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                            <div>
                                <p className="text-sm text-gray-500">Current Bid</p>
                                <p className="text-2xl font-bold text-indigo-600">
                                    ৳{product.currentBid || product.price}
                                </p>
                            </div>
                            {product.bidCount !== undefined && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaGavel className="text-indigo-600" />
                                    <span className="text-sm">{product.bidCount} bids</span>
                                </div>
                            )}
                            {product.endTime && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <FaClock className="text-yellow-600" />
                                    <span className="text-sm">Ends soon</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </Link>
        );
    }

    return (
        <Link href={`/products/${product.id}`}>
            <div className="group bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-indigo-300">
                <div className="relative h-56 overflow-hidden bg-gray-100">
                    <Image
                        src={product.images[0] || '/products/placeholder.png'}
                        alt={product.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                    />
                    <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                            {product.status}
                        </span>
                        {product.distance !== undefined && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-white/90 text-indigo-600 shadow-sm">
                                {formatDistance(product.distance)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition">
                        {product.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{product.category}</p>
                    <p className={`text-sm font-medium mt-2 ${getConditionColor(product.condition)}`}>
                        {product.condition}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500">Current Bid</p>
                            <p className="text-xl font-bold text-black">
                                ৳{product.currentBid || product.price}
                            </p>
                        </div>
                        {product.bidCount !== undefined && (
                            <div className="flex items-center gap-1 text-gray-600">
                                <FaGavel className="text-sm text-indigo-600" />
                                <span className="text-sm">{product.bidCount}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </Link>
    );
}
