'use client';

import React, { useEffect, useState } from 'react';
import { FaTrophy, FaGavel, FaDollarSign, FaPercent, FaChartLine } from 'react-icons/fa';
import { bidsApi } from '@/api/bids';
import { showErrorToast } from '@/utils/errorHandler';
import {
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

interface BiddingStats {
    totalBids: number;
    auctionsWon: number;
    auctionsLost: number;
    activeAuctions: number;
    averageBid: number;
    totalSpent: number;
}

interface StatCardProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number;
    color: string;
}

interface BiddingAnalyticsProps {
    stats?: BiddingStats;
}

export default function BiddingAnalytics({ stats: providedStats }: BiddingAnalyticsProps) {
    const [stats, setStats] = useState<BiddingStats | null>(providedStats || null);
    const [isLoading, setIsLoading] = useState(!providedStats);

    useEffect(() => {
        if (!providedStats) {
            fetchAnalytics();
        }
    }, [providedStats]);

    const fetchAnalytics = async () => {
        setIsLoading(true);
        try {
            const data = await bidsApi.getBiddingAnalytics();
            setStats(data);
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="text-center py-12 text-gray-500">
                <FaChartLine className="text-4xl mx-auto mb-3 text-gray-300" />
                <p>No analytics data available</p>
            </div>
        );
    }

    const winRate = stats.totalBids > 0 ? ((stats.auctionsWon / stats.totalBids) * 100).toFixed(1) : '0.0';

    const pieData = [
        { name: 'Won', value: stats.auctionsWon, color: '#10B981' },
        { name: 'Lost', value: stats.auctionsLost, color: '#EF4444' },
        { name: 'Active', value: stats.activeAuctions, color: '#F59E0B' }
    ];

    const StatCard = ({ icon: Icon, label, value, color }: StatCardProps) => (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${color}`}>
                    <Icon className="text-xl" />
                </div>
                <div>
                    <p className="text-sm text-gray-600">{label}</p>
                    <p className="text-xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaChartLine className="text-indigo-600" />
                    Bidding Analytics
                </h3>
                <p className="text-gray-600 mt-1">Track your bidding performance and statistics</p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={FaGavel}
                    label="Total Bids"
                    value={stats.totalBids}
                    color="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                    icon={FaTrophy}
                    label="Auctions Won"
                    value={stats.auctionsWon}
                    color="bg-green-50 text-green-600"
                />
                <StatCard
                    icon={FaDollarSign}
                    label="Avg Bid Amount"
                    value={`৳${stats.averageBid.toFixed(2)}`}
                    color="bg-blue-50 text-blue-600"
                />
                <StatCard
                    icon={FaPercent}
                    label="Win Rate"
                    value={`${winRate}%`}
                    color="bg-yellow-50 text-yellow-600"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Bid Outcomes</h4>
                    <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={80}
                                    dataKey="value"
                                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Stats Summary */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h4 className="font-semibold text-gray-900 mb-4">Performance Summary</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Total Bids Placed</span>
                            <span className="font-bold text-gray-900">{stats.totalBids}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Auctions Won</span>
                            <span className="font-bold text-green-600">{stats.auctionsWon}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Auctions Lost</span>
                            <span className="font-bold text-red-600">{stats.auctionsLost}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-600">Active Bids</span>
                            <span className="font-bold text-yellow-600">{stats.activeAuctions}</span>
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total Spent</span>
                                <span className="text-2xl font-bold text-gray-900">৳{stats.totalSpent.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Improve Your Win Rate</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Use Auto-Bid to stay competitive without constant monitoring</li>
                    <li>• Research market prices before bidding</li>
                    <li>• Set maximum budgets to avoid overspending</li>
                    <li>• Bid strategically in the last minutes of an auction</li>
                </ul>
            </div>
        </div>
    );
}
