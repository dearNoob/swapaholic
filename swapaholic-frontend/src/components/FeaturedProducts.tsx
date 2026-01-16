'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { productsApi, Product } from '@/api/products';
import { showErrorToast } from '@/utils/errorHandler';

export default function FeaturedProducts() {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const data = await productsApi.getFeaturedProducts(5);
            setProducts(data);
        } catch (error) {
            showErrorToast(error);
        } finally {
            setLoading(false);
        }
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 320;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    return (
        <section className="w-full py-16">
            <div className="mb-8 flex items-center justify-between">
                <h2 className="text-4xl font-bold text-gray-900 dark:text-white">
                    Featured Products
                </h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="rounded-full bg-indigo-600 p-3 text-white transition hover:bg-indigo-700"
                        aria-label="Scroll left"
                    >
                        <FaChevronLeft />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="rounded-full bg-indigo-600 p-3 text-white transition hover:bg-indigo-700"
                        aria-label="Scroll right"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>
            <div
                ref={scrollContainerRef}
                className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide"
                style={{ scrollbarWidth: 'none' }}
            >
                {loading ? (
                    // Loading skeleton
                    Array.from({ length: 5 }).map((_, i) => (
                        <div
                            key={i}
                            className="min-w-[300px] rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-sm dark:bg-gray-800/80"
                        >
                            <div className="mb-4 h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
                            <div className="h-6 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                    ))
                ) : (
                    products.map((product) => (
                        <div
                            key={product.id}
                            className="min-w-[300px] rounded-xl bg-white/80 p-6 shadow-lg backdrop-blur-sm transition-transform hover:scale-105 dark:bg-gray-800/80"
                        >
                            <div className="mb-4 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
                                <Image
                                    src={product.images?.[0] || '/products/placeholder.png'}
                                    alt={product.title}
                                    width={300}
                                    height={200}
                                    loading="lazy"
                                    className="h-40 w-full object-cover"
                                />
                            </div>
                            <h3 className="mb-2 text-lg font-bold text-gray-900 dark:text-white">
                                {product.title}
                            </h3>
                            <div className="mb-4 flex items-center justify-between">
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                    Current Bid
                                </span>
                                <span className="text-lg font-bold text-indigo-600">
                                    ৳{product.currentBid}
                                </span>
                            </div>
                            <button className="w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white transition hover:bg-indigo-700">
                                Place Bid
                            </button>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}
