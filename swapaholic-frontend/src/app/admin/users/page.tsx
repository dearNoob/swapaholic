'use client';

import { useState, useEffect } from 'react';
import { FaCheckCircle, FaBan, FaUndo, FaSearch, FaEye, FaShoppingCart, FaStore, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';

// Define User type for this component
interface User {
    id: string;
    _id?: string; // fallback
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    status: string;
    verified: boolean;
    totalSpent: number;
    createdAt?: string;
}

interface DashboardData {
    viewAs: 'buyer' | 'seller';
    user: { id: string; name: string; email: string; role: string };
    stats: Record<string, any>;
    recentBids?: any[];
    recentOrders?: any[];
    wonAuctions?: any[];
    recentListings?: any[];
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [showDashboard, setShowDashboard] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, [filter]);

    const fetchUsers = async () => {
        try {
            setIsLoading(true);
            const data = await adminApi.getUsers({ status: filter !== 'all' ? filter : undefined });
            setUsers(data.users || []);
        } catch (err) {
            console.error('Error fetching users:', err);
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (userId: string) => {
        try {
            await adminApi.verifyUser(userId);
            toast.success('User verified successfully');
            fetchUsers();
        } catch (err) {
            toast.error('Failed to verify user');
        }
    };

    const handleBan = async (userId: string) => {
        const reason = prompt('Reason for ban:');
        if (reason) {
            try {
                await adminApi.banUser(userId, reason);
                toast.success('User banned successfully');
                fetchUsers();
            } catch (err) {
                toast.error('Failed to ban user');
            }
        }
    };

    const handleUnban = async (userId: string) => {
        try {
            await adminApi.unbanUser(userId);
            toast.success('User unbanned successfully');
            fetchUsers();
        } catch (err) {
            toast.error('Failed to unban user');
        }
    };

    const handleViewDashboard = async (userId: string, viewAs: 'buyer' | 'seller') => {
        try {
            setDashboardLoading(true);
            setShowDashboard(true);
            const response = await adminApi.getUserDashboard(userId, viewAs);
            setDashboardData(response.data);
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            toast.error('Failed to load user dashboard');
            setShowDashboard(false);
        } finally {
            setDashboardLoading(false);
        }
    };

    // Helper to get display name
    const getDisplayName = (user: User) => {
        if (user.name) return user.name;
        const first = user.firstName || '';
        const last = user.lastName || '';
        return `${first} ${last}`.trim() || 'Unknown';
    };

    const filteredUsers = users.filter(user =>
        getDisplayName(user).toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        User Management 👥
                    </h1>
                    <p className="text-lg text-gray-600">
                        Manage user accounts, verification, and view dashboards
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-2">
                            {['all', 'active', 'pending', 'banned'].map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilter(status)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === status
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {status.toUpperCase()}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600">Loading users...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Verified</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Spent</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">View Dashboard</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id || user._id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4">
                                                <div>
                                                    <p className="font-semibold text-gray-900">{getDisplayName(user)}</p>
                                                    <p className="text-sm text-gray-500">{user.email}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                                                    {user.role}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${user.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    user.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                    {user.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.verified ? (
                                                    <FaCheckCircle className="text-green-600" />
                                                ) : (
                                                    <span className="text-gray-400 text-sm">No</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900">
                                                    ৳{user.totalSpent || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {user.role !== 'admin' ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleViewDashboard(user.id || user._id!, 'buyer')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition"
                                                            title="View Buyer Dashboard"
                                                        >
                                                            <FaShoppingCart className="text-xs" />
                                                            Buyer
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewDashboard(user.id || user._id!, 'seller')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition"
                                                            title="View Seller Dashboard"
                                                        >
                                                            <FaStore className="text-xs" />
                                                            Seller
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400">N/A</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex gap-2">
                                                    {!user.verified && (
                                                        <button
                                                            onClick={() => handleVerify(user.id || user._id!)}
                                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
                                                            title="Verify user"
                                                        >
                                                            <FaCheckCircle />
                                                        </button>
                                                    )}
                                                    {user.status !== 'banned' ? (
                                                        <button
                                                            onClick={() => handleBan(user.id || user._id!)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                            title="Ban user"
                                                        >
                                                            <FaBan />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnban(user.id || user._id!)}
                                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Unban user"
                                                        >
                                                            <FaUndo />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Dashboard Modal */}
            {showDashboard && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {dashboardData?.viewAs === 'buyer' ? (
                                    <FaShoppingCart className="text-indigo-600 text-xl" />
                                ) : (
                                    <FaStore className="text-green-600 text-xl" />
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {dashboardData?.user?.name || 'User'}'s Dashboard
                                    </h2>
                                    <p className="text-sm text-gray-500">
                                        Viewing as {dashboardData?.viewAs === 'buyer' ? 'Buyer' : 'Seller'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDashboard(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <FaTimes className="text-gray-500" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {dashboardLoading ? (
                                <div className="text-center py-16">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                                    <p className="text-gray-600">Loading dashboard...</p>
                                </div>
                            ) : dashboardData ? (
                                <div className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {Object.entries(dashboardData.stats).map(([key, value]) => (
                                            <div key={key} className="bg-gray-50 rounded-lg p-4">
                                                <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="text-2xl font-bold text-gray-900">
                                                    {typeof value === 'number' && key.toLowerCase().includes('spent') || key.toLowerCase().includes('revenue')
                                                        ? `৳${value.toLocaleString()}`
                                                        : value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recent Activity */}
                                    {dashboardData.viewAs === 'buyer' && dashboardData.recentBids && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Bids</h3>
                                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                                {dashboardData.recentBids.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Product</th>
                                                                <th className="px-4 py-2 text-left">Amount</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dashboardData.recentBids.slice(0, 5).map((bid: any) => (
                                                                <tr key={bid.id} className="border-t">
                                                                    <td className="px-4 py-2">{bid.productTitle}</td>
                                                                    <td className="px-4 py-2">৳{bid.bidAmount}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-1 rounded-full text-xs ${bid.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                            bid.status === 'accepted' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                            }`}>{bid.status}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-500 p-4">No recent bids</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {dashboardData.viewAs === 'seller' && dashboardData.recentListings && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Listings</h3>
                                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                                {dashboardData.recentListings.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Product</th>
                                                                <th className="px-4 py-2 text-left">Base Price</th>
                                                                <th className="px-4 py-2 text-left">Current Bid</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dashboardData.recentListings.slice(0, 5).map((product: any) => (
                                                                <tr key={product.id} className="border-t">
                                                                    <td className="px-4 py-2">{product.title}</td>
                                                                    <td className="px-4 py-2">৳{product.basePrice}</td>
                                                                    <td className="px-4 py-2">৳{product.currentBid}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-1 rounded-full text-xs ${product.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                            product.status === 'sold' ? 'bg-blue-100 text-blue-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                            }`}>{product.status}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-500 p-4">No listings</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Orders */}
                                    {dashboardData.recentOrders && (
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3">Recent Orders</h3>
                                            <div className="bg-gray-50 rounded-lg overflow-hidden">
                                                {dashboardData.recentOrders.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-4 py-2 text-left">Product</th>
                                                                <th className="px-4 py-2 text-left">{dashboardData.viewAs === 'buyer' ? 'Seller' : 'Buyer'}</th>
                                                                <th className="px-4 py-2 text-left">Amount</th>
                                                                <th className="px-4 py-2 text-left">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {dashboardData.recentOrders.slice(0, 5).map((order: any) => (
                                                                <tr key={order.id} className="border-t">
                                                                    <td className="px-4 py-2">{order.productTitle}</td>
                                                                    <td className="px-4 py-2">{order.sellerName || order.buyerName}</td>
                                                                    <td className="px-4 py-2">৳{order.amount}</td>
                                                                    <td className="px-4 py-2">
                                                                        <span className={`px-2 py-1 rounded-full text-xs ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                                'bg-gray-100 text-gray-700'
                                                                            }`}>{order.status}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-500 p-4">No orders</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">No data available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

