'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaTrophy, FaEye, FaDollarSign, FaShoppingCart } from 'react-icons/fa';

interface Product {
    id: string;
    title: string;
    image: string;
    sales: number;
    revenue: number;
    views: number;
}

interface BestSellingProductsProps {
    products: Product[];
}

export default function BestSellingProducts({ products }: BestSellingProductsProps) {
    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaTrophy className="text-yellow-500" />
                Best Selling Products
            </h2>

            <div className="space-y-4">
                {products.slice(0, 5).map((product, index) => (
                    <div
                        key={product.id}
                        className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition"
                    >
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                index === 1 ? 'bg-gray-400' :
                                    index === 2 ? 'bg-orange-600' :
                                        'bg-gray-300'
                            }`}>
                            #{index + 1}
                        </div>

                        {/* Product Image */}
                        <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                                src={product.image}
                                alt={product.title}
                                fill
                                className="object-cover"
                            />
                        </div>

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                            <Link
                                href={`/products/${product.id}`}
                                className="font-semibold text-gray-900 hover:text-indigo-600 transition block truncate"
                            >
                                {product.title}
                            </Link>
                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                    <FaShoppingCart className="text-green-600" />
                                    {product.sales} sales
                                </span>
                                <span className="flex items-center gap-1">
                                    <FaEye className="text-blue-600" />
                                    {product.views} views
                                </span>
                            </div>
                        </div>

                        {/* Revenue */}
                        <div className="text-right">
                            <p className="text-sm text-gray-600 mb-1">Revenue</p>
                            <p className="text-xl font-bold text-green-600">
                                ৳{product.revenue.toLocaleString()}
                            </p>
                        </div>
                    </div>
                ))}
            </div>

            {/* View All Link */}
            {products.length > 5 && (
                <div className="mt-6 text-center">
                    <Link
                        href="/seller/products/analytics"
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                        View All Products →
                    </Link>
                </div>
            )}
        </div>
    );
}
