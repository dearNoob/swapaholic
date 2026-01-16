'use client';

import React from 'react';
import { FaDollarSign, FaShoppingBag, FaStar, FaBoxOpen, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ElementType;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    color: 'indigo' | 'green' | 'yellow' | 'blue';
}

const StatCard = ({ title, value, icon: Icon, trend, color }: StatCardProps) => {
    const colorClasses = {
        indigo: 'bg-indigo-50 text-indigo-600',
        green: 'bg-green-50 text-green-600',
        yellow: 'bg-yellow-50 text-yellow-600',
        blue: 'bg-blue-50 text-blue-600'
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-transform hover:scale-[1.02]">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon className="text-xl" />
                </div>
            </div>

            {trend && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`
            flex items-center font-medium
            ${trend.isPositive ? 'text-green-600' : 'text-red-600'}
          `}>
                        {trend.isPositive ? <FaArrowUp className="mr-1" /> : <FaArrowDown className="mr-1" />}
                        {Math.abs(trend.value)}%
                    </span>
                    <span className="text-gray-500 ml-2">vs last month</span>
                </div>
            )}
        </div>
    );
};

interface QuickStatsProps {
    stats?: {
        totalRevenue: number;
        activeOrders: number;
        rating: number;
        totalProducts: number;
    };
}

export default function QuickStatsCards({ stats }: QuickStatsProps) {
    // Mock data if not provided
    const data = stats || {
        totalRevenue: 12450.00,
        activeOrders: 15,
        rating: 4.8,
        totalProducts: 42
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
                title="Total Revenue"
                value={`৳${data.totalRevenue.toLocaleString()}`}
                icon={FaDollarSign}
                trend={{ value: 12.5, isPositive: true }}
                color="green"
            />
            <StatCard
                title="Active Orders"
                value={data.activeOrders}
                icon={FaShoppingBag}
                trend={{ value: 5.2, isPositive: true }}
                color="blue"
            />
            <StatCard
                title="Average Rating"
                value={data.rating}
                icon={FaStar}
                trend={{ value: 0.1, isPositive: true }}
                color="yellow"
            />
            <StatCard
                title="Total Products"
                value={data.totalProducts}
                icon={FaBoxOpen}
                trend={{ value: 2.4, isPositive: false }}
                color="indigo"
            />
        </div>
    );
}
