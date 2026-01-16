'use client';

import React, { useState } from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    Legend
} from 'recharts';

interface RevenueData {
    date: string;
    revenue: number;
    orders: number;
}

interface RevenueChartProps {
    data?: RevenueData[];
}

export default function RevenueChart({ data }: RevenueChartProps) {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');

    // Mock data generator
    const mockData = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: Math.floor(Math.random() * 500) + 100,
            orders: Math.floor(Math.random() * 10) + 1
        };
    });

    const chartData = data || mockData;

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-4 border border-gray-200 shadow-lg rounded-lg">
                    <p className="font-semibold text-gray-900 mb-2">{label}</p>
                    <p className="text-indigo-600 font-medium">
                        Revenue: ৳{payload[0].value}
                    </p>
                    <p className="text-blue-600 font-medium">
                        Orders: {payload[1]?.value}
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Revenue Analytics</h3>
                    <p className="text-sm text-gray-500">Track your earnings and order volume</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-lg">
                    <button
                        onClick={() => setTimeRange('7d')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeRange === '7d' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        7 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('30d')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeRange === '30d' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        30 Days
                    </button>
                    <button
                        onClick={() => setTimeRange('90d')}
                        className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${timeRange === '90d' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        90 Days
                    </button>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'area' ? (
                        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1} />
                                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                dy={10}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#6B7280', fontSize: 12 }}
                                tickFormatter={(value) => `৳${value}`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke="#4F46E5"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                            />
                        </AreaChart>
                    ) : (
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="revenue" fill="#4F46E5" />
                            <Bar dataKey="orders" fill="#3B82F6" />
                        </BarChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );
}
