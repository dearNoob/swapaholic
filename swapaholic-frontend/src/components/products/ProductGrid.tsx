'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaClock, FaGavel, FaCheckSquare, FaSquare } from 'react-icons/fa';
import { useEffect, useState } from 'react';
import { productsApi, Product as ProductType } from '@/api/products';
import { showErrorToast } from '@/utils/errorHandler';

interface ProductGridProps {
    products: ProductType[];
    comparisonItems: string[];
    onToggleComparison: (productId: string) => void;
}

export default function ProductGrid({ products, comparisonItems, onToggleComparison }: ProductGridProps) {
    // Internal state for pagination or other UI things if needed, but products come from parent

    const getTimeRemaining = (endTime?: string) => {
        if (!endTime) return '';
        const diff = new Date(endTime).getTime() - Date.now();
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(hours / 24);
        if (days > 0) return `${days}d left`;
        if (hours > 0) return `${hours}h left`;
        return 'Ending soon';
    };

    if (products.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
                <p className="text-gray-600 text-lg">No products found matching your filters</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your filter criteria</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {products.map((product) => (
                    <div
                        key={product.id}
                        className="group bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 hover:shadow-lg transition"
                    >
                        {/* Comparison Checkbox */}
                        <div className="relative">
                            <button
                                onClick={() => onToggleComparison(product.id)}
                                className="absolute top-2 left-2 z-10 bg-white bg-opacity-90 p-2 rounded-full hover:bg-opacity-100 transition"
                                title="Add to comparison"
                            >
                                {comparisonItems.includes(product.id) ? (
                                    <FaCheckSquare className="text-indigo-600 text-xl" />
                                ) : (
                                    <FaSquare className="text-gray-400 text-xl" />
                                )}
                            </button>

                            {/* Product Image */}
                            <Link href={`/products/${product.id}`}>
                                <div className="relative h-56 bg-gray-100">
                                    <Image
                                        src={(product.images?.[0] || '/products/placeholder.png') as string}
                                        alt={product.title}
                                        fill
                                        className="object-cover group-hover:scale-105 transition"
                                    />
                                    {/* Time Badge */}
                                    <div className="absolute top-2 right-2 bg-black bg-opacity-70 text-white px-3 py-1 rounded-full text-xs flex items-center gap-1">
                                        <FaClock />
                                        {getTimeRemaining(product.auctionEndTime)}
                                    </div>
                                </div>
                            </Link>
                        </div>

                        {/* Product Info */}
                        <div className="p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                                    {product.category}
                                </span>
                                <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                    {product.condition}
                                </span>
                            </div>

                            <Link href={`/products/${product.id}`}>
                                <h3 className="font-semibold text-gray-900 mb-3 line-clamp-2 group-hover:text-indigo-600 transition min-h-[3rem]">
                                    {product.title}
                                </h3>
                            </Link>

                            <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                                <div>
                                    <p className="text-xs text-gray-500">Current Bid</p>
                                    <p className="text-xl font-bold text-green-600">
                                        ৳{product.currentBid ?? product.price}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-gray-600 text-sm">
                                        <FaGavel className="text-xs" />
                                        {product.bidCount ?? 0} bids
                                    </div>
                                </div>
                            </div>

                            <Link href={`/products/${product.id}`}>
                                <button className="w-full mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium">
                                    View Details
                                </button>
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
