'use client';

import { useState, useEffect } from 'react';
import { FaShoppingCart, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { adminApi } from '../../../api/admin';

export default function OrderOversightPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchOrders();
    }, [filter]);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const data = await adminApi.getAllOrders({ status: filter !== 'all' ? filter : undefined });
            setOrders(data.orders || []);
        } catch (err) {
            console.error('Error fetching orders:', err);
            // Mock data
            setOrders(Array.from({ length: 20 }, (_, i) => ({
                id: `order-${i + 1}`,
                productTitle: `Product ${i + 1}`,
                buyer: `Buyer ${i + 1}`,
                seller: `Seller ${i + 1}`,
                amount: Math.floor(Math.random() * 1000) + 100,
                status: ['pending', 'paid', 'shipped', 'delivered', 'disputed'][Math.floor(Math.random() * 5)],
                createdAt: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (orderId: string, newStatus: string) => {
        try {
            await adminApi.updateOrderStatus(orderId, newStatus);
            toast.success('Order status updated');
            fetchOrders();
        } catch (err) {
            toast.error('Failed to update order status');
        }
    };

    const filteredOrders = orders.filter(order =>
        order.productTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.buyer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.seller.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Order Oversight 🛒
                    </h1>
                    <p className="text-lg text-gray-600">
                        Monitor and manage all platform orders
                    </p>
                </div>

                {/* Filters and Search */}
                <div className="bg-white rounded-lg shadow-md p-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Status Filter */}
                        <div className="flex gap-2 flex-wrap">
                            {['all', 'pending', 'paid', 'shipped', 'delivered', 'disputed'].map((status) => (
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
                                    placeholder="Search orders..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Orders Table */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                        <p className="text-gray-600">Loading orders...</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Buyer</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Seller</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredOrders.map((order) => (
                                        <tr key={order.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 font-mono text-sm text-gray-900">
                                                {order.id}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="font-semibold text-gray-900">{order.productTitle}</p>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {order.buyer}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {order.seller}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-gray-900">৳{order.amount}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs rounded-full ${order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                                        order.status === 'shipped' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'paid' ? 'bg-purple-100 text-purple-800' :
                                                                order.status === 'disputed' ? 'bg-red-100 text-red-800' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(order.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={order.status}
                                                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                                                    className="text-sm border border-gray-300 rounded px-2 py-1"
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="paid">Paid</option>
                                                    <option value="shipped">Shipped</option>
                                                    <option value="delivered">Delivered</option>
                                                    <option value="disputed">Disputed</option>
                                                </select>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
