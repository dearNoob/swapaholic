'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaClock, FaCamera } from 'react-icons/fa';
import AuctionTimer from './AuctionTimer';

interface Product {
    id: string;
    _id?: string;
    title: string;
    image?: string;
    currentBid?: number;
    auctionEndTime: string;
}

export default function RecentlyViewed() {
    const [recentlyViewed, setRecentlyViewed] = useState<Product[]>([]);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
        const storedRecent = localStorage.getItem('swapaholic_recently_viewed');
        if (storedRecent) {
            try {
                const parsed = JSON.parse(storedRecent);
                if (Array.isArray(parsed)) {
                    setRecentlyViewed(parsed);
                }
            } catch (error) {
                console.error('Failed to parse recently viewed items', error);
            }
        }
    }, []);

    if (!isMounted || recentlyViewed.length === 0) return null;

    const sectionClass = "md:sticky md:top-0 md:h-[100dvh] w-full relative overflow-y-auto overflow-x-hidden scrollbar-hide";

    return (
        <section className={`${sectionClass} z-[2] bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 shadow-[0_-20px_50px_rgba(0,0,0,0.03)]`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 w-full">
                <div className="flex items-center gap-3 mb-8">
                    <FaClock className="text-2xl text-indigo-500" />
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Recently Viewed</h2>
                </div>

                <div className="flex overflow-x-auto gap-6 pb-4 scrollbar-hide snap-x">
                    {recentlyViewed.map((product, index) => {
                            const productId = product.id || product._id;
                            if (!productId) return null;
                            return (
                        <Link 
                            key={productId} 
                            href={`/products/${productId}`} 
                            className="min-w-[280px] w-[280px] snap-start group bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all flex flex-col overflow-hidden"
                        >
                            <div className="relative aspect-square bg-slate-100 dark:bg-slate-800 p-4 flex items-center justify-center overflow-hidden">
                                {product.image ? (
                                    <Image 
                                        src={product.image} 
                                        alt={product.title} 
                                        fill
                                        className="object-contain p-4 group-hover:scale-105 transition-transform mix-blend-multiply dark:mix-blend-normal"
                                        sizes="280px"
                                        priority={false}
                                    />
                                ) : (
                                    <FaCamera className="text-3xl text-slate-300" />
                                )}
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2 text-sm mb-2 group-hover:text-indigo-600 transition-colors uppercase">
                                    {product.title}
                                </h3>
                                <div className="mt-auto pt-2 border-t border-slate-50 dark:border-slate-800 flex justify-between items-end">
                                    <p className="text-lg font-bold text-indigo-600">৳{product.currentBid?.toLocaleString()}</p>
                                    <AuctionTimer 
                                        endTime={product.auctionEndTime} 
                                        variant="compact" 
                                        className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-[10px]" 
                                        showLabel={false}
                                    />
                                </div>
                            </div>
                        </Link>
                            );
                        }
                    )}
                </div>
            </div>
        </section>
    );
}
