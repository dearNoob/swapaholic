'use client';

import { FaGavel, FaHeart, FaTrophy, FaDollarSign } from 'react-icons/fa';

interface StatsData {
    activeBids: number;
    watchlistCount: number;
    wonAuctions: number;
    totalSpent: number;
}

interface QuickStatsProps {
    stats: StatsData;
}

export default function QuickStats({ stats }: QuickStatsProps) {
    const statCards = [
        {
            label: 'Active Bids',
            value: stats.activeBids,
            icon: FaGavel,
            color: 'bg-linear-to-br from-blue-500 to-blue-600',
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-600',
        },
        {
            label: 'Watchlist',
            value: stats.watchlistCount,
            icon: FaHeart,
            color: 'bg-linear-to-br from-pink-500 to-pink-600',
            iconBg: 'bg-pink-100',
            iconColor: 'text-pink-600',
        },
        {
            label: 'Won Auctions',
            value: stats.wonAuctions,
            icon: FaTrophy,
            color: 'bg-linear-to-br from-yellow-500 to-yellow-600',
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-600',
        },
        {
            label: 'Total Spent',
            value: `৳${stats.totalSpent.toLocaleString()}`,
            icon: FaDollarSign,
            color: 'bg-linear-to-br from-green-500 to-green-600',
            iconBg: 'bg-green-100',
            iconColor: 'text-green-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat) => (
                <div
                    key={stat.label}
                    className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition transform hover:scale-105"
                >
                    <div className="flex items-center justify-between mb-4">
                        <div className={`${stat.iconBg} rounded-full p-3`}>
                            <stat.icon className={`text-2xl ${stat.iconColor}`} />
                        </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                </div>
            ))}
        </div>
    );
}
