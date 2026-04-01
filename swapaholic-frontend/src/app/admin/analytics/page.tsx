'use client';

import { useState, useEffect, useCallback } from 'react';
import { FaChartLine, FaUsers, FaBox, FaMoneyBillWave } from 'react-icons/fa';
import { adminApi } from '../../../api/admin';
import { PlatformAnalytics, TopCategory } from '../../../types/api';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';

export default function PlatformAnalyticsPage() {
    const [analytics, setAnalytics] = useState<PlatformAnalytics | null>(null);
    // Protect route with admin auth
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(true);

    // Combined loading state
    const isLoading = isAuthLoading || isDataLoading;

    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    const fetchAnalytics = useCallback(async () => {
        if (!isAdmin) return;

        try {
            setIsDataLoading(true);
            const data = await adminApi.getPlatformAnalytics(period);
            setAnalytics(data);
        } catch (err) {
            console.error('Error fetching analytics:', err);
            // Mock data
            setAnalytics({
                growth: {
                    users: 15.3,
                    products: 12.8,
                    orders: 22.5,
                    revenue: 18.7,
                },
                userMetrics: {
                    totalUsers: 1543,
                    activeUsers: 1234,
                    newUsers: 156,
                    retentionRate: 78.5,
                },
                productMetrics: {
                    totalProducts: 3421,
                    activeListings: 2156,
                    averagePrice: 234,
                    categoriesCount: 8,
                },
                revenueMetrics: {
                    totalRevenue: 156789,
                    commissionEarned: 7839,
                    averageOrderValue: 156,
                    transactionCount: 2134,
                },
                topCategories: [
                    { name: 'Electronics', count: 856, revenue: 45632 },
                    { name: 'Fashion', count: 723, revenue: 38921 },
                    { name: 'Home & Garden', count: 612, revenue: 32145 },
                    { name: 'Sports', count: 445, revenue: 23456 },
                ],
            });
        } finally {
            setIsDataLoading(false);
        }
    }, [period, isAdmin]);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading analytics...</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">No analytics data available</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                            Platform Analytics 📈
                        </h1>
                        <p className="text-lg text-gray-600">
                            Platform-wide statistics and insights
                        </p>
                    </div>

                    {/* Period Selector */}
                    <select
                        value={period}
                        onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d' | '1y')}
                        className="px-4 py-2 border border-gray-300 text-black rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                        <option value="1y">Last Year</option>
                    </select>
                </div>

                {/* Growth Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <FaUsers className="text-3xl" />
                            <div>
                                <p className="text-sm opacity-90">User Growth</p>
                                <p className="text-3xl font-bold">+{analytics.growth.users}%</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">{analytics.userMetrics.newUsers} new users</p>
                    </div>

                    <div className="bg-linear-to-br from-green-500 to-green-600 text-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <FaBox className="text-3xl" />
                            <div>
                                <p className="text-sm opacity-90">Product Growth</p>
                                <p className="text-3xl font-bold">+{analytics.growth.products}%</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">{analytics.productMetrics.activeListings} active</p>
                    </div>

                    <div className="bg-linear-to-br from-purple-500 to-purple-600 text-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <FaChartLine className="text-3xl" />
                            <div>
                                <p className="text-sm opacity-90">Order Growth</p>
                                <p className="text-3xl font-bold">+{analytics.growth.orders}%</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">{analytics.revenueMetrics.transactionCount} transactions</p>
                    </div>

                    <div className="bg-linear-to-br from-orange-500 to-orange-600 text-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center gap-3 mb-3">
                            <FaMoneyBillWave className="text-3xl" />
                            <div>
                                <p className="text-sm opacity-90">Revenue Growth</p>
                                <p className="text-3xl font-bold">+{analytics.growth.revenue}%</p>
                            </div>
                        </div>
                        <p className="text-sm opacity-80">৳{(analytics.revenueMetrics.totalRevenue / 1000).toFixed(1)}k total</p>
                    </div>
                </div>

                {/* Detailed Metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* User Metrics */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">User Metrics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">Total Users</span>
                                <span className="font-bold text-xl text-black">{analytics.userMetrics.totalUsers}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">Active Users</span>
                                <span className="font-bold text-xl text-red-600">{analytics.userMetrics.activeUsers}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">New Users</span>
                                <span className="font-bold text-xl text-green-600">+{analytics.userMetrics.newUsers}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Retention Rate</span>
                                <span className="font-bold text-xl text-blue-600">{analytics.userMetrics.retentionRate}%</span>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Metrics */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Revenue Metrics</h3>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">Total Revenue</span>
                                <span className="font-bold text-xl text-black">৳{analytics.revenueMetrics.totalRevenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">Commission Earned</span>
                                <span className="font-bold text-xl text-red-600">৳{analytics.revenueMetrics.commissionEarned.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b">
                                <span className="text-gray-700">Avg Order Value</span>
                                <span className="font-bold text-xl text-green-600">৳{analytics.revenueMetrics.averageOrderValue}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-700">Transaction Count</span>
                                <span className="font-bold text-xl text-blue-600">{analytics.revenueMetrics.transactionCount}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Categories */}
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-4">Top Categories</h3>
                    <div className="space-y-3">
                        {analytics.topCategories.map((category: TopCategory, index: number) => (
                            <div key={category.name} className="flex items-center gap-4">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${index === 0 ? 'bg-yellow-500' :
                                    index === 1 ? 'bg-gray-400' :
                                        index === 2 ? 'bg-orange-600' :
                                            'bg-gray-300'
                                    }`}>
                                    {index + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-900">{category.name}</p>
                                    <p className="text-sm text-gray-600">{category.count} products</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600">৳{category.revenue.toLocaleString()}</p>
                                    <p className="text-xs text-gray-500">revenue</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
