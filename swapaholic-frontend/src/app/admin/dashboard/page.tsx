'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FaUsers, FaBox, FaShoppingCart, FaExclamationTriangle,
    FaChartLine, FaFileAlt, FaSyncAlt, FaShieldAlt,
    FaCog, FaCalendarAlt, FaTruck
} from 'react-icons/fa';
import { adminApi } from '../../../api/admin';
import { toast } from 'react-toastify';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import AdminStatsCards from '../../../components/admin/AdminStatsCards';
import RevenueChart from '../../../components/admin/RevenueChart';
import SystemAlerts from '../../../components/admin/SystemAlerts';
import TopPerformers from '../../../components/admin/TopPerformers';
import RecentActivity from '../../../components/admin/RecentActivity';
import '../../../styles/admin-dashboard.css';

interface AdminDashboardStats {
    users: { total: number; sellers: number; buyers: number; admins: number };
    products: { total: number; active: number; sold: number; expired: number };
    orders: { total: number; pending: number; completed: number; disputed: number; completionRate: number | string };
    disputes: { total: number; open: number; underReview: number; resolved: number };
    payments: { total: number; escrowed: number; released: number; failed: number; totalRevenue: number; escrowedAmount?: number };
    revenue: { total: number; thisMonth: number; commission: number };
    bids: { total: number; active: number; accepted: number };
    qc: { total: number; approved: number; rejected: number; pending: number; approvalRate: number | string };
    support: { open: number; resolved: number; closed: number };
    delivery: { total: number; delivered: number; failed: number; deliveryRate: number | string };
}

interface AdminAnalyticsData {
    labels: string[];
    revenue: number[];
    users: number[];
    orders: number[];
    period: string;
}

interface AdminHealthAlert {
    category: string;
    severity: 'info' | 'warning' | 'critical';
    pending?: number;
    open?: number;
    failed?: number;
    escrowedOld?: number;
}

interface AdminSystemHealth {
    health: 'good' | 'warning' | 'critical';
    alerts: AdminHealthAlert[];
}

interface AdminPerformer {
    sellerId?: string;
    buyerId?: string;
    name: string;
    completedOrders: number;
    totalRevenue?: number;
    totalSpent?: number;
    averageRating?: number;
    reviewCount?: number;
}

interface AdminTopPerformersData {
    topSellers: AdminPerformer[];
    topBuyers: AdminPerformer[];
    topRatedSellers: AdminPerformer[];
}

const EMPTY_STATS: AdminDashboardStats = {
    users: { total: 0, sellers: 0, buyers: 0, admins: 0 },
    products: { total: 0, active: 0, sold: 0, expired: 0 },
    orders: { total: 0, pending: 0, completed: 0, disputed: 0, completionRate: 0 },
    disputes: { total: 0, open: 0, underReview: 0, resolved: 0 },
    payments: { total: 0, escrowed: 0, released: 0, failed: 0, totalRevenue: 0, escrowedAmount: 0 },
    revenue: { total: 0, thisMonth: 0, commission: 0 },
    bids: { total: 0, active: 0, accepted: 0 },
    qc: { total: 0, approved: 0, rejected: 0, pending: 0, approvalRate: 0 },
    support: { open: 0, resolved: 0, closed: 0 },
    delivery: { total: 0, delivered: 0, failed: 0, deliveryRate: 0 },
};

export default function AdminDashboardPage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

    const [stats, setStats] = useState<AdminDashboardStats | null>(null);
    const [analytics, setAnalytics] = useState<AdminAnalyticsData | null>(null);
    const [systemHealth, setSystemHealth] = useState<AdminSystemHealth | null>(null);
    const [topPerformers, setTopPerformersData] = useState<AdminTopPerformersData | null>(null);
    const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');

    const isLoading = isAuthLoading || isDataLoading;

    const fetchAllData = useCallback(async (showRefreshToast = false) => {
        try {
            if (showRefreshToast) setIsRefreshing(true);
            else setIsDataLoading(true);

            // Fetch all data in parallel from backend
            const [statsData, analyticsData, healthData, performersData] = await Promise.allSettled([
                adminApi.getDashboardStats(),
                adminApi.getPlatformAnalytics(period),
                adminApi.getSystemHealth(),
                adminApi.getTopPerformers(),
            ]);

            // Stats
            if (statsData.status === 'fulfilled') {
                setStats(statsData.value);
            } else {
                console.error('Failed to fetch dashboard stats:', statsData.reason);
                setStats(EMPTY_STATS);
            }

            // Analytics
            if (analyticsData.status === 'fulfilled') {
                setAnalytics(analyticsData.value);
            } else {
                console.error('Failed to fetch analytics:', analyticsData.reason);
                setAnalytics(null);
            }

            // System Health
            if (healthData.status === 'fulfilled') {
                setSystemHealth(healthData.value);
            } else {
                console.error('Failed to fetch system health:', healthData.reason);
                setSystemHealth(null);
            }

            // Top Performers
            if (performersData.status === 'fulfilled') {
                setTopPerformersData(performersData.value);
            } else {
                console.error('Failed to fetch top performers:', performersData.reason);
                setTopPerformersData(null);
            }

            setLastRefreshed(new Date());
            if (showRefreshToast) toast.success('Dashboard refreshed');
        } catch (error) {
            console.error('Dashboard fetch error:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsDataLoading(false);
            setIsRefreshing(false);
        }
    }, [period]);

    useEffect(() => {
        if (isAdmin) {
            fetchAllData();
        }
    }, [isAdmin, fetchAllData]);

    // Refresh analytics when period changes
    const handlePeriodChange = useCallback((newPeriod: '7d' | '30d' | '90d' | '1y') => {
        setPeriod(newPeriod);
    }, []);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 p-6 lg:p-8 space-y-6">
                {/* Header Skeleton */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <div className="h-10 w-64 bg-gray-200 rounded-lg animate-pulse mb-2"></div>
                        <div className="h-5 w-48 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                        <div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
                    </div>
                </div>

                {/* Stats Cards Skeleton */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-xl bg-gray-200"></div>
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                                    <div className="h-6 bg-gray-200 rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Main Content Area Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse min-h-[400px]">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="h-full bg-gray-50 rounded-xl"></div>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse min-h-[400px]">
                        <div className="h-6 w-48 bg-gray-200 rounded mb-6"></div>
                        <div className="space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex gap-4 items-center">
                                    <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                                    <div className="flex-1 space-y-2">
                                        <div className="h-4 bg-gray-200 rounded w-full"></div>
                                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <FaExclamationTriangle className="text-5xl text-amber-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Dashboard</h2>
                    <p className="text-gray-500 mb-6">Could not connect to the backend server.</p>
                    <button
                        onClick={() => fetchAllData()}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-xl"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const quickLinks = [
        {
            title: 'User Management',
            description: 'Manage users, verify accounts',
            icon: FaUsers,
            gradient: 'from-blue-500 to-blue-600',
            href: '/admin/users',
        },
        {
            title: 'Product Moderation',
            description: 'Review product listings',
            icon: FaBox,
            gradient: 'from-emerald-500 to-emerald-600',
            href: '/admin/products',
        },
        {
            title: 'Order Oversight',
            description: 'Monitor all orders',
            icon: FaShoppingCart,
            gradient: 'from-violet-500 to-violet-600',
            href: '/admin/orders',
        },
        {
            title: 'Dispute Center',
            description: 'Handle disputes & conflicts',
            icon: FaExclamationTriangle,
            gradient: 'from-red-500 to-red-600',
            href: '/admin/disputes',
        },
        {
            title: 'Analytics',
            description: 'Platform statistics',
            icon: FaChartLine,
            gradient: 'from-amber-500 to-orange-500',
            href: '/admin/analytics',
        },
        {
            title: 'Content Management',
            description: 'Manage site content',
            icon: FaFileAlt,
            gradient: 'from-indigo-500 to-indigo-600',
            href: '/admin/content',
        },
        {
            title: 'Logistics Officers',
            description: 'Manage logistics accounts',
            icon: FaTruck,
            gradient: 'from-teal-500 to-cyan-600',
            href: '/admin/logistics-officers',
        },
    ];

    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                            <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                <FaShieldAlt className="text-xl" />
                            </div>
                            Admin Command Center
                        </h1>
                        <div className="flex items-center gap-3 mt-2">
                            <p className="text-gray-500 flex items-center gap-2">
                                <FaCalendarAlt className="text-xs" />
                                {currentDate}
                            </p>
                            <span className="text-gray-300">|</span>
                            <p className="text-gray-400 text-sm">
                                Last refreshed: {lastRefreshed.toLocaleTimeString()}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => fetchAllData(true)}
                            disabled={isRefreshing}
                            className={`flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm ${isRefreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <FaSyncAlt className={`text-xs ${isRefreshing ? 'animate-spin' : ''}`} />
                            {isRefreshing ? 'Refreshing...' : 'Refresh'}
                        </button>
                        <Link
                            href="/admin/analytics"
                            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-sm"
                        >
                            <FaChartLine className="text-xs" />
                            Full Analytics
                        </Link>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="mb-8">
                    <AdminStatsCards stats={stats} />
                </div>

                {/* Charts Section */}
                <div className="mb-8">
                    <RevenueChart
                        analytics={analytics}
                        onPeriodChange={handlePeriodChange}
                        currentPeriod={period}
                    />
                </div>

                {/* Two-Column: System Alerts + Top Performers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <SystemAlerts health={systemHealth} />
                    <TopPerformers performers={topPerformers} />
                </div>

                {/* Platform Activity */}
                <div className="mb-8">
                    <RecentActivity stats={stats} />
                </div>

                {/* Quick Navigation */}
                <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <FaCog className="text-gray-400" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                        {quickLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="quick-action-card bg-white rounded-2xl border border-gray-100 p-5 shadow-sm group"
                            >
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${link.gradient} flex items-center justify-center mb-3 shadow-lg group-hover:scale-110 transition-transform`}>
                                    <link.icon className="text-white text-lg" />
                                </div>
                                <h4 className="font-bold text-gray-900 text-sm mb-1 group-hover:text-indigo-600 transition-colors">
                                    {link.title}
                                </h4>
                                <p className="text-xs text-gray-500">{link.description}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
