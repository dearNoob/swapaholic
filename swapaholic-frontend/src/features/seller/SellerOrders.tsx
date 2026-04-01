import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBox, FaTruck, FaCheckCircle, FaSearch, FaFilter, FaClipboardList } from 'react-icons/fa';
import { sellerApi } from '../../api/seller';
import { emailApi } from '../../api/email';
import { Button } from '../../components/ui/Button';
import { ReviewForm } from '../../components/reviews/ReviewForm';

import { Order } from '../../types/api';

export const SellerOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getOrders();
            // Data maps to PaginatedResponse<Order> structure
            setOrders(data.data || []);
        } catch (error: any) {
            console.error('Error fetching orders:', error);
            toast.error(error.response?.data?.message || 'Failed to load orders');
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        if (!window.confirm(`Are you sure you want to mark this order as ${newStatus}?`)) return;
        try {
            await sellerApi.updateOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${newStatus}`);

            // Send order shipped email notification
            if (newStatus === 'in_delivery') {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    emailApi.orderShipped(orderId, '').catch(err => {
                        console.error('Failed to send order shipped email:', err);
                    });
                }
            }

            fetchOrders();
        } catch (error: any) {
            console.error('Error updating order status:', error);
            toast.error(error.response?.data?.message || 'Failed to update order status');
        }
    };

    const filteredOrders = orders.filter((order: any) => {
        const matchingBuyerName = typeof order.buyerId === 'object' ? `${(order.buyerId as any)?.firstName || ''} ${(order.buyerId as any)?.lastName || ''}` : '';
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            matchingBuyerName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'processing': return 'bg-blue-100 text-blue-800';
            case 'shipped': return 'bg-indigo-100 text-indigo-800';
            case 'delivered': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            Order Management
                        </h2>
                        <p className="mt-1 text-lg text-gray-500">
                            View and manage your incoming orders.
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Order ID or Buyer Name..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <FaFilter className="text-gray-400" />
                        <select
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                        >
                            <option value="all">All Statuses</option>
                            <option value="pending">Pending</option>
                            <option value="processing">Processing</option>
                            <option value="shipped">Shipped</option>
                            <option value="delivered">Delivered</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500">Loading orders...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                            <FaClipboardList className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'You haven\'t received any orders yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                                            Order #{order.id}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                            Placed on {new Date(order.createdAt).toLocaleDateString()} by <span className="font-medium text-gray-900">{typeof (order as any).buyerId === 'object' ? `${((order as any).buyerId as any)?.firstName || ''} ${((order as any).buyerId as any)?.lastName || ''}` : 'Buyer'}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        {order.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(order.id, 'qc_pending')}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Process Order
                                            </Button>
                                        )}
                                        {order.status === 'qc_approved' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(order.id, 'in_delivery')}
                                                className="bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                Mark Shipped
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="flex flex-col md:flex-row gap-6">
                                        {/* Order Items */}
                                        <div className="flex-1">
                                            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                <FaBox /> Product Details
                                            </h4>
                                            <ul className="divide-y divide-gray-200">
                                                {/* Backend returns 'products' rather than 'items'. We map those instead. */}
                                                {(order.products || []).map((item, idx) => (
                                                    <li key={`${order.id}-${idx}`} className="py-3 flex justify-between items-center bg-white p-4 rounded-md border border-gray-100 mb-2">
                                                        <div className="flex-1">
                                                            <div className="flex justify-between text-base font-medium text-gray-900">
                                                                <h3 className="flex items-center gap-2">
                                                                     Product ID: {item.productId}
                                                                </h3>
                                                                <p className="text-lg font-bold text-indigo-600">৳{order.totalAmount.toFixed(2)}</p>
                                                            </div>
                                                            <p className="mt-1 text-sm text-gray-500">Qty: {item.quantity}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="mt-4 flex justify-between border-t pt-4">
                                                {order.status === 'in_delivery' && (
                                                   <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                                                      Funds Held in Escrow (Awaiting Buyer Confirmation)
                                                   </span>
                                                )}
                                                {order.status === 'completed' && (
                                                   <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">
                                                      Escrow Released (Funds in your Wallet)
                                                   </span>
                                                )}
                                                <p className="text-base font-bold text-gray-900 ml-auto flex items-center gap-2">Total Value: <span className="text-xl">৳{order.totalAmount.toFixed(2)}</span></p>
                                            </div>
                                            
                                            {/* Review Form Injection */}
                                            {order.status === 'completed' && (
                                                <div className="mt-4 border-t pt-4">
                                                    {reviewingOrderId === order.id ? (
                                                        <div className="animate-fadeIn">
                                                            <h4 className="text-sm font-medium text-gray-900 mb-2">Rate the Buyer</h4>
                                                            <ReviewForm 
                                                                orderId={order.id} 
                                                                onSuccess={() => {
                                                                    setReviewingOrderId(null);
                                                                    toast.success("Thank you for your review!");
                                                                }} 
                                                            />
                                                            <button 
                                                                onClick={() => setReviewingOrderId(null)}
                                                                className="mt-2 text-sm text-gray-500 hover:text-gray-700 w-full text-center"
                                                            >
                                                                Cancel Review
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <Button 
                                                            variant="outline"
                                                            onClick={() => setReviewingOrderId(order.id)}
                                                            className="w-full"
                                                        >
                                                            Leave a Review for Buyer
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Shipping Info */}
                                        <div className="md:w-1/3 bg-gray-50 p-4 rounded-lg h-fit">
                                            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                <FaTruck /> Shipping Details
                                            </h4>
                                            <p className="text-sm text-gray-900 mb-2">{typeof (order as any).shippingAddress === 'object' ? `${((order as any).shippingAddress as any).addressLine1 || ''}, ${((order as any).shippingAddress as any).city || ''}` : String((order as any).shippingAddress || 'No Address')}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
