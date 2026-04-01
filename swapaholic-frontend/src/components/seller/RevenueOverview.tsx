'use client';

import Link from 'next/link';
import { FaDollarSign, FaClock, FaBox, FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface RevenueOverviewProps {
    totalRevenue: number;
    pendingPayments: number;
    activeListings: number;
    totalSales: number;
    revenueTrend?: number; // percentage change
    salesTrend?: number;
}

export default function RevenueOverview({
    totalRevenue,
    pendingPayments,
    activeListings,
    totalSales,
    revenueTrend = 0,
    salesTrend = 0
}: RevenueOverviewProps) {
    const stats = [
        {
            label: 'Total Revenue',
            value: `৳${totalRevenue.toLocaleString()}`,
            icon: FaDollarSign,
            color: 'bg-green-100 text-green-600',
            bgColor: 'bg-green-50',
            trend: revenueTrend,
        },
        {
            label: 'Pending Payments',
            value: `৳${pendingPayments.toLocaleString()}`,
            icon: FaClock,
            color: 'bg-orange-100 text-orange-600',
            bgColor: 'bg-orange-50',
        },
        {
            label: 'Active Listings',
            value: activeListings,
            icon: FaBox,
            color: 'bg-blue-100 text-blue-600',
            bgColor: 'bg-blue-50',
            link: '/seller/listings',
        },
        {
            label: 'Total Sales',
            value: totalSales,
            icon: FaChartLine,
            color: 'bg-purple-100 text-purple-600',
            bgColor: 'bg-purple-50',
            trend: salesTrend,
        },
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat) => {
                const content = (
                    <div className={`${stat.bgColor} rounded-lg p-6 shadow-md hover:shadow-lg transition h-full`}>
                        <div className="flex items-center justify-between mb-4">
                            <div className={`${stat.color} rounded-full p-4`}>
                                <stat.icon className="text-2xl" />
                            </div>
                            {stat.trend !== undefined && stat.trend !== 0 && (
                                <div className={`flex items-center gap-1 text-sm font-semibold ${stat.trend > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {stat.trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                                    {Math.abs(stat.trend)}%
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
                    </div>
                );

                if (stat.link) {
                    return (
                        <Link key={stat.label} href={stat.link} className="block h-full">
                            {content}
                        </Link>
                    );
                }

                return (
                    <div key={stat.label} className="h-full">
                        {content}
                    </div>
                );
            })}
        </div>
    );
}
