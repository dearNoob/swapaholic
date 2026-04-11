'use client';

import React from 'react';
import {
    FaUsers, FaBox, FaShoppingCart, FaMoneyBillWave,
    FaGavel, FaExclamationTriangle, FaArrowUp, FaArrowDown
} from 'react-icons/fa';

interface StatsData {
    users: { total: number; sellers: number; buyers: number; admins: number };
    products: { total: number; active: number; sold: number; expired: number };
    orders: { total: number; pending: number; completed: number; disputed: number; completionRate: string | number };
    payments: { total: number; escrowed: number; released: number; failed: number; totalRevenue: number };
    bids: { total: number; active: number; accepted: number };
    disputes: { total: number; open: number; underReview: number; resolved: number };
    revenue: { total: number; thisMonth: number; commission: number };
}

interface AdminStatsCardsProps {
    stats: StatsData;
}

const StatCard = ({
    icon: Icon,
    title,
    value,
    subtitle,
    gradient,
    iconBg,
    trend,
}: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle: string;
    gradient: string;
    iconBg: string;
    trend?: number;
}) => (
    <div className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${gradient}`}>
        {/* Decorative circle */}
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />

        <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${iconBg}`}>
                    <Icon className="text-xl text-white" />
                </div>
                {trend !== undefined && trend !== 0 && (
                    <div className={`flex items-center gap-1 text-sm font-semibold px-2 py-1 rounded-full ${trend > 0 ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'}`}>
                        {trend > 0 ? <FaArrowUp className="text-xs" /> : <FaArrowDown className="text-xs" />}
                        {Math.abs(trend)}%
                    </div>
                )}
            </div>
            <p className="text-sm font-medium opacity-80 mb-1">{title}</p>
            <p className="text-3xl font-extrabold tracking-tight">{value}</p>
            <p className="text-xs opacity-70 mt-2">{subtitle}</p>
        </div>
    </div>
);

export default function AdminStatsCards({ stats }: AdminStatsCardsProps) {
    const cards = [
        {
            icon: FaUsers,
            title: 'Total Users',
            value: stats.users.total.toLocaleString(),
            subtitle: `${stats.users.sellers} sellers / ${stats.users.buyers} buyers`,
            gradient: 'bg-gradient-to-br from-blue-500 to-blue-700',
            iconBg: 'bg-blue-400/30',
        },
        {
            icon: FaBox,
            title: 'Active Products',
            value: stats.products.active.toLocaleString(),
            subtitle: `${stats.products.total} total / ${stats.products.sold} sold`,
            gradient: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
            iconBg: 'bg-emerald-400/30',
        },
        {
            icon: FaShoppingCart,
            title: 'Total Orders',
            value: stats.orders.total.toLocaleString(),
            subtitle: `${stats.orders.completionRate}% completion rate`,
            gradient: 'bg-gradient-to-br from-violet-500 to-violet-700',
            iconBg: 'bg-violet-400/30',
        },
        {
            icon: FaMoneyBillWave,
            title: 'Revenue',
            value: `BDT ${(stats.revenue?.total || stats.payments?.totalRevenue || 0).toLocaleString()}`,
            subtitle: `BDT ${(stats.revenue?.commission || 0).toLocaleString()} commission`,
            gradient: 'bg-gradient-to-br from-amber-500 to-orange-600',
            iconBg: 'bg-amber-400/30',
        },
        {
            icon: FaGavel,
            title: 'Active Bids',
            value: stats.bids.active.toLocaleString(),
            subtitle: `${stats.bids.total} total / ${stats.bids.accepted} accepted`,
            gradient: 'bg-gradient-to-br from-pink-500 to-rose-600',
            iconBg: 'bg-pink-400/30',
        },
        {
            icon: FaExclamationTriangle,
            title: 'Open Disputes',
            value: stats.disputes.open.toLocaleString(),
            subtitle: `${stats.disputes.total} total / ${stats.disputes.resolved} resolved`,
            gradient: 'bg-gradient-to-br from-red-500 to-red-700',
            iconBg: 'bg-red-400/30',
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {cards.map((card, index) => (
                <div
                    key={card.title}
                    style={{ animationDelay: `${index * 80}ms` }}
                    className="animate-fade-in opacity-0"
                >
                    <StatCard {...card} />
                </div>
            ))}
        </div>
    );
}
