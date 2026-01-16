'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FaShoppingBag, FaSearch, FaFilter, FaEye, FaArrowRight } from 'react-icons/fa';
import { useState } from 'react';

interface Order {
    id: string;
    orderNumber: string;
    productId: string;
    productTitle: string;
    productImage: string;
    amount: number;
    orderDate: string;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

interface OrderHistoryCardProps {
    orders: Order[];
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function OrderHistoryCard({ orders, currentPage, totalPages, onPageChange }: OrderHistoryCardProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'delivered':
                return { text: 'Delivered', class: 'bg-green-100 text-green-700 border-green-200' };
            case 'shipped':
                return { text: 'Shipped', class: 'bg-blue-100 text-blue-700 border-blue-200' };
            case 'processing':
                return { text: 'Processing', class: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
            case 'cancelled':
                return { text: 'Cancelled', class: 'bg-red-100 text-red-700 border-red-200' };
            default:
                return { text: 'Pending', class: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch =
            order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.productTitle.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesFilter = filterStatus === 'all' || order.status === filterStatus;

        return matchesSearch && matchesFilter;
    });

    if (orders.length === 0 && currentPage === 1) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 text-center">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FaShoppingBag className="text-3xl text-emerald-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Orders Yet</h2>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    You haven't placed any orders yet. Win auctions to start shopping!
                </p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                        <FaShoppingBag />
                    </span>
                    Order History
                    <span className="ml-2 px-2.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        {orders.length}
                    </span>
                </h2>

                <div className="flex gap-2 relative">
                    <div className="relative">
                        <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                        <input
                            type="text"
                            placeholder="Search orders..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent w-full sm:w-48"
                        />
                    </div>
                    <div className="relative">
                        <button
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`p-2 border rounded-lg transition ${filterStatus !== 'all' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                        >
                            <FaFilter />
                        </button>

                        {isFilterOpen && (
                            <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-10 py-1">
                                {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setFilterStatus(status);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`block w-full text-left px-4 py-2 text-sm capitalize hover:bg-gray-50 ${filterStatus === status ? 'text-emerald-600 font-medium bg-emerald-50' : 'text-gray-700'}`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Order ID</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredOrders.length > 0 ? (
                            filteredOrders.map((order) => {
                                const statusBadge = getStatusBadge(order.status);
                                return (
                                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <span className="font-mono text-sm text-gray-600">#{order.orderNumber}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                                                    <Image src={order.productImage} alt={order.productTitle} fill className="object-cover" />
                                                </div>
                                                <span className="text-sm font-medium text-gray-900 line-clamp-1 max-w-[200px]">
                                                    {order.productTitle}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(order.orderDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-bold text-gray-900">
                                            ৳{order.amount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadge.class}`}>
                                                {statusBadge.text}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Link
                                                href={`/orders/${order.id}`}
                                                className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-emerald-500 hover:text-white transition"
                                                title="View Details"
                                            >
                                                <FaArrowRight size={12} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                    No orders found matching your criteria.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-gray-100 bg-gray-50/30">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${currentPage === 1
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        Previous
                    </button>
                    <span className="text-sm text-gray-600 font-medium">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition ${currentPage === totalPages
                                ? 'text-gray-400 cursor-not-allowed'
                                : 'text-gray-700 hover:bg-white hover:shadow-sm'
                            }`}
                    >
                        Next
                    </button>
                </div>
            )}
        </div>
    );
}
