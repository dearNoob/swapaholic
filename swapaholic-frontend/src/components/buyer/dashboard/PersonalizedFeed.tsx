'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaFire, FaClock, FaGavel, FaTag } from 'react-icons/fa';

interface Product {
    id: string;
    title: string;
    image: string;
    currentBid: number;
    endTime: string;
    bids: number;
    category: string;
}

interface PersonalizedFeedProps {
    products: Product[];
}

export default function PersonalizedFeed({ products }: PersonalizedFeedProps) {
    const getTimeRemaining = (endTime: string) => {
        const diff = new Date(endTime).getTime() - Date.now();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d left`;
        if (hours > 0) return `${hours}h left`;
        return 'Ending soon';
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <FaFire className="text-2xl text-orange-500" />
                <h2 className="text-2xl font-bold text-gray-900">Trending in Your Categories</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product) => (
                    <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="group flex gap-4 border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 hover:shadow-lg transition"
                    >
                        {/* Product Image */}
                        <div className="relative w-32 h-32 bg-gray-100 flex-shrink-0">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-105 transition"
                            />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 p-4">
                            {/* Category Badge */}
                            <div className="flex items-center gap-1 text-xs text-indigo-600 mb-2">
                                <FaTag className="text-xs" />
                                {product.category}
                            </div>

                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition">
                                {product.title}
                            </h3>

                            <div className="flex items-center justify-between text-sm">
                                <div>
                                    <p className="text-xs text-gray-500">Current Bid</p>
                                    <p className="text-lg font-bold text-green-600">
                                        ${product.currentBid}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-gray-600 text-xs mb-1">
                                        <FaGavel />
                                        {product.bids} bids
                                    </div>
                                    <div className="flex items-center gap-1 text-orange-600 text-xs">
                                        <FaClock />
                                        {getTimeRemaining(product.endTime)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* View All Link */}
            <div className="mt-6 text-center">
                <Link
                    href="/products"
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                >
                    Explore More Products →
                </Link>
            </div>
        </div>
    );
}
