'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
    FaSearch, FaBoxOpen, FaTruck, FaCheckDouble,
    FaTimesCircle, FaExclamationTriangle, FaArrowLeft, FaSyncAlt,
    FaRegCreditCard, FaLock, FaMoneyBillWave, FaUndo, FaChevronLeft,
    FaChevronRight, FaRegCalendarAlt, FaClock, FaGavel
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';
import { useRequireAdminAuth } from '../../../hooks/useRequireAdminAuth';
// Import CSS if needed, but Tailwind handles most of it
import '../../../styles/admin-dashboard.css';

interface AdminOrder {
    _id: string;
    finalPrice: number;
    status: string;
    escrowStatus: string;
    orderDate: string;
    createdAt: string;
    updatedAt: string;
    estimatedDeliveryDate?: string;
    actualDeliveryDate?: string;
    notes?: string;
    buyerId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    sellerId: {
        _id: string;
        firstName: string;
        lastName: string;
        email: string;
    };
    productId: {
        _id: string;
        title: string;
        category: string;
    };
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    pages: number;
}

export default function OrderOversightPage() {
    const { isLoading: isAuthLoading, isAdmin } = useRequireAdminAuth();
    const [orders, setOrders] = useState<AdminOrder[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, pages: 0 });

    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    
    // Slide-over state
    const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
    const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);

    const isLoading = isAuthLoading || isDataLoading;

    const fetchOrders = useCallback(async (page = 1) => {
        try {
            setIsDataLoading(true);
            const data = await adminApi.getAllOrders({ 
                status: statusFilter === 'all' ? undefined : statusFilter,
                page,
                limit: pagination.limit 
            });
            setOrders(data.orders || []);
            setPagination(data.pagination || { page: 1, limit: 15, total: 0, pages: 0 });
        } catch (err: unknown) {
            console.error('Error fetching orders:', err);
            toast.error('Failed to load orders');
        } finally {
            setIsDataLoading(false);
        }
    }, [statusFilter, pagination.limit]);

    useEffect(() => {
        if (isAdmin) {
            fetchOrders(1);
        }
    }, [isAdmin, fetchOrders]);

    // Debounced search logic (frontend filter for now to avoid heavy backend changes)
    const filteredOrders = useMemo(() => {
        if (!searchTerm) return orders;
        const lowerSearch = searchTerm.toLowerCase();
        return orders.filter(o => 
            o._id.toLowerCase().includes(lowerSearch) ||
            o.productId?.title.toLowerCase().includes(lowerSearch) ||
            `${o.buyerId?.firstName} ${o.buyerId?.lastName}`.toLowerCase().includes(lowerSearch) ||
            `${o.sellerId?.firstName} ${o.sellerId?.lastName}`.toLowerCase().includes(lowerSearch)
        );
    }, [orders, searchTerm]);

    const openSlideOver = (order: AdminOrder) => {
        setSelectedOrder(order);
        setIsSlideOverOpen(true);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'paid': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'shipped': 
            case 'in_delivery': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'delivered': return 'bg-teal-100 text-teal-700 border-teal-200';
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'disputed': return 'bg-red-100 text-red-700 border-red-200 animate-pulse';
            case 'cancelled': return 'bg-slate-100 text-slate-700 border-slate-200 line-through';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    const getEscrowStyle = (status: string) => {
        switch (status) {
            case 'held': return 'text-amber-600 bg-amber-50 border-amber-200';
            case 'released': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
            case 'refunded': return 'text-blue-600 bg-blue-50 border-blue-200';
            default: return 'text-gray-600 bg-gray-50 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <FaClock className="text-gray-500" />;
            case 'paid': return <FaRegCreditCard className="text-indigo-500" />;
            case 'in_delivery': return <FaTruck className="text-amber-500" />;
            case 'completed': return <FaCheckDouble className="text-emerald-500" />;
            case 'disputed': return <FaExclamationTriangle className="text-red-500" />;
            case 'cancelled': return <FaTimesCircle className="text-slate-500" />;
            default: return <FaBoxOpen className="text-blue-500" />;
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-indigo-50/30">
            <div className={`transition-all duration-300 ${isSlideOverOpen ? 'pr-[400px]' : ''}`}>
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/admin/dashboard" className="p-2 hover:bg-white rounded-xl transition-all">
                                <FaArrowLeft className="text-gray-400" />
                            </Link>
                            <div>
                                <h1 className="text-3xl font-extrabold text-gray-900 flex items-center gap-3">
                                    <div className="p-2 bg-indigo-600 rounded-xl text-white">
                                        <FaBoxOpen className="text-xl" />
                                    </div>
                                    Order Oversight
                                </h1>
                                <p className="text-gray-500 mt-1">
                                    Monitor transaction lifecycles and global platform orders
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => fetchOrders(pagination.page)}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                        >
                            <FaSyncAlt className="text-xs" />
                            Refresh Data
                        </button>
                    </div>

                    {/* Toolbar (Filters & Search) */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                        {/* Status Filters - Scrollable on mobile */}
                        <div className="flex overflow-x-auto pb-2 md:pb-0 w-full md:w-auto custom-scrollbar gap-2">
                            {[
                                { key: 'all', label: 'All Orders' },
                                { key: 'pending', label: 'Pending' },
                                { key: 'in_delivery', label: 'In Transit' },
                                { key: 'completed', label: 'Completed' },
                                { key: 'disputed', label: 'Disputed' },
                            ].map((f) => (
                                <button
                                    key={f.key}
                                    onClick={() => setStatusFilter(f.key)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                                        statusFilter === f.key
                                            ? 'bg-indigo-600 text-white shadow-md'
                                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-transparent hover:border-gray-200'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>

                        {/* Search Field */}
                        <div className="relative w-full md:w-80">
                            <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search ID, Product, or User..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Orders Datagrid */}
                    {isLoading ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-500">Loading order records...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-16 text-center">
                            <FaCheckDouble className="text-5xl text-gray-300 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-gray-900 mb-1">No Orders Found</h3>
                            <p className="text-gray-500">Try adjusting your filters or search term.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50/80 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID & Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item & Value</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Buyer / Seller</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Lifecycle Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Escrow</th>
                                        <th className="px-6 py-4 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredOrders.map((order) => (
                                        <tr 
                                            key={order._id} 
                                            onClick={() => openSlideOver(order)}
                                            className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-mono text-xs font-medium text-gray-900 mb-1">
                                                    #{order._id.slice(-8).toUpperCase()}
                                                </div>
                                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                                    <FaRegCalendarAlt className="text-gray-400" />
                                                    {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1 max-w-[200px]">
                                                    {order.productId?.title || 'Unknown Product'}
                                                </div>
                                                <div className="text-xs font-bold text-emerald-600">
                                                    ৳{order.finalPrice?.toLocaleString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell">
                                                <div className="flex flex-col gap-1 text-xs">
                                                    <div className="flex gap-2"><span className="text-gray-400 w-8">B:</span> <span className="font-medium text-gray-800 line-clamp-1">{order.buyerId?.firstName} {order.buyerId?.lastName}</span></div>
                                                    <div className="flex gap-2"><span className="text-gray-400 w-8">S:</span> <span className="font-medium text-gray-800 line-clamp-1">{order.sellerId?.firstName} {order.sellerId?.lastName}</span></div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusStyle(order.status)}`}>
                                                    {getStatusIcon(order.status)}
                                                    {order.status.replace('_', ' ').toUpperCase()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden md:table-cell">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold border uppercase tracking-wide ${getEscrowStyle(order.escrowStatus)}`}>
                                                    {order.escrowStatus === 'held' && <FaLock className="text-[10px]" />}
                                                    {order.escrowStatus === 'released' && <FaMoneyBillWave className="text-[10px]" />}
                                                    {order.escrowStatus === 'refunded' && <FaUndo className="text-[10px]" />}
                                                    {order.escrowStatus}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="p-2 text-gray-400 group-hover:text-indigo-600 transition-colors rounded-lg group-hover:bg-indigo-100 inline-block">
                                                    <FaChevronRight />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {pagination.pages > 1 && !searchTerm && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                                    <p className="text-sm text-gray-500">
                                        Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
                                    </p>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => fetchOrders(pagination.page - 1)}
                                            disabled={pagination.page <= 1}
                                            className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-gray-300 bg-white shadow-sm"
                                        >
                                            <FaChevronLeft className="text-xs text-gray-600" />
                                        </button>
                                        <span className="text-sm font-medium text-gray-700 px-3">
                                            Page {pagination.page} / {pagination.pages}
                                        </span>
                                        <button
                                            onClick={() => fetchOrders(pagination.page + 1)}
                                            disabled={pagination.page >= pagination.pages}
                                            className="p-2 rounded-lg hover:bg-gray-200 transition disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-gray-300 bg-white shadow-sm"
                                        >
                                            <FaChevronRight className="text-xs text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Slide-Over Modal for Order Details */}
            {isSlideOverOpen && selectedOrder && (
                <>
                    {/* Backdrop */}
                    <div 
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setIsSlideOverOpen(false)}
                    />
                    
                    {/* Slide-over Panel */}
                    <div className="fixed inset-y-0 right-0 w-full md:w-[400px] bg-white shadow-2xl z-50 transform transition-transform duration-300 flex flex-col border-l border-gray-200">
                        {/* Header */}
                        <div className="px-6 py-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    Order Data
                                </h2>
                                <p className="text-xs font-mono text-gray-500 mt-1">
                                    ID: {selectedOrder._id}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsSlideOverOpen(false)}
                                className="p-2 bg-white border border-gray-200 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                            >
                                <FaTimesCircle className="text-lg" />
                            </button>
                        </div>

                        {/* Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Visual Order Timeline */}
                            <div>
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Lifecycle Timeline</h3>
                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 before:to-transparent">
                                    
                                    {/* Timeline Item: Created */}
                                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                        <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-indigo-100 text-indigo-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shrink-0 z-10">
                                            <FaClock className="text-sm" />
                                        </div>
                                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded border border-gray-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-bold text-slate-900 text-sm">Order Placed</div>
                                            </div>
                                            <div className="text-slate-500 text-xs">{new Date(selectedOrder.createdAt).toLocaleString()}</div>
                                        </div>
                                    </div>

                                    {/* Timeline Item: In Delivery / Shipped */}
                                    {['in_delivery', 'shipped', 'delivered', 'completed'].includes(selectedOrder.status) && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-amber-100 text-amber-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shrink-0 z-10">
                                                <FaTruck className="text-sm" />
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded border border-gray-100 shadow-sm">
                                                <div className="font-bold text-slate-900 text-sm mb-1">In Transit</div>
                                                <div className="text-slate-500 text-xs">Estimated: {selectedOrder.estimatedDeliveryDate ? new Date(selectedOrder.estimatedDeliveryDate).toLocaleDateString() : 'N/A'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline Item: Completed */}
                                    {['completed'].includes(selectedOrder.status) && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shrink-0 z-10">
                                                <FaCheckDouble className="text-sm" />
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded border border-gray-100 shadow-sm">
                                                <div className="font-bold text-slate-900 text-sm mb-1">Delivered</div>
                                                <div className="text-slate-500 text-xs">Actual: {selectedOrder.actualDeliveryDate ? new Date(selectedOrder.actualDeliveryDate).toLocaleDateString() : 'Confirmed'}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Timeline Item: Disputed */}
                                    {['disputed'].includes(selectedOrder.status) && (
                                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-red-100 text-red-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shrink-0 z-10">
                                                <FaExclamationTriangle className="text-sm" />
                                            </div>
                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-3 rounded border border-red-100 shadow-sm">
                                                <div className="font-bold text-red-700 text-sm mb-1">Disputed</div>
                                                <div className="text-red-500 text-xs">Check Disputes Center</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Item Details */}
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Item Details</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Product:</span>
                                        <span className="font-medium text-gray-900 text-right">{selectedOrder.productId?.title}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Category:</span>
                                        <span className="font-medium text-gray-900 capitalize">{selectedOrder.productId?.category}</span>
                                    </div>
                                    <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                                        <span className="text-gray-700 font-semibold">Final Price:</span>
                                        <span className="font-bold text-emerald-600">৳{selectedOrder.finalPrice?.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Escrow Status Focus */}
                            <div className={`rounded-xl p-4 border ${selectedOrder.escrowStatus === 'held' ? 'bg-amber-50 border-amber-200' : selectedOrder.escrowStatus === 'released' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'}`}>
                                <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2" 
                                    style={{ color: selectedOrder.escrowStatus === 'held' ? '#b45309' : selectedOrder.escrowStatus === 'released' ? '#047857' : '#1d4ed8' }}
                                >
                                    <FaLock /> Escrow Status
                                </h3>
                                <p className="text-xl font-bold uppercase" style={{ color: selectedOrder.escrowStatus === 'held' ? '#d97706' : selectedOrder.escrowStatus === 'released' ? '#059669' : '#2563eb' }}>
                                    {selectedOrder.escrowStatus}
                                </p>
                                <p className="text-xs mt-1 opacity-80" style={{ color: selectedOrder.escrowStatus === 'held' ? '#b45309' : selectedOrder.escrowStatus === 'released' ? '#047857' : '#1d4ed8' }}>
                                    {selectedOrder.escrowStatus === 'held' ? 'Funds secured by Admin. Pending successful delivery.' :
                                     selectedOrder.escrowStatus === 'released' ? 'Funds dispensed to seller. Order completed.' :
                                     'Funds returned to buyer.'}
                                </p>
                            </div>

                            {/* Parties */}
                            <div className="space-y-3">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Involved Parties</h3>
                                
                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-0.5 rounded mb-1 inline-block">Buyer</span>
                                    <p className="font-semibold text-gray-900 text-sm">{selectedOrder.buyerId?.firstName} {selectedOrder.buyerId?.lastName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.buyerId?.email}</p>
                                </div>

                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded mb-1 inline-block">Seller</span>
                                    <p className="font-semibold text-gray-900 text-sm">{selectedOrder.sellerId?.firstName} {selectedOrder.sellerId?.lastName}</p>
                                    <p className="text-xs text-gray-500 mt-0.5">{selectedOrder.sellerId?.email}</p>
                                </div>
                            </div>
                        </div>
                        
                        {/* Slide-over Footer Actions */}
                        {selectedOrder.status === 'disputed' && (
                            <div className="p-4 bg-red-50 border-t border-red-100 text-center">
                                <Link href="/admin/disputes" className="inline-flex items-center gap-2 px-6 py-2 bg-red-600 text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition w-full justify-center shadow-sm">
                                    <FaGavel /> View in Dispute Center
                                </Link>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
