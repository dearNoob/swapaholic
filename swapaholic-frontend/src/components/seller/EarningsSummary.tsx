'use client';

import { FaDollarSign, FaCalendarAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface EarningsSummaryProps {
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    yearEarnings: number;
    todayTrend?: number;
    weekTrend?: number;
    monthTrend?: number;
}

export default function EarningsSummary({
    todayEarnings,
    weekEarnings,
    monthEarnings,
    yearEarnings,
    todayTrend = 0,
    weekTrend = 0,
    monthTrend = 0,
}: EarningsSummaryProps) {
    const periods = [
        {
            label: 'Today',
            value: todayEarnings,
            trend: todayTrend,
            bgColor: 'bg-linear-to-br from-green-400 to-green-600',
        },
        {
            label: 'This Week',
            value: weekEarnings,
            trend: weekTrend,
            bgColor: 'bg-linear-to-br from-blue-400 to-blue-600',
        },
        {
            label: 'This Month',
            value: monthEarnings,
            trend: monthTrend,
            bgColor: 'bg-linear-to-br from-purple-400 to-purple-600',
        },
        {
            label: 'This Year',
            value: yearEarnings,
            bgColor: 'bg-linear-to-br from-indigo-400 to-indigo-600',
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <FaDollarSign className="text-3xl text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Earnings Summary</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {periods.map((period) => (
                    <div
                        key={period.label}
                        className={`${period.bgColor} text-white rounded-lg p-6 shadow-md hover:shadow-xl transition transform hover:scale-105`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <FaCalendarAlt className="text-2xl opacity-80" />
                            {period.trend !== undefined && period.trend !== 0 && (
                                <div className="flex items-center gap-1 bg-white bg-opacity-20 px-2 py-1 rounded-full text-sm font-semibold">
                                    {period.trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                                    {Math.abs(period.trend)}%
                                </div>
                            )}
                        </div>
                        <p className="text-sm opacity-90 mb-1">{period.label}</p>
                        <p className="text-3xl font-bold">৳{period.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <p className="text-gray-600 mb-1">Average Daily  Earnings</p>
                        <p className="text-xl font-bold text-gray-900">
                            ৳{(monthEarnings / 30).toFixed(2)}
                        </p>
                    </div>
                    <div>
                        <p className="text-gray-600 mb-1">Projected Month</p>
                        <p className="text-xl font-bold text-gray-900">
                            ৳{((monthEarnings / new Date().getDate()) * 30).toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
