'use client';

import { FaPercentage, FaChartLine, FaShoppingCart, FaEye } from 'react-icons/fa';

interface ConversionData {
    viewToBid: number;
    bidToSale: number;
    overallConversion: number;
    avgBidsPerListing: number;
}

interface ConversionMetricsProps {
    data: ConversionData;
}

export default function ConversionMetrics({ data }: ConversionMetricsProps) {
    const metrics = [
        {
            label: 'View to Bid',
            value: data.viewToBid,
            icon: FaEye,
            color: 'bg-blue-500',
            description: 'Visitors who placed a bid',
        },
        {
            label: 'Bid to Sale',
            value: data.bidToSale,
            icon: FaShoppingCart,
            color: 'bg-green-500',
            description: 'Bids that resulted in sales',
        },
        {
            label: 'Overall Conversion',
            value: data.overallConversion,
            icon: FaChartLine,
            color: 'bg-purple-500',
            description: 'Views that became sales',
        },
        {
            label: 'Avg. Bids Per Listing',
            value: data.avgBidsPerListing,
            icon: FaPercentage,
            color: 'bg-orange-500',
            description: 'Average bids received',
            isDecimal: true,
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <FaPercentage className="text-indigo-600" />
                Conversion Metrics
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((metric) => {
                    const Icon = metric.icon;
                    const displayValue = metric.isDecimal
                        ? metric.value.toFixed(1)
                        : `${metric.value.toFixed(1)}%`;

                    return (
                        <div
                            key={metric.label}
                            className="relative bg-linear-to-br from-gray-50 to-white rounded-lg p-6 border-2 border-gray-200 hover:border-indigo-300 hover:shadow-lg transition"
                        >
                            {/* Icon Badge */}
                            <div className={`${metric.color} w-12 h-12 rounded-full flex items-center justify-center mb-4`}>
                                <Icon className="text-white text-xl" />
                            </div>

                            {/* Value */}
                            <p className="text-3xl font-bold text-gray-900 mb-2">
                                {displayValue}
                            </p>

                            {/* Label */}
                            <p className="text-sm font-semibold text-gray-700 mb-1">
                                {metric.label}
                            </p>

                            {/* Description */}
                            <p className="text-xs text-gray-500">
                                {metric.description}
                            </p>

                            {/* Progress Bar */}
                            {!metric.isDecimal && (
                                <div className="mt-4">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`${metric.color} h-2 rounded-full transition-all`}
                                            style={{ width: `${Math.min(metric.value, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Insights */}
            <div className="mt-6 p-4 bg-indigo-50 rounded-lg border-l-4 border-indigo-600">
                <p className="text-sm text-gray-700">
                    <strong>💡 Insight:</strong> {
                        data.overallConversion < 5
                            ? 'Your conversion rate is below average. Consider improving product descriptions and images.'
                            : data.overallConversion < 10
                                ? 'Good conversion rate! Keep optimizing your listings for better results.'
                                : 'Excellent conversion rate! Your listings are performing very well.'
                    }
                </p>
            </div>
        </div>
    );
}
