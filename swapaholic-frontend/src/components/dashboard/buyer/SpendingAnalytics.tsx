'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
    Legend
} from 'recharts';

interface SpendingData {
    category: string;
    amount: number;
    color: string;
}

interface SpendingAnalyticsProps {
    data?: SpendingData[];
    totalSpent?: number;
}

export default function SpendingAnalytics({ data, totalSpent }: SpendingAnalyticsProps) {
    // Mock data
    const mockData: SpendingData[] = [
        { category: 'Electronics', amount: 450, color: '#4F46E5' },
        { category: 'Fashion', amount: 320, color: '#EC4899' },
        { category: 'Home & Garden', amount: 210, color: '#10B981' },
        { category: 'Collectibles', amount: 150, color: '#F59E0B' },
        { category: 'Others', amount: 80, color: '#6B7280' }
    ];

    const chartData = data || mockData;
    const total = totalSpent || chartData.reduce((acc, curr) => acc + curr.amount, 0);

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-semibold text-gray-900">{payload[0].name}</p>
                    <p className="text-gray-600">
                        ৳{payload[0].value} ({((payload[0].value / total) * 100).toFixed(1)}%)
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Spending Analytics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Chart */}
                <div className="h-[250px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData as any}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="amount"
                                nameKey="category"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>

                    {/* Center Text */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-xs text-gray-500 font-medium">Total</p>
                        <p className="text-xl font-bold text-gray-900">৳{total.toLocaleString()}</p>
                    </div>
                </div>

                {/* Legend / List */}
                <div className="space-y-4">
                    {chartData.map((item) => (
                        <div key={item.category} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm font-medium text-gray-700">{item.category}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-bold text-gray-900">৳{item.amount}</p>
                                <p className="text-xs text-gray-500">
                                    {((item.amount / total) * 100).toFixed(1)}%
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
