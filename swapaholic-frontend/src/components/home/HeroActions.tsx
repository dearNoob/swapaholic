'use client';

import React from 'react';
import Link from 'next/link';
import { FaArrowRight, FaGavel } from 'react-icons/fa';
import { useAppSelector } from '../../store/hooks';

export default function HeroActions() {
    const { isAuthenticated } = useAppSelector((state: any) => state.auth);

    const sellHref = isAuthenticated ? "/seller/create-listing" : "/login";

    return (
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md mx-auto">
            <Link href="/products" className="w-full sm:w-auto">
                <button className="w-full px-8 py-4 bg-slate-900 text-white rounded-2xl font-semibold text-lg hover:bg-slate-800 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5 flex items-center justify-center gap-2 group">
                    Explore Auctions <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
            </Link>
            <Link href={sellHref} className="w-full sm:w-auto">
                <button className="w-full px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-800 rounded-2xl font-semibold text-lg hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 transition-all flex items-center justify-center gap-2 shadow-sm">
                    Start Selling <FaGavel className="text-slate-500 dark:text-slate-400" />
                </button>
            </Link>
        </div>
    );
}
