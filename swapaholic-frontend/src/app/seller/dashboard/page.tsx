'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../../store/hooks';
import RevenueOverview from '../../../components/seller/RevenueOverview';
import ActiveListings from '../../../components/seller/ActiveListings';
import SalesChart from '../../../components/seller/SalesChart';
import RecentOrders from '../../../components/seller/RecentOrders';
import PerformanceMetrics from '../../../components/seller/PerformanceMetrics';
import QuickActions from '../../../components/seller/QuickActions';
import EarningsSummary from '../../../components/seller/EarningsSummary';
import RecentBids from '../../../components/seller/RecentBids';
import { sellerApi } from '../../../api/seller';
import { productsApi } from '../../../api/products';
import { socketService } from '../../../utils/socket';
import { emailApi } from '../../../api/email';

export default function SellerDashboardPage() {
    const { user } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [dashboardData, setDashboardData] = useState<{
        revenue: {
            totalRevenue: number;
            pendingPayments: number;
            activeListings: number;
            totalSales: number;
            revenueTrend: number;
            salesTrend: number;
        };
        listings: any[];
        salesData: any[];
        recentOrders: any[];
        recentBids: any[];
        performance: {
            averageRating: number;
            totalViews: number;
            totalBids: number;
            conversionRate: number;
            viewsTrend?: number;
            bidsTrend?: number;
            conversionTrend?: number;
        };
        earnings: {
            todayEarnings: number;
            weekEarnings: number;
            monthEarnings: number;
            yearEarnings: number;
            todayTrend?: number;
            weekTrend?: number;
            monthTrend?: number;
        };
    }>({
        revenue: {
            totalRevenue: 0,
            pendingPayments: 0,
            activeListings: 0,
            totalSales: 0,
            revenueTrend: 0,
            salesTrend: 0,
        },
        listings: [],
        salesData: [],
        recentOrders: [],
        recentBids: [],
        performance: {
            averageRating: 0,
            totalViews: 0,
            totalBids: 0,
            conversionRate: 0,
        },
        earnings: {
            todayEarnings: 0,
            weekEarnings: 0,
            monthEarnings: 0,
            yearEarnings: 0,
        },
    });

    // Fetch dashboard data from API
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch all data in parallel
                const [dashboardStats, listings, analytics, recentOrders, recentBids, performance, earnings] = await Promise.all([
                    sellerApi.getDashboardData(),
                    sellerApi.getListings(),
                    sellerApi.getSalesAnalytics('30d'),
                    sellerApi.getRecentOrders(5),
                    sellerApi.getRecentBids(5),
                    sellerApi.getPerformanceMetrics(),
                    sellerApi.getEarningsSummary(),
                ]);

                setDashboardData({
                    revenue: dashboardStats.revenue,
                    listings: listings.listings,
                    salesData: analytics.salesData,
                    recentOrders: recentOrders.orders || [],
                    recentBids: recentBids.bids || [],
                    performance: performance,
                    earnings: earnings,
                });
            } catch (err: any) {
                const errorMessage = err.response?.data?.message || 'Failed to load dashboard data';
                setError(errorMessage);
                toast.error(errorMessage);
                console.error('Dashboard data fetch error:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Setup Socket.IO for real-time updates
    useEffect(() => {
        // Get actual user ID from auth state
        const userId = user?.id;

        // Only connect if user is authenticated
        if (!userId) {
            console.warn('No user ID available for Socket.IO connection');
            return;
        }

        // Connect to Socket.IO with real user ID
        socketService.connect();

        // Listen for new bids
        socketService.on('bid_received', (data: any) => {
            console.log('New bid received:', data);
            toast.info(`New bid of ৳${data.data.bidAmount} on "${data.data.productTitle}"`);

            // Refresh dashboard stats and update recent bids
            sellerApi.getDashboardData().then(stats => {
                setDashboardData(prev => ({
                    ...prev,
                    revenue: stats.revenue,
                    // Prepend new bid to recentBids
                    recentBids: [
                        {
                            id: data.data.bidId || Date.now().toString(), // Fallback ID if not provided
                            product: {
                                id: data.data.productId,
                                title: data.data.productTitle,
                                image: data.data.productImage || '/products/placeholder.png'
                            },
                            bidder: {
                                name: data.data.bidderName,
                                image: data.data.bidderImage || '/default-avatar.png',
                                id: data.data.bidderId
                            },
                            amount: data.data.bidAmount,
                            time: new Date().toISOString(),
                            status: 'active'
                        },
                        ...prev.recentBids
                    ].slice(0, 5) // Keep only top 5
                }));
            });
        });

        // Listen for product views
        socketService.on('product:view', (data: any) => {
            console.log('Product viewed:', data);

            // Update the specific listing's view count
            setDashboardData(prev => ({
                ...prev,
                listings: prev.listings.map((listing: any) =>
                    listing.id === data.data.productId
                        ? { ...listing, views: data.data.viewCount }
                        : listing
                ),
            }));
        });

        // Listen for product sold
        socketService.on('product:sold', (data: any) => {
            console.log('Product sold:', data);
            toast.success(`Product sold: "${data.productTitle}"`);

            // Send auction won email to buyer
            if (data.buyerId && data.productId) {
                emailApi.auctionWon(data.productId, data.buyerId).catch(err => {
                    console.error('Failed to send auction won email:', err);
                });
            }

            // Refresh listings
            sellerApi.getListings().then(result => {
                setDashboardData(prev => ({
                    ...prev,
                    listings: result.listings,
                }));
            });
        });

        // Listen for payment received
        socketService.on('payment_released', (data: any) => {
            console.log('Payment released:', data);
            toast.success(`Payment of $৳{data.data.amount} released!`);

            // Refresh revenue stats
            sellerApi.getDashboardData().then(stats => {
                setDashboardData(prev => ({
                    ...prev,
                    revenue: stats.revenue,
                }));
            });
        });

        // Cleanup on unmount
        return () => {
            socketService.off('bid_received');
            socketService.off('product:view');
            socketService.off('product:sold');
            socketService.off('payment_released');
            socketService.disconnect();
        };
    }, [user]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse space-y-6">
                        <div className="h-12 bg-gray-200 rounded w-1/3" />
                        <div className="grid grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-32 bg-gray-200 rounded" />
                            ))}
                        </div>
                        <div className="h-64 bg-gray-200 rounded" />
                        <div className="h-96 bg-gray-200 rounded" />
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const handleDeleteListing = async (id: string) => {
        try {
            await productsApi.deleteProduct(id);
            toast.success('Listing deleted successfully');

            // Refresh listings
            const response = await sellerApi.getListings();
            setDashboardData(prev => ({
                ...prev,
                listings: response.listings
            }));
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete listing');
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900">
                        Seller Dashboard 📊
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Manage your listings and track your sales performance</p>
                    {socketService.isConnected() && (
                        <span className="inline-flex items-center gap-2 mt-2 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                            Live updates active
                        </span>
                    )}
                </div>

                {/* Revenue Overview */}
                <RevenueOverview
                    totalRevenue={dashboardData.revenue.totalRevenue}
                    pendingPayments={dashboardData.revenue.pendingPayments}
                    activeListings={dashboardData.revenue.activeListings}
                    totalSales={dashboardData.revenue.totalSales}
                    revenueTrend={dashboardData.revenue.revenueTrend}
                    salesTrend={dashboardData.revenue.salesTrend}
                />

                {/* Quick Actions */}
                <div className="mb-8">
                    <QuickActions />
                </div>

                {/* Earnings Summary */}
                <div className="mb-8">
                    <EarningsSummary
                        todayEarnings={dashboardData.earnings.todayEarnings}
                        weekEarnings={dashboardData.earnings.weekEarnings}
                        monthEarnings={dashboardData.earnings.monthEarnings}
                        yearEarnings={dashboardData.earnings.yearEarnings}
                        todayTrend={dashboardData.earnings.todayTrend}
                        weekTrend={dashboardData.earnings.weekTrend}
                        monthTrend={dashboardData.earnings.monthTrend}
                    />
                </div>

                {/* Performance Metrics */}
                <div className="mb-8">
                    <PerformanceMetrics
                        averageRating={dashboardData.performance.averageRating}
                        totalViews={dashboardData.performance.totalViews}
                        totalBids={dashboardData.performance.totalBids}
                        conversionRate={dashboardData.performance.conversionRate}
                        viewsTrend={dashboardData.performance.viewsTrend}
                        bidsTrend={dashboardData.performance.bidsTrend}
                        conversionTrend={dashboardData.performance.conversionTrend}
                    />
                </div>

                {/* Two Column Layout for Chart, Bids and Orders */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* Sales Chart */}
                    <div className="col-span-1 lg:col-span-2">
                        <SalesChart data={dashboardData.salesData} />
                    </div>

                    {/* Recent Bids */}
                    <RecentBids bids={dashboardData.recentBids || []} />

                    {/* Recent Orders */}
                    <RecentOrders orders={dashboardData.recentOrders} />
                </div>

                {/* Active Listings */}
                <ActiveListings listings={dashboardData.listings} onDelete={handleDeleteListing} />

                {/* Floating Action Button - Create New Listing */}
                <Link
                    href="/seller/create-listing"
                    className="fixed bottom-8 right-8 bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all transform hover:scale-110 flex items-center gap-2 group"
                >
                    <FaPlus className="text-2xl" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-semibold">
                        Create New Listing
                    </span>
                </Link>
            </div>
        </div>
    );
}
