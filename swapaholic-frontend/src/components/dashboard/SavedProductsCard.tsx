'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaHeart, FaTrash, FaShoppingCart, FaGavel, FaArrowRight } from 'react-icons/fa';

interface SavedProduct {
    id: string;
    productId: string;
    title: string;
    image: string;
    currentPrice: number;
    originalPrice: number;
    priceAlert: boolean;
    endTime?: string;
}

interface SavedProductsCardProps {
    products: SavedProduct[];
    onRemove: (productId: string) => void;
}

export default function SavedProductsCard({ products, onRemove }: SavedProductsCardProps) {
    if (products.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaHeart className="text-3xl text-pink-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Wishlist is Empty</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Save items you love to track their price and availability.
                </p>
                <Link
                    href="/products"
                    className="inline-flex items-center px-6 py-3 bg-pink-600 text-white font-medium rounded-xl hover:bg-pink-700 transition shadow-lg shadow-pink-200"
                >
                    Explore Items <FaArrowRight className="ml-2" />
                </Link>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="p-2 bg-pink-100 rounded-lg text-pink-600">
                        <FaHeart />
                    </span>
                    Saved Items
                    <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {products.length}
                    </span>
                </h2>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {products.map((product) => (
                        <div key={product.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-300">
                            {/* Remove Button */}
                            <button
                                onClick={() => onRemove(product.productId)}
                                className="absolute top-3 right-3 z-10 p-2 bg-white/80 backdrop-blur-sm rounded-full text-gray-400 hover:text-red-500 hover:bg-white transition shadow-sm opacity-0 group-hover:opacity-100"
                                title="Remove from wishlist"
                            >
                                <FaTrash size={14} />
                            </button>

                            {/* Image */}
                            <Link href={`/products/${product.productId}`} className="block relative h-48 w-full bg-gray-100">
                                <Image
                                    src={product.image}
                                    alt={product.title}
                                    fill
                                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                {product.priceAlert && (
                                    <div className="absolute bottom-2 left-2 px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded shadow-sm">
                                        PRICE DROP
                                    </div>
                                )}
                            </Link>

                            {/* Content */}
                            <div className="p-4">
                                <Link href={`/products/${product.productId}`} className="block mb-2">
                                    <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-pink-600 transition">
                                        {product.title}
                                    </h3>
                                </Link>

                                <div className="flex items-end gap-2 mb-4">
                                    <span className="text-lg font-bold text-gray-900">৳{product.currentPrice.toLocaleString()}</span>
                                    {product.originalPrice > product.currentPrice && (
                                        <span className="text-sm text-gray-400 line-through mb-1">৳{product.originalPrice.toLocaleString()}</span>
                                    )}
                                </div>

                                <Link
                                    href={`/products/${product.productId}`}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
                                >
                                    <FaGavel size={14} />
                                    Place Bid
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
