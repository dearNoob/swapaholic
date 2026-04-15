'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import RevenueOverview from '../../../components/seller/RevenueOverview';
import ActiveListings from '../../../components/seller/ActiveListings';
import SalesChart from '../../../components/seller/SalesChart';
import RecentOrders from '../../../components/seller/RecentOrders';
import PerformanceMetrics from '../../../components/seller/PerformanceMetrics';
import QuickActions from '../../../components/seller/QuickActions';
import EarningsSummary from '../../../components/seller/EarningsSummary';
import RecentBids from '../../../components/seller/RecentBids';
import { sellerApi } from '../../../api/seller';
import { useAppSelector } from '../../../store/hooks';
import { socketService } from '../../../utils/socket';
import { handleApiError } from '../../../utils/errorHandler';

type AnalyticsPeriod = '7d' | '30d' | '90d';

interface SellerDashboardRevenue {
    totalRevenue: number;
    pendingPayments: number;
    activeListings: number;
    totalSales: number;
    revenueTrend: number;
    salesTrend: number;
}

interface SellerListing {
    id: string;
    title: string;
    image: string;
    images?: string[];
    price: number;
    category?: string;
    condition?: string;
    views: number;
    bids: number;
    status: 'active' | 'pending' | 'sold' | 'ended';
    createdAt: string;
}

interface SellerSalesPoint {
    date: string;
    revenue: number;
}

type SellerDashboardOrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered';

interface SellerRecentOrder {
    id: string;
    productTitle: string;
    buyerName: string;
    amount: number;
    status: SellerDashboardOrderStatus;
    createdAt: string;
}

interface SellerRecentBid {
    id: string;
    product: {
        id: string;
        title: string;
        image: string;
    };
    bidder: {
        name: string;
        image: string;
        id: string;
    };
    amount: number;
    time: string;
    status: string;
}

interface SellerPerformanceMetrics {
    averageRating: number;
    totalViews: number;
    totalBids: number;
    conversionRate: number;
    viewsTrend?: number;
    bidsTrend?: number;
    conversionTrend?: number;
}

interface SellerEarningsSummary {
    todayEarnings: number;
    weekEarnings: number;
    monthEarnings: number;
    yearEarnings: number;
    todayTrend?: number;
    weekTrend?: number;
    monthTrend?: number;
}

interface SellerDashboardState {
    revenue: SellerDashboardRevenue;
    listings: SellerListing[];
    salesData: SellerSalesPoint[];
    recentOrders: SellerRecentOrder[];
    recentBids: SellerRecentBid[];
    performance: SellerPerformanceMetrics;
    earnings: SellerEarningsSummary;
}

interface SocketEvent<TPayload> {
    data: TPayload;
    timestamp?: string;
}

interface NotificationSocketPayload<TPayload> {
    id?: string;
    title?: string;
    message?: string;
    type?: string;
    data?: TPayload;
    priority?: string;
    actionUrl?: string;
}

interface BidReceivedPayload {
    bidId?: string;
    productId: string;
    productTitle: string;
    productImage?: string;
    bidderName: string;
    bidderImage?: string;
    bidderId?: string;
    bidAmount: number;
}

interface ProductViewPayload {
    productId: string;
    viewCount: number;
}

interface OrderCreatedPayload {
    productTitle: string;
}

interface PaymentReleasedPayload {
    amount: number;
    platformFee?: number;
}

const unwrapRealtimePayload = <TPayload,>(
    event: SocketEvent<TPayload | NotificationSocketPayload<TPayload>>
): TPayload => {
    const payload = event.data as TPayload | NotificationSocketPayload<TPayload>;

    if (
        payload &&
        typeof payload === 'object' &&
        'data' in payload &&
        'type' in payload &&
        payload.data &&
        typeof payload.data === 'object'
    ) {
        return payload.data as TPayload;
    }

    return payload as TPayload;
};

const INITIAL_DASHBOARD_STATE: SellerDashboardState = {
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
};

export default function SellerDashboardPage() {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLiveUpdates, setIsLiveUpdates] = useState(false);
    const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('30d');
    const [dashboardData, setDashboardData] = useState<SellerDashboardState>(INITIAL_DASHBOARD_STATE);

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) {
            return;
        }

        const fetchDashboardData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const [dashboardStats, listings, analytics, recentOrders, recentBids, performance, earnings] = await Promise.all([
                    sellerApi.getDashboardData(),
                    sellerApi.getListings(),
                    sellerApi.getSalesAnalytics(analyticsPeriod),
                    sellerApi.getRecentOrders(5),
                    sellerApi.getRecentBids(5),
                    sellerApi.getPerformanceMetrics(),
                    sellerApi.getEarningsSummary(),
                ]);

                setDashboardData({
                    revenue: dashboardStats.revenue,
                    listings: listings.listings || [],
                    salesData: analytics.salesData || [],
                    recentOrders: recentOrders.orders || [],
                    recentBids: recentBids.bids || [],
                    performance,
                    earnings,
                });
            } catch (fetchError) {
                const errorMessage = handleApiError(fetchError) || 'Failed to load dashboard data';
                setError(errorMessage);
                toast.error(errorMessage);
                console.error('Dashboard data fetch error:', fetchError);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDashboardData();
    }, [analyticsPeriod, isAuthenticated, isAuthLoading]);

    useEffect(() => {
        const userId = user?.id;

        if (isAuthLoading || !isAuthenticated || !userId) {
            setIsLiveUpdates(false);
            return;
        }

        const socket = socketService.connect();
        setIsLiveUpdates(Boolean(socket));

        const refreshRevenue = async () => {
            try {
                const stats = await sellerApi.getDashboardData();
                setDashboardData((prev) => ({
                    ...prev,
                    revenue: stats.revenue,
                }));
            } catch (refreshError) {
                console.error('Failed to refresh revenue stats:', refreshError);
            }
        };

        const refreshListings = async () => {
            try {
                const listings = await sellerApi.getListings();
                setDashboardData((prev) => ({
                    ...prev,
                    listings: listings.listings || [],
                }));
            } catch (refreshError) {
                console.error('Failed to refresh listings:', refreshError);
            }
        };

        const refreshRecentOrders = async () => {
            try {
                const recentOrders = await sellerApi.getRecentOrders(5);
                setDashboardData((prev) => ({
                    ...prev,
                    recentOrders: recentOrders.orders || [],
                }));
            } catch (refreshError) {
                console.error('Failed to refresh recent orders:', refreshError);
            }
        };

        const handleBidReceived = (
            event: SocketEvent<BidReceivedPayload | NotificationSocketPayload<BidReceivedPayload>>
        ) => {
            const payload = unwrapRealtimePayload(event);
            toast.info(`New bid of BDT ${payload.bidAmount} on "${payload.productTitle}"`);

            setDashboardData((prev) => ({
                ...prev,
                recentBids: [
                    {
                        id: payload.bidId || `${payload.productId}-${Date.now()}`,
                        product: {
                            id: payload.productId,
                            title: payload.productTitle,
                            image: payload.productImage || '/products/placeholder.png',
                        },
                        bidder: {
                            name: payload.bidderName,
                            image: payload.bidderImage || '/default-avatar.png',
                            id: payload.bidderId || '',
                        },
                        amount: payload.bidAmount,
                        time: new Date().toISOString(),
                        status: 'active',
                    },
                    ...prev.recentBids.filter((bid) => bid.id !== payload.bidId),
                ].slice(0, 5),
                listings: prev.listings.map((listing) =>
                    listing.id === payload.productId
                        ? { ...listing, bids: listing.bids + 1 }
                        : listing
                ),
            }));
        };

        const handleProductView = (event: SocketEvent<ProductViewPayload>) => {
            const payload = unwrapRealtimePayload(event);

            setDashboardData((prev) => ({
                ...prev,
                listings: prev.listings.map((listing) =>
                    listing.id === payload.productId
                        ? { ...listing, views: payload.viewCount }
                        : listing
                ),
            }));
        };

        const handleOrderCreated = (
            event: SocketEvent<OrderCreatedPayload | NotificationSocketPayload<OrderCreatedPayload>>
        ) => {
            const payload = unwrapRealtimePayload(event);
            toast.success(`New order created for "${payload.productTitle}"`);

            void refreshListings();
            void refreshRecentOrders();
            void refreshRevenue();
        };

        const handlePaymentReleased = (
            event: SocketEvent<PaymentReleasedPayload | NotificationSocketPayload<PaymentReleasedPayload>>
        ) => {
            const payload = unwrapRealtimePayload(event);
            toast.success(`Payment of BDT ${payload.amount} released.`);
            void refreshRevenue();
        };

        socketService.on('bid_received', handleBidReceived);
        socketService.on('product:view', handleProductView);
        socketService.on('order_created', handleOrderCreated);
        socketService.on('payment_released', handlePaymentReleased);
        socketService.on('seller_payout', handlePaymentReleased);

        return () => {
            setIsLiveUpdates(false);
            socketService.off('bid_received', handleBidReceived);
            socketService.off('product:view', handleProductView);
            socketService.off('order_created', handleOrderCreated);
            socketService.off('payment_released', handlePaymentReleased);
            socketService.off('seller_payout', handlePaymentReleased);
            socketService.disconnect();
        };
    }, [isAuthenticated, isAuthLoading, user]);

    const handleDeleteListing = async (id: string) => {
        try {
            await sellerApi.deleteListing(id);
            toast.success('Listing deleted successfully');

            const response = await sellerApi.getListings();
            setDashboardData((prev) => ({
                ...prev,
                listings: response.listings || [],
            }));
        } catch (deleteError) {
            console.error('Delete error:', deleteError);
            toast.error(handleApiError(deleteError) || 'Failed to delete listing');
        }
    };

    if (isAuthLoading || isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="animate-pulse space-y-6">
                        <div className="h-12 bg-gray-200 rounded w-1/3" />
                        <div className="grid grid-cols-4 gap-6">
                            {[...Array(4)].map((_, index) => (
                                <div key={index} className="h-32 bg-gray-200 rounded" />
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

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900">
                        Seller Dashboard
                    </h1>
                    <p className="text-lg text-gray-600 mt-2">Manage your listings and track your sales performance</p>
                    {isLiveUpdates && (
                        <span className="inline-flex items-center gap-2 mt-2 text-sm text-green-600">
                            <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                            Live updates active
                        </span>
                    )}
                </div>

                <RevenueOverview
                    totalRevenue={dashboardData.revenue.totalRevenue}
                    pendingPayments={dashboardData.revenue.pendingPayments}
                    activeListings={dashboardData.revenue.activeListings}
                    totalSales={dashboardData.revenue.totalSales}
                    revenueTrend={dashboardData.revenue.revenueTrend}
                    salesTrend={dashboardData.revenue.salesTrend}
                />

                <div className="mb-8">
                    <QuickActions />
                </div>

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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="col-span-1 lg:col-span-2">
                        <SalesChart
                            data={dashboardData.salesData}
                            currentPeriod={analyticsPeriod}
                            onPeriodChange={setAnalyticsPeriod}
                        />
                    </div>

                    <RecentBids bids={dashboardData.recentBids} />
                    <RecentOrders orders={dashboardData.recentOrders} />
                </div>

                <ActiveListings listings={dashboardData.listings} onDelete={handleDeleteListing} />

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
