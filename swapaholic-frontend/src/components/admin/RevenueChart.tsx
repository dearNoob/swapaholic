'use client';

import React, { useState } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';

interface RevenueChartProps {
    analytics: {
        labels: string[];
        revenue: number[];
        users: number[];
        orders: number[];
        period: string;
    } | null;
    onPeriodChange: (period: '7d' | '30d' | '90d' | '1y') => void;
    currentPeriod: '7d' | '30d' | '90d' | '1y';
}

type ActiveMetric = 'all' | 'revenue' | 'orders' | 'users';

interface CustomTooltipEntry {
    color: string;
    name: string;
    value: number;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: CustomTooltipEntry[];
    label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (!active || !payload) return null;
    return (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 shadow-2xl">
            <p className="text-gray-400 text-sm mb-2 font-medium">{label}</p>
            {payload.map((entry, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-gray-300">{entry.name}:</span>
                    <span className="font-bold text-white">
                        {entry.name === 'Revenue' ? `BDT ${entry.value.toLocaleString()}` : entry.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default function RevenueChart({ analytics, onPeriodChange, currentPeriod }: RevenueChartProps) {
    const [activeMetric, setActiveMetric] = useState<ActiveMetric>('all');

    if (!analytics) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="h-80 flex items-center justify-center text-gray-400">
                    <p>Loading analytics data...</p>
                </div>
            </div>
        );
    }

    // Transform data for recharts
    const chartData = analytics.labels.map((label, i) => ({
        date: label.slice(5), // Show MM-DD
        Revenue: analytics.revenue[i] || 0,
        Orders: analytics.orders[i] || 0,
        Users: analytics.users[i] || 0,
    }));

    const periods: { value: '7d' | '30d' | '90d' | '1y'; label: string }[] = [
        { value: '7d', label: '7D' },
        { value: '30d', label: '30D' },
        { value: '90d', label: '90D' },
        { value: '1y', label: '1Y' },
    ];

    const metrics: Array<{ key: ActiveMetric; label: string }> = [
        { key: 'all', label: 'All' },
        { key: 'revenue', label: 'Revenue' },
        { key: 'orders', label: 'Orders' },
        { key: 'users', label: 'Users' },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-gray-900">Platform Overview</h3>
                    <p className="text-sm text-gray-500 mt-1">Revenue, orders and user trends</p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Metric Toggle */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {metrics.map((m) => (
                            <button
                                key={m.key}
                                onClick={() => setActiveMetric(m.key)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    activeMetric === m.key
                                        ? 'bg-white text-gray-900 shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {/* Period Selector */}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {periods.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => onPeriodChange(p.value)}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                    currentPeriod === p.value
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <defs>
                            <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradOrders" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gradUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#9CA3AF', fontSize: 12 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {(activeMetric === 'all' || activeMetric === 'revenue') && (
                            <Area
                                type="monotone"
                                dataKey="Revenue"
                                stroke="#6366F1"
                                fill="url(#gradRevenue)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                            />
                        )}
                        {(activeMetric === 'all' || activeMetric === 'orders') && (
                            <Area
                                type="monotone"
                                dataKey="Orders"
                                stroke="#10B981"
                                fill="url(#gradOrders)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                            />
                        )}
                        {(activeMetric === 'all' || activeMetric === 'users') && (
                            <Area
                                type="monotone"
                                dataKey="Users"
                                stroke="#F59E0B"
                                fill="url(#gradUsers)"
                                strokeWidth={2.5}
                                dot={false}
                                activeDot={{ r: 6, strokeWidth: 2 }}
                            />
                        )}
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
