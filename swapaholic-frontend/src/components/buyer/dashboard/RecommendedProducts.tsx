'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaStar, FaClock, FaGavel } from 'react-icons/fa';

interface Product {
    id: string;
    title: string;
    image: string;
    currentBid: number;
    endTime: string;
    bids: number;
}

interface RecommendedProductsProps {
    products: Product[];
}

export default function RecommendedProducts({ products }: RecommendedProductsProps) {
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
                <FaStar className="text-2xl text-yellow-500" />
                <h2 className="text-2xl font-bold text-gray-900">Recommended for You</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map((product) => (
                    <Link
                        key={product.id}
                        href={`/products/${product.id}`}
                        className="group border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 hover:shadow-lg transition"
                    >
                        {/* Product Image */}
                        <div className="relative h-48 bg-gray-100">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover group-hover:scale-105 transition"
                            />
                            {/* Time Badge */}
                            <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                <FaClock />
                                {getTimeRemaining(product.endTime)}
                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                            <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-indigo-600 transition">
                                {product.title}
                            </h3>

                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-gray-500">Current Bid</p>
                                    <p className="text-lg font-bold text-green-600">
                                        ${product.currentBid}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                                        <FaGavel className="text-xs" />
                                        {product.bids} bids
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
