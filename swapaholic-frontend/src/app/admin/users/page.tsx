'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    FaCheckCircle, FaBan, FaUndo, FaSearch, FaShoppingCart,
    FaStore, FaTimes, FaUsers, FaPause, FaChevronLeft, FaChevronRight,
    FaUserShield, FaSyncAlt, FaCalendarAlt, FaPhone,
    FaEnvelope, FaArrowLeft
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
import '../../../styles/admin-dashboard.css';

interface User {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    role: string;
    accountStatus: string;
    emailVerified: boolean;
    isVerifiedUser?: boolean;
    kycVerified?: boolean;
    profilePicture?: string;
    ratingAverage?: number;
    totalTransactions?: number;
    createdAt: string;
    profileCompletionScore?: number;
}

interface DashboardData {
    viewAs: 'buyer' | 'seller';
    user: { id: string; name: string; email: string; role: string };
    stats: Record<string, string | number>;
    recentBids?: DashboardBid[];
    recentOrders?: DashboardOrder[];
    wonAuctions?: DashboardWonAuction[];
    recentListings?: DashboardListing[];
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

interface DashboardBid {
    id: string;
    productTitle: string;
    bidAmount: number;
    status: string;
}

interface DashboardOrder {
    id: string;
    productTitle: string;
    sellerName?: string;
    buyerName?: string;
    amount: number;
    status: string;
}

interface DashboardWonAuction {
    id: string;
    productTitle: string;
    finalPrice: number;
    wonAt?: string;
}

interface DashboardListing {
    id: string;
    title: string;
    basePrice: number;
    currentBid: number;
    status: string;
}

interface DashboardModalResponse {
    data?: DashboardData;
}

export default function UserManagementPage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, pages: 0 });

    // Filters
    const [roleFilter, setRoleFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchInput, setSearchInput] = useState('');

    // Dashboard modal
    const [showDashboard, setShowDashboard] = useState(false);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [dashboardLoading, setDashboardLoading] = useState(false);

    const isLoading = isAuthLoading || isDataLoading;

    const fetchUsers = useCallback(async (page = 1) => {
        try {
            setIsDataLoading(true);
            const params: { page: number; limit: number; role?: string; status?: string; search?: string } = {
                page,
                limit: pagination.limit,
            };
            if (roleFilter !== 'all') params.role = roleFilter;
            if (statusFilter !== 'all') params.status = statusFilter;
            if (searchTerm) params.search = searchTerm;

            const data = await adminApi.getUsers(params);
            setUsers(data.users || []);
            setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 0 });
        } catch (err) {
            console.error('Error fetching users:', err);
            toast.error('Failed to load users');
            setUsers([]);
        } finally {
            setIsDataLoading(false);
        }
    }, [roleFilter, statusFilter, searchTerm, pagination.limit]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers(1);
        }
    }, [isAdmin, fetchUsers]);

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchTerm(searchInput);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleVerify = async (userId: string) => {
        try {
            await adminApi.verifyUser(userId);
            toast.success('User verified successfully');
            fetchUsers(pagination.page);
        } catch {
            toast.error('Failed to verify user');
        }
    };

    const handleBan = async (userId: string) => {
        const reason = prompt('Reason for ban:');
        if (reason) {
            try {
                await adminApi.banUser(userId, reason);
                toast.success('User banned successfully');
                fetchUsers(pagination.page);
            } catch {
                toast.error('Failed to ban user');
            }
        }
    };

    const handleSuspend = async (userId: string) => {
        const reason = prompt('Reason for suspension:');
        if (reason) {
            try {
                await adminApi.suspendUser(userId, reason);
                toast.success('User suspended successfully');
                fetchUsers(pagination.page);
            } catch {
                toast.error('Failed to suspend user');
            }
        }
    };

    const handleUnban = async (userId: string) => {
        try {
            await adminApi.unbanUser(userId);
            toast.success('User reactivated successfully');
            fetchUsers(pagination.page);
        } catch {
            toast.error('Failed to reactivate user');
        }
    };

    const handleUnsuspend = async (userId: string) => {
        try {
            await adminApi.unsuspendUser(userId);
            toast.success('User unsuspended successfully');
            fetchUsers(pagination.page);
        } catch {
            toast.error('Failed to unsuspend user');
        }
    };

    const handleViewDashboard = async (userId: string, viewAs: 'buyer' | 'seller') => {
        try {
            setDashboardLoading(true);
            setShowDashboard(true);
            const response = await adminApi.getUserDashboard(userId, viewAs) as DashboardData | DashboardModalResponse;
            const dashboard = (response as DashboardModalResponse).data ?? (response as DashboardData);
            setDashboardData(dashboard);
        } catch (err) {
            console.error('Error fetching dashboard:', err);
            toast.error('Failed to load user dashboard');
            setShowDashboard(false);
        } finally {
            setDashboardLoading(false);
        }
    };

    const getDisplayName = (user: User) => {
        return `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Unknown';
    };

    const getStatusBadge = (status: string) => {
        const configs: Record<string, { bg: string; text: string; dot: string }> = {
            active: { bg: 'bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500' },
            suspended: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
            banned: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
            deleted: { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' },
        };
        const config = configs[status] || configs.active;
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${config.bg} ${config.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getRoleBadge = (role: string) => {
        const configs: Record<string, string> = {
            admin: 'bg-purple-100 text-purple-700',
            user: 'bg-blue-100 text-blue-700',
            quality_controller: 'bg-teal-100 text-teal-700',
            delivery_person: 'bg-orange-100 text-orange-700',
        };
        const cls = configs[role] || 'bg-gray-100 text-gray-700';
        const labels: Record<string, string> = {
            admin: 'Admin',
            user: 'User',
            quality_controller: 'QC',
            delivery_person: 'Delivery',
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
                {labels[role] || role}
            </span>
        );
    };

    const roleFilters = [
        { key: 'all', label: 'All Roles' },
        { key: 'user', label: 'Users' },
        { key: 'admin', label: 'Admins' },
        { key: 'quality_controller', label: 'QC' },
        { key: 'delivery_person', label: 'Delivery' },
    ];

    const statusFilters = [
        { key: 'all', label: 'All Status' },
        { key: 'active', label: 'Active' },
        { key: 'suspended', label: 'Suspended' },
        { key: 'banned', label: 'Banned' },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <Link href="/admin/dashboard" className="p-2 hover:bg-white rounded-xl transition-all">
                            <FaArrowLeft className="text-gray-400" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-xl text-white">
                                    <FaUsers className="text-xl" />
                                </div>
                                User Management
                            </h1>
                            <p className="text-gray-500 mt-1">
                                {pagination.total} total users · Manage accounts, verification, and permissions
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchUsers(pagination.page)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <FaSyncAlt className="text-xs" />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Role Filter */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {roleFilters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setRoleFilter(f.key)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                        roleFilter === f.key
                                            ? 'bg-white text-gray-900 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Status Filter */}
                        <div className="flex bg-gray-100 rounded-lg p-1">
                            {statusFilters.map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap ${
                                        statusFilter === f.key
                                            ? 'bg-indigo-600 text-white shadow-sm'
                                            : 'text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                                <input
                                    type="text"
                                    placeholder="Search by name or email..."
                                    value={searchInput}
                                    onChange={(e) => setSearchInput(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                {isLoading ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-500">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                        <FaUsers className="text-4xl text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No users found matching your filters</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50/80 border-b border-gray-100">
                                        <th className="px-6 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Verified</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">View</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {users.map((user) => (
                                        <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                                            {/* User Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                                        {user.firstName?.charAt(0)?.toUpperCase() || '?'}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-semibold text-gray-900 text-sm truncate">{getDisplayName(user)}</p>
                                                        <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                            <FaEnvelope className="text-[10px]" />
                                                            {user.email}
                                                        </p>
                                                        {user.phone && (
                                                            <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                <FaPhone className="text-[10px]" />
                                                                {user.phone}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Role */}
                                            <td className="px-4 py-4">{getRoleBadge(user.role)}</td>

                                            {/* Status */}
                                            <td className="px-4 py-4">{getStatusBadge(user.accountStatus || 'active')}</td>

                                            {/* Verified */}
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    {user.emailVerified ? (
                                                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                                                            <FaCheckCircle /> Email
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">Not verified</span>
                                                    )}
                                                    {user.kycVerified && (
                                                        <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                                            <FaUserShield /> KYC
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Joined */}
                                            <td className="px-4 py-4">
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FaCalendarAlt className="text-[10px]" />
                                                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </td>

                                            {/* View Dashboard */}
                                            <td className="px-4 py-4">
                                                {user.role !== 'admin' ? (
                                                    <div className="flex gap-1.5">
                                                        <button
                                                            onClick={() => handleViewDashboard(user._id, 'buyer')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition font-medium"
                                                            title="View as Buyer"
                                                        >
                                                            <FaShoppingCart className="text-[10px]" />
                                                            Buyer
                                                        </button>
                                                        <button
                                                            onClick={() => handleViewDashboard(user._id, 'seller')}
                                                            className="flex items-center gap-1 px-2 py-1 text-xs bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition font-medium"
                                                            title="View as Seller"
                                                        >
                                                            <FaStore className="text-[10px]" />
                                                            Seller
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Admin</span>
                                                )}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-4 py-4">
                                                <div className="flex gap-1">
                                                    {!user.isVerifiedUser && user.role !== 'admin' && (
                                                        <button
                                                            onClick={() => handleVerify(user._id)}
                                                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                                            title="Verify user"
                                                        >
                                                            <FaCheckCircle className="text-sm" />
                                                        </button>
                                                    )}
                                                    {user.accountStatus === 'active' && user.role !== 'admin' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleSuspend(user._id)}
                                                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition"
                                                                title="Suspend user"
                                                            >
                                                                <FaPause className="text-sm" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleBan(user._id)}
                                                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                                title="Ban user"
                                                            >
                                                                <FaBan className="text-sm" />
                                                            </button>
                                                        </>
                                                    )}
                                                    {user.accountStatus === 'suspended' && (
                                                        <button
                                                            onClick={() => handleUnsuspend(user._id)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Unsuspend user"
                                                        >
                                                            <FaUndo className="text-sm" />
                                                        </button>
                                                    )}
                                                    {user.accountStatus === 'banned' && (
                                                        <button
                                                            onClick={() => handleUnban(user._id)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                            title="Unban user"
                                                        >
                                                            <FaUndo className="text-sm" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        {pagination.pages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                                <p className="text-sm text-gray-500">
                                    Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => fetchUsers(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronLeft className="text-xs text-gray-600" />
                                    </button>
                                    {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                                        .filter(p => p === 1 || p === pagination.pages || Math.abs(p - pagination.page) <= 1)
                                        .map((p, idx, arr) => (
                                            <span key={p}>
                                                {idx > 0 && arr[idx - 1] !== p - 1 && (
                                                    <span className="px-1 text-gray-400 text-xs">…</span>
                                                )}
                                                <button
                                                    onClick={() => fetchUsers(p)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                                                        p === pagination.page
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'hover:bg-gray-100 text-gray-600'
                                                    }`}
                                                >
                                                    {p}
                                                </button>
                                            </span>
                                        ))}
                                    <button
                                        onClick={() => fetchUsers(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.pages}
                                        className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <FaChevronRight className="text-xs text-gray-600" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Dashboard Modal */}
            {showDashboard && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDashboard(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white/90 backdrop-blur-sm border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`p-2.5 rounded-xl ${dashboardData?.viewAs === 'buyer' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                                    {dashboardData?.viewAs === 'buyer' ? (
                                        <FaShoppingCart className="text-indigo-600" />
                                    ) : (
                                        <FaStore className="text-emerald-600" />
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900">
                                        {dashboardData?.user?.name || 'User'}&apos;s Dashboard
                                    </h2>
                                    <p className="text-xs text-gray-500">
                                        Viewing as {dashboardData?.viewAs === 'buyer' ? 'Buyer' : 'Seller'} · {dashboardData?.user?.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDashboard(false)}
                                className="p-2 hover:bg-gray-100 rounded-xl transition"
                            >
                                <FaTimes className="text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6">
                            {dashboardLoading ? (
                                <div className="text-center py-16">
                                    <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                                    <p className="text-gray-500 text-sm">Loading dashboard...</p>
                                </div>
                            ) : dashboardData ? (
                                <div className="space-y-6">
                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                        {Object.entries(dashboardData.stats).map(([key, value]) => (
                                            <div key={key} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                                <p className="text-xs text-gray-500 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</p>
                                                <p className="text-xl font-bold text-gray-900">
                                                    {typeof value === 'number' && (key.toLowerCase().includes('spent') || key.toLowerCase().includes('revenue'))
                                                        ? `৳${value.toLocaleString()}`
                                                        : value}
                                                </p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Recent Bids (Buyer) */}
                                    {dashboardData.viewAs === 'buyer' && dashboardData.recentBids && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Bids</h3>
                                            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                                {dashboardData.recentBids.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100/80">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Amount</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {dashboardData.recentBids.slice(0, 5).map((bid) => (
                                                                <tr key={bid.id} className="hover:bg-white/50">
                                                                    <td className="px-4 py-2.5 text-gray-900">{bid.productTitle}</td>
                                                                    <td className="px-4 py-2.5 font-semibold">৳{bid.bidAmount}</td>
                                                                    <td className="px-4 py-2.5">{getStatusBadge(bid.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-400 text-sm p-4 text-center">No recent bids</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Listings (Seller) */}
                                    {dashboardData.viewAs === 'seller' && dashboardData.recentListings && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Listings</h3>
                                            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                                {dashboardData.recentListings.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100/80">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Base Price</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Current Bid</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {dashboardData.recentListings.slice(0, 5).map((product) => (
                                                                <tr key={product.id} className="hover:bg-white/50">
                                                                    <td className="px-4 py-2.5 text-gray-900">{product.title}</td>
                                                                    <td className="px-4 py-2.5">৳{product.basePrice}</td>
                                                                    <td className="px-4 py-2.5 font-semibold">৳{product.currentBid}</td>
                                                                    <td className="px-4 py-2.5">{getStatusBadge(product.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-400 text-sm p-4 text-center">No listings</p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Orders */}
                                    {dashboardData.recentOrders && (
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900 mb-3">Recent Orders</h3>
                                            <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
                                                {dashboardData.recentOrders.length > 0 ? (
                                                    <table className="w-full text-sm">
                                                        <thead className="bg-gray-100/80">
                                                            <tr>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Product</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">{dashboardData.viewAs === 'buyer' ? 'Seller' : 'Buyer'}</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Amount</th>
                                                                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500">Status</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {dashboardData.recentOrders.slice(0, 5).map((order) => (
                                                                <tr key={order.id} className="hover:bg-white/50">
                                                                    <td className="px-4 py-2.5 text-gray-900">{order.productTitle}</td>
                                                                    <td className="px-4 py-2.5">{order.sellerName || order.buyerName}</td>
                                                                    <td className="px-4 py-2.5 font-semibold">৳{order.amount}</td>
                                                                    <td className="px-4 py-2.5">{getStatusBadge(order.status)}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : (
                                                    <p className="text-gray-400 text-sm p-4 text-center">No orders</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="text-gray-400 text-center py-8">No data available</p>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
