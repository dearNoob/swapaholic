'use client';

import { FaStar, FaEye, FaGavel, FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';

interface PerformanceMetricsProps {
    averageRating: number;
    totalViews: number;
    totalBids: number;
    conversionRate: number;
    viewsTrend?: number;
    bidsTrend?: number;
    conversionTrend?: number;
}

export default function PerformanceMetrics({
    averageRating,
    totalViews,
    totalBids,
    conversionRate,
    viewsTrend = 0,
    bidsTrend = 0,
    conversionTrend = 0,
}: PerformanceMetricsProps) {
    const metrics = [
        {
            label: 'Average Rating',
            value: averageRating.toFixed(1),
            icon: FaStar,
            color: 'text-yellow-600',
            bgColor: 'bg-yellow-50',
            suffix: '/ 5',
        },
        {
            label: 'Total Views',
            value: totalViews.toLocaleString(),
            icon: FaEye,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            trend: viewsTrend,
        },
        {
            label: 'Total Bids',
            value: totalBids.toLocaleString(),
            icon: FaGavel,
            color: 'text-purple-600',
            bgColor: 'bg-purple-50',
            trend: bidsTrend,
        },
        {
            label: 'Conversion Rate',
            value: conversionRate.toFixed(1),
            icon: FaChartLine,
            color: 'text-green-600',
            bgColor: 'bg-green-50',
            suffix: '%',
            trend: conversionTrend,
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Performance Analytics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {metrics.map((metric) => (
                    <div key={metric.label} className={`${metric.bgColor} rounded-lg p-4`}>
                        <div className="flex items-center justify-between mb-3">
                            <metric.icon className={`text-2xl ${metric.color}`} />
                            {metric.trend !== undefined && metric.trend !== 0 && (
                                <div className={`flex items-center gap-1 text-sm font-semibold ${metric.trend > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {metric.trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
                                    {Math.abs(metric.trend)}%
                                </div>
                            )}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                        <p className="text-2xl font-bold text-gray-900">
                            {metric.value}
                            {metric.suffix && <span className="text-base text-gray-600 ml-1">{metric.suffix}</span>}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    );
}
