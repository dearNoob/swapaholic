'use client';

import React from 'react';
import { FaStar } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface RatingBreakdown {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
}

interface ReviewStatisticsProps {
    totalReviews: number;
    averageRating: number;
    ratingBreakdown: RatingBreakdown;
}

export default function ReviewStatistics({
    totalReviews,
    averageRating,
    ratingBreakdown
}: ReviewStatisticsProps) {
    const chartData = [
        { name: '5★', count: ratingBreakdown[5], color: '#10B981' },
        { name: '4★', count: ratingBreakdown[4], color: '#84CC16' },
        { name: '3★', count: ratingBreakdown[3], color: '#FCD34D' },
        { name: '2★', count: ratingBreakdown[2], color: '#FB923C' },
        { name: '1★', count: ratingBreakdown[1], color: '#EF4444' }
    ];

    const getPercentage = (count: number) => {
        return totalReviews > 0 ? ((count / totalReviews) * 100).toFixed(0) : 0;
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Customer Reviews</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Overall Rating */}
                <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900 mb-2">
                        {averageRating.toFixed(1)}
                    </div>
                    <div className="flex justify-center gap-1 mb-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <FaStar
                                key={star}
                                className={`text-2xl ${star <= Math.round(averageRating)
                                        ? 'text-yellow-400'
                                        : 'text-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                    <p className="text-sm text-gray-600">
                        Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
                    </p>
                </div>

                {/* Rating Breakdown */}
                <div className="space-y-2">
                    {[5, 4, 3, 2, 1].map((rating) => {
                        const count = ratingBreakdown[rating as keyof RatingBreakdown];
                        const percentage = getPercentage(count);

                        return (
                            <div key={rating} className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-700 w-8">
                                    {rating}★
                                </span>
                                <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                                    <div
                                        className="h-full bg-yellow-400 transition-all duration-500"
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 w-12 text-right">
                                    {count}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Chart */}
            <div className="mt-6 h-32">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis hide />
                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
