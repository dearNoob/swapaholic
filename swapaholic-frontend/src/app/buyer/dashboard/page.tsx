'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '../../../store/hooks';
import DashboardStats from '../../../components/dashboard/DashboardStats';
import ActiveBidsCard from '../../../components/dashboard/ActiveBidsCard';
import WonAuctionsCard from '../../../components/dashboard/WonAuctionsCard';
import OrderHistoryCard from '../../../components/dashboard/OrderHistoryCard';
import SavedProductsCard from '../../../components/dashboard/SavedProductsCard';
import { ordersApi } from '../../../api/orders';
import { wishlistApi } from '../../../api/wishlist';
import { BuyerDashboardBid, BuyerDashboardSavedProduct, BuyerDashboardWonAuction, usersApi } from '../../../api/users';
import { Order } from '../../../types/api';
import { toast } from 'react-toastify';

import { FaGavel, FaTrophy, FaShoppingBag, FaHeart, FaThLarge } from 'react-icons/fa';

type DashboardTab = 'all' | 'bids' | 'won' | 'orders' | 'saved';
type OrderCardStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

interface DashboardOrderCard {
    id: string;
    orderNumber: string;
    productId: string;
    productTitle: string;
    productImage: string;
    amount: number;
    orderDate: string;
    status: OrderCardStatus;
}

const DEFAULT_PRODUCT_IMAGE = '/placeholder.png';

const getOrderStatusForCard = (status: Order['status']): OrderCardStatus => {
    switch (status) {
        case 'confirmed':
        case 'qc_pending':
        case 'qc_approved':
        case 'disputed':
            return 'processing';
        case 'in_delivery':
            return 'shipped';
        case 'delivered':
        case 'completed':
            return 'delivered';
        case 'cancelled':
            return 'cancelled';
        default:
            return 'pending';
    }
};

export default function BuyerDashboardPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('all');

    const [activeBids, setActiveBids] = useState<BuyerDashboardBid[]>([]);
    const [wonAuctions, setWonAuctions] = useState<BuyerDashboardWonAuction[]>([]);
    const [orders, setOrders] = useState<DashboardOrderCard[]>([]);
    const [savedProducts, setSavedProducts] = useState<BuyerDashboardSavedProduct[]>([]);
    const [dashboardStats, setDashboardStats] = useState({
        activeBids: 0,
        wonAuctions: 0,
        totalOrders: 0,
        savedItems: 0,
    });

    // Pagination State for Orders
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Authentication check with localStorage fallback
    useEffect(() => {
        const hasLocalAuth = typeof window !== 'undefined' &&
            localStorage.getItem('accessToken') &&
            localStorage.getItem('user');

        if (!isAuthenticated && !hasLocalAuth) {
            const timer = setTimeout(() => {
                router.push('/login');
            }, 200);
            return () => clearTimeout(timer);
        } else if (user && user.role === 'admin') {
            // Only redirect admin users - 'user' role can access both buyer and seller dashboards
            router.push('/admin/dashboard');
        }
    }, [isAuthenticated, user, router]);

    // Cleanup isLoading if we lose auth
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
        }
    }, [isAuthenticated]);


    // Fetch Orders (Paginated)
    useEffect(() => {
        if (!isAuthenticated || (user && user.role === 'admin')) return;

        const fetchOrders = async () => {
            try {
                const limit = 10;
                const ordersResponse = await ordersApi.getBuyerOrders(currentPage, limit);

                // Handle response structure (checking if it returns { data, total } or just data)
                // Based on api/orders.ts, it returns { data: Order[], total: number }
                const ordersData = ordersResponse.data || [];
                const total = ordersResponse.total || 0;

                setTotalPages(Math.ceil(total / limit));
                setDashboardStats((prev) => ({
                    ...prev,
                    totalOrders: total,
                }));

                const enrichedOrders = ordersData.map((order) => {
                    const firstProduct = order.products[0];
                    const productTitle = order.product?.title || 'Product';
                    const productImage = order.product?.images?.[0] || DEFAULT_PRODUCT_IMAGE;

                    return {
                        id: order.id,
                        orderNumber: order.id.substring(0, 8).toUpperCase(),
                        productId: firstProduct?.productId || order.productId || '',
                        productTitle,
                        productImage,
                        amount: order.totalAmount,
                        orderDate: order.createdAt,
                        status: getOrderStatusForCard(order.status)
                    };
                });
                setOrders(enrichedOrders);
            } catch (error) {
                console.error('Error fetching orders:', error);
                toast.error('Failed to load orders');
            }
        };

        fetchOrders();
    }, [isAuthenticated, user, currentPage]);

    // Fetch Other Dashboard Data
    useEffect(() => {
        if (!isAuthenticated || (user && user.role === 'admin')) return;

        const fetchDashboardData = async () => {
            setIsLoading(true);
            try {
                const dashboard = await usersApi.getBuyerDashboard();
                setDashboardStats(dashboard.stats);
                setActiveBids(dashboard.activeBids);
                setWonAuctions(dashboard.wonAuctions);
                setSavedProducts(dashboard.savedProducts);

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                toast.error('Failed to load dashboard data');
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboardData();
    }, [isAuthenticated, user]);



    // Handler for removing saved products
    const handleRemoveSaved = async (productId: string) => {
        try {
            await wishlistApi.removeFromWishlist(productId);
            setSavedProducts(prev => prev.filter(p => p.productId !== productId));
            toast.success('Removed from saved items');
        } catch (error) {
            console.error('Error removing saved item:', error);
            toast.error('Failed to remove item');
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="animate-pulse space-y-8">
                        <div className="h-20 bg-gray-200 rounded-2xl w-full max-w-3xl" />
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-40 bg-gray-200 rounded-2xl" />
                            ))}
                        </div>
                        <div className="h-96 bg-gray-200 rounded-2xl" />
                    </div>
                </div>
            </div>
        );
    }

    const tabs = [
        { id: 'all' as const, label: 'Overview', icon: FaThLarge },
        { id: 'bids' as const, label: 'Active Bids', icon: FaGavel, count: dashboardStats.activeBids },
        { id: 'won' as const, label: 'Won Auctions', icon: FaTrophy, count: dashboardStats.wonAuctions },
        { id: 'orders' as const, label: 'Orders', icon: FaShoppingBag, count: dashboardStats.totalOrders },
        { id: 'saved' as const, label: 'Saved', icon: FaHeart, count: dashboardStats.savedItems },
    ];

    return (
        <div className="min-h-screen bg-gray-50 pb-12">


            {/* Header Section with Gradient */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                                Dashboard
                            </h1>
                            <p className="text-gray-500 mt-1">
                                Welcome back, <span className="font-semibold text-indigo-600">{(user && user.firstName) ? user.firstName : 'User'}</span>! Here&apos;s your activity overview.
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-gray-500">Last login: Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="mt-8 flex space-x-1 overflow-x-auto pb-1 scrollbar-hide">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`
                                        flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap
                                        ${isActive
                                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}
                                    `}
                                >
                                    <Icon className={isActive ? 'text-indigo-200' : 'text-gray-400'} />
                                    {tab.label}
                                    {tab.count !== undefined && tab.count > 0 && (
                                        <span className={`
                                            ml-1 px-2 py-0.5 rounded-full text-xs font-bold
                                            ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}
                                        `}>
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview - Always visible on 'all' tab */}
                {activeTab === 'all' && (
                    <div className="animate-fade-in-up">
                        <DashboardStats
                            activeBids={dashboardStats.activeBids}
                            wonAuctions={dashboardStats.wonAuctions}
                            totalOrders={dashboardStats.totalOrders}
                            savedItems={dashboardStats.savedItems}
                        />
                    </div>
                )}

                {/* Content Sections */}
                <div className="space-y-8">
                    {(activeTab === 'all' || activeTab === 'bids') && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                            <ActiveBidsCard bids={activeBids} />
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'won') && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                            <WonAuctionsCard auctions={wonAuctions} />
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'orders') && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
                            <OrderHistoryCard
                                orders={orders}
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'saved') && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                            <SavedProductsCard products={savedProducts} onRemove={handleRemoveSaved} />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
