'use client';

import { useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import ProductCard from './ProductCard';

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
}

interface SimilarProductsProps {
    products: Product[];
    currentProductId: string;
}

export default function SimilarProducts({ products, currentProductId }: SimilarProductsProps) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const filteredProducts = products.filter((p) => p.id !== currentProductId);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const scrollAmount = 320;
            scrollContainerRef.current.scrollBy({
                left: direction === 'left' ? -scrollAmount : scrollAmount,
                behavior: 'smooth',
            });
        }
    };

    if (filteredProducts.length === 0) {
        return null;
    }

    return (
        <section className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Similar Products</h2>
                <div className="flex gap-2">
                    <button
                        onClick={() => scroll('left')}
                        className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                        aria-label="Scroll left"
                    >
                        <FaChevronLeft />
                    </button>
                    <button
                        onClick={() => scroll('right')}
                        className="p-2 rounded-full border border-gray-300 hover:bg-gray-50 transition"
                        aria-label="Scroll right"
                    >
                        <FaChevronRight />
                    </button>
                </div>
            </div>

            <div
                ref={scrollContainerRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
                style={{ scrollbarWidth: 'none' }}
            >
                {filteredProducts.map((product) => (
                    <div key={product.id} className="min-w-[280px] flex-shrink-0">
                        <ProductCard product={product} viewMode="grid" />
                    </div>
                ))}
            </div>
        </section>
    );
}
