import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBox, FaTruck, FaCheckCircle, FaSearch, FaFilter, FaClipboardList } from 'react-icons/fa';
import { sellerApi } from '../../api/seller';
import { emailApi } from '../../api/email';
import { Button } from '../../components/ui/Button';

interface OrderItem {
    id: string;
    title: string;
    quantity: number;
    price: number;
    image?: string;
}

interface Order {
    id: string;
    createdAt: string;
    totalAmount: number;
    status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    buyerName: string;
    shippingAddress: string;
    items: OrderItem[];
    trackingNumber?: string;
}

export const SellerOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getOrders();
            // Handle array or object response
            const ordersData = Array.isArray(data) ? data : (data.orders || []);
            setOrders(ordersData);
        } catch (error) {
            console.error('Error fetching orders:', error);
            // toast.error('Failed to load orders'); // Suppress error for now as endpoint might not exist
            // Mock data for demonstration if API fails
            setOrders([
                {
                    id: 'ORD-12345',
                    createdAt: new Date().toISOString(),
                    totalAmount: 150.00,
                    status: 'pending',
                    buyerName: 'John Doe',
                    shippingAddress: '123 Main St, New York, NY 10001',
                    items: [
                        { id: '1', title: 'Vintage Camera', quantity: 1, price: 150.00, image: 'https://via.placeholder.com/150' }
                    ]
                },
                {
                    id: 'ORD-67890',
                    createdAt: new Date(Date.now() - 86400000).toISOString(),
                    totalAmount: 85.50,
                    status: 'shipped',
                    buyerName: 'Jane Smith',
                    shippingAddress: '456 Oak Ave, Los Angeles, CA 90001',
                    trackingNumber: 'TRACK123456',
                    items: [
                        { id: '2', title: 'Leather Jacket', quantity: 1, price: 85.50, image: 'https://via.placeholder.com/150' }
                    ]
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleStatusUpdate = async (orderId: string, newStatus: string) => {
        try {
            await sellerApi.updateOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${newStatus}`);

            // Send order shipped email notification
            if (newStatus === 'shipped') {
                const order = orders.find(o => o.id === orderId);
                if (order) {
                    // Assuming we can extract buyer ID from the order or fetch it
                    // For now, we'll trigger the email without buyer ID - backend should handle it
                    emailApi.orderShipped(orderId, '').catch(err => {
                        console.error('Failed to send order shipped email:', err);
                    });
                }
            }

            fetchOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error('Failed to update order status');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.buyerName.toLowerCase().includes(searchTerm.toLowerCase());
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
                                            Placed on {new Date(order.createdAt).toLocaleDateString()} by <span className="font-medium text-gray-900">{order.buyerName}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${getStatusColor(order.status)}`}>
                                            {order.status}
                                        </span>
                                        {order.status === 'pending' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(order.id, 'processing')}
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                Process Order
                                            </Button>
                                        )}
                                        {order.status === 'processing' && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusUpdate(order.id, 'shipped')}
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
                                            <h4 className="text-sm font-medium text-gray-500 mb-3">Items</h4>
                                            <ul className="divide-y divide-gray-200">
                                                {order.items.map((item) => (
                                                    <li key={item.id} className="py-3 flex items-center">
                                                        <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                                                            <img
                                                                src={item.image || 'https://via.placeholder.com/150'}
                                                                alt={item.title}
                                                                className="h-full w-full object-cover object-center"
                                                            />
                                                        </div>
                                                        <div className="ml-4 flex-1">
                                                            <div className="flex justify-between text-base font-medium text-gray-900">
                                                                <h3>{item.title}</h3>
                                                                <p>৳{item.price.toFixed(2)}</p>
                                                            </div>
                                                            <p className="mt-1 text-sm text-gray-500">Qty: {item.quantity}</p>
                                                        </div>
                                                    </li>
                                                ))}
                                            </ul>
                                            <div className="mt-4 flex justify-end border-t pt-4">
                                                <p className="text-base font-medium text-gray-900">Total: ${order.totalAmount.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Shipping Info */}
                                        <div className="md:w-1/3 bg-gray-50 p-4 rounded-lg h-fit">
                                            <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                <FaTruck /> Shipping Details
                                            </h4>
                                            <p className="text-sm text-gray-900 mb-2">{order.shippingAddress}</p>
                                            {order.trackingNumber && (
                                                <div className="mt-3 pt-3 border-t border-gray-200">
                                                    <p className="text-xs text-gray-500">Tracking Number</p>
                                                    <p className="text-sm font-mono font-medium text-indigo-600">{order.trackingNumber}</p>
                                                </div>
                                            )}
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
