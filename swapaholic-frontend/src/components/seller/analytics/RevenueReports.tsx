'use client';

import { useState } from 'react';
import { FaChartBar, FaCalendarDay, FaCalendarWeek, FaCalendarAlt } from 'react-icons/fa';

interface RevenueData {
    daily: { date: string; amount: number }[];
    weekly: { week: string; amount: number }[];
    monthly: { month: string; amount: number }[];
}

interface RevenueReportsProps {
    data: RevenueData;
}

export default function RevenueReports({ data }: RevenueReportsProps) {
    const [view, setView] = useState<'daily' | 'weekly' | 'monthly'>('daily');

    // Add defensive check for data
    if (!data || !data[view]) {
        return (
            <div className="bg-white p-6 rounded-xl shadow-lg h-96 flex items-center justify-center">
                <p className="text-gray-500">No revenue data available</p>
            </div>
        );
    }

    const currentData = data[view];
    const maxAmount = Math.max(...currentData.map((d: any) => d.amount), 1);

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaChartBar className="text-indigo-600" />
                    Revenue Reports
                </h2>

                {/* View Selector */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setView('daily')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${view === 'daily'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <FaCalendarDay />
                        Daily
                    </button>
                    <button
                        onClick={() => setView('weekly')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${view === 'weekly'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <FaCalendarWeek />
                        Weekly
                    </button>
                    <button
                        onClick={() => setView('monthly')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition ${view === 'monthly'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        <FaCalendarAlt />
                        Monthly
                    </button>
                </div>
            </div>

            {/* Bar Chart */}
            <div className="relative h-80 mb-6">
                <div className="flex items-end justify-between h-full gap-1">
                    {currentData.slice(0, 20).map((item: any, index: number) => {
                        const height = (item.amount / maxAmount) * 100;
                        const label = view === 'daily'
                            ? new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : view === 'weekly'
                                ? item.week
                                : item.month;

                        return (
                            <div key={index} className="flex-1 flex flex-col items-center justify-end h-full group">
                                <div className="relative w-full">
                                    <div
                                        className="w-full bg-linear-to-t from-indigo-600 to-indigo-400 rounded-t-lg hover:from-indigo-700 hover:to-indigo-500 transition cursor-pointer"
                                        style={{ height: `${height}%` }}
                                        title={`৳${item.amount.toLocaleString()}`}
                                    >
                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                                            ৳{item.amount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-600 mt-2 transform -rotate-45 origin-top-left">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t">
                <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{currentData.reduce((sum: number, d: any) => sum + d.amount, 0).toLocaleString()}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Average</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{Math.round(currentData.reduce((sum: number, d: any) => sum + d.amount, 0) / currentData.length).toLocaleString()}
                    </p>
                </div>
                <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Peak</p>
                    <p className="text-2xl font-bold text-gray-900">
                        ৳{Math.max(...currentData.map((d: any) => d.amount)).toLocaleString()}
                    </p>
                </div>
            </div>
        </div>
    );
}
