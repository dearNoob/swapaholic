'use client';

import { FaGavel, FaTrophy, FaShoppingBag, FaHeart, FaArrowUp, FaArrowRight } from 'react-icons/fa';

interface DashboardStatsProps {
    activeBids: number;
    wonAuctions: number;
    totalOrders: number;
    savedItems: number;
}

export default function DashboardStats({ activeBids, wonAuctions, totalOrders, savedItems }: DashboardStatsProps) {
    const stats = [
        {
            label: 'Active Bids',
            value: activeBids,
            icon: FaGavel,
            gradient: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-200',
            textColor: 'text-blue-600',
            desc: 'Auctions in progress'
        },
        {
            label: 'Won Auctions',
            value: wonAuctions,
            icon: FaTrophy,
            gradient: 'from-amber-400 to-orange-500',
            shadow: 'shadow-orange-200',
            textColor: 'text-orange-600',
            desc: 'Waiting for payment'
        },
        {
            label: 'Total Orders',
            value: totalOrders,
            icon: FaShoppingBag,
            gradient: 'from-emerald-400 to-teal-500',
            shadow: 'shadow-emerald-200',
            textColor: 'text-emerald-600',
            desc: 'Completed purchases'
        },
        {
            label: 'Saved Items',
            value: savedItems,
            icon: FaHeart,
            gradient: 'from-rose-400 to-pink-500',
            shadow: 'shadow-pink-200',
            textColor: 'text-pink-600',
            desc: 'Watchlist updates'
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat) => (
                <div
                    key={stat.label}
                    className="relative group bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${stat.gradient} opacity-10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110`} />

                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg ${stat.shadow}`}>
                                <stat.icon className="text-xl" />
                            </div>
                            <span className="flex items-center text-xs font-medium text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                                View <FaArrowRight className="ml-1 text-[10px]" />
                            </span>
                        </div>

                        <div>
                            <h3 className="text-3xl font-bold text-gray-800 mb-1 tracking-tight">
                                {stat.value}
                            </h3>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-xs text-gray-400 mt-1">{stat.desc}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
