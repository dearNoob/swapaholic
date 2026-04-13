'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaHome, FaChevronRight, FaGavel, FaClock } from 'react-icons/fa';
import { productsApi, Product } from '../../../api/products';
import ProductCard from '../../../components/ProductCard';

export default function EndedAuctionsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEndedProducts = async () => {
            setIsLoading(true);
            try {
                const response = await productsApi.getProducts({ 
                    status: 'auction_ended',
                    limit: 20 
                });
                // response is PaginatedResponse
                if (Array.isArray(response)) {
                    setProducts(response);
                } else if (response && response.data) {
                    setProducts(response.data);
                } else {
                    setProducts([]);
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load ended auctions');
            } finally {
                setIsLoading(false);
            }
        };

        fetchEndedProducts();
    }, []);

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2 text-sm mb-8">
                    <Link href="/" className="text-gray-600 hover:text-indigo-600 transition">
                        <FaHome />
                    </Link>
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <Link href="/products" className="text-gray-600 hover:text-indigo-600 transition">
                        Products
                    </Link>
                    <FaChevronRight className="text-gray-400 text-xs" />
                    <span className="text-gray-900 font-medium">Ended Auctions</span>
                </nav>

                <div className="mb-10 text-center sm:text-left">
                    <div className="flex items-center justify-center sm:justify-start gap-4 mb-2">
                        <div className="p-3 bg-red-100 rounded-2xl">
                            <FaClock className="text-2xl text-red-600" />
                        </div>
                        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                            Ended Auctions
                        </h1>
                    </div>
                    <p className="text-lg text-gray-600 max-w-2xl">
                        Browse history of completed auctions. See winning bids and transaction statuses.
                    </p>
                </div>

                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                            <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden">
                                <div className="h-56 bg-gray-200 animate-pulse" />
                                <div className="p-4 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded animate-pulse" />
                                    <div className="h-4 bg-gray-200 rounded w-2/3 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : error ? (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
                        <p className="text-red-700 font-medium mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                        >
                            Retry
                        </button>
                    </div>
                ) : products.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <FaGavel className="text-3xl text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">No ended auctions yet</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">
                            When an auction reaches its deadline, it will appear here for historical reference.
                        </p>
                        <Link 
                            href="/products"
                            className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition"
                        >
                            View Active Auctions
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {products.map((product) => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
