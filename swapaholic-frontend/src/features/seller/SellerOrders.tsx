import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBox, FaTruck, FaSearch, FaFilter, FaClipboardList } from 'react-icons/fa';
import { sellerApi } from '../../api/seller';
import { Button } from '../../components/ui/Button';
import { ReviewForm } from '../../components/reviews/ReviewForm';
import { handleApiError } from '../../utils/errorHandler';
import { Order } from '../../types/api';

type SellerOrderStatus = Order['status'] | 'awaiting_confirmation';
type UpdatableSellerOrderStatus = 'qc_pending' | 'in_delivery';

interface SellerOrderProduct {
    title: string;
    image: string;
    price: number;
}

interface SellerOrderBuyer {
    id?: string;
    name: string;
    image?: string;
}

interface SellerShippingAddress {
    addressLine1?: string;
    address?: string;
    city?: string;
    state?: string;
    district?: string;
    area?: string;
    postalCode?: string;
    zipCode?: string;
}

interface SellerOrder {
    id: string;
    product: SellerOrderProduct;
    buyer: SellerOrderBuyer;
    amount: number;
    status: SellerOrderStatus;
    date: string;
    shippingAddress?: string | SellerShippingAddress | null;
}

interface SellerOrdersResponse {
    orders?: SellerOrder[];
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

const statusOptions: Array<{ value: 'all' | SellerOrderStatus; label: string }> = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'awaiting_confirmation', label: 'Awaiting Confirmation' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'qc_pending', label: 'QC Pending' },
    { value: 'qc_approved', label: 'QC Approved' },
    { value: 'in_delivery', label: 'In Delivery' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'completed', label: 'Completed' },
    { value: 'disputed', label: 'Disputed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const getStatusMeta = (status: SellerOrderStatus) => {
    switch (status) {
        case 'pending':
            return { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' };
        case 'awaiting_confirmation':
            return { label: 'Awaiting Confirmation', className: 'bg-orange-100 text-orange-800' };
        case 'confirmed':
            return { label: 'Confirmed', className: 'bg-sky-100 text-sky-800' };
        case 'qc_pending':
            return { label: 'QC Pending', className: 'bg-blue-100 text-blue-800' };
        case 'qc_approved':
            return { label: 'QC Approved', className: 'bg-indigo-100 text-indigo-800' };
        case 'in_delivery':
            return { label: 'In Delivery', className: 'bg-violet-100 text-violet-800' };
        case 'delivered':
            return { label: 'Delivered', className: 'bg-green-100 text-green-800' };
        case 'completed':
            return { label: 'Completed', className: 'bg-emerald-100 text-emerald-800' };
        case 'disputed':
            return { label: 'Disputed', className: 'bg-rose-100 text-rose-800' };
        case 'cancelled':
            return { label: 'Cancelled', className: 'bg-red-100 text-red-800' };
        default:
            return { label: status, className: 'bg-gray-100 text-gray-800' };
    }
};

const formatShippingAddress = (shippingAddress?: string | SellerShippingAddress | null) => {
    if (!shippingAddress) {
        return 'No address';
    }

    if (typeof shippingAddress === 'string') {
        return shippingAddress;
    }

    return [
        shippingAddress.addressLine1,
        shippingAddress.address,
        shippingAddress.area,
        shippingAddress.city,
        shippingAddress.district,
        shippingAddress.state,
        shippingAddress.postalCode,
        shippingAddress.zipCode,
    ]
        .filter(Boolean)
        .join(', ') || 'No address';
};

export const SellerOrders = () => {
    const [orders, setOrders] = useState<SellerOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | SellerOrderStatus>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const data = await sellerApi.getOrders() as SellerOrdersResponse;
            setOrders(Array.isArray(data.orders) ? data.orders : []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error(handleApiError(error));
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchOrders();
    }, []);

    const handleStatusUpdate = async (orderId: string, newStatus: UpdatableSellerOrderStatus) => {
        if (!window.confirm(`Are you sure you want to mark this order as ${getStatusMeta(newStatus).label}?`)) {
            return;
        }

        try {
            await sellerApi.updateOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${getStatusMeta(newStatus).label}`);

            await fetchOrders();
        } catch (error) {
            console.error('Error updating order status:', error);
            toast.error(handleApiError(error));
        }
    };

    const filteredOrders = orders.filter((order) => {
        const matchesSearch =
            order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.buyer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.product.title.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

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

                <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-96">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FaSearch className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Order ID, Buyer Name, or Product..."
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <FaFilter className="text-gray-400" />
                        <select
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                            value={filterStatus}
                            onChange={(event) => setFilterStatus(event.target.value as 'all' | SellerOrderStatus)}
                        >
                            {statusOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

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
                                {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'You haven&apos;t received any orders yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => {
                            const statusMeta = getStatusMeta(order.status);

                            return (
                                <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
                                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                        <div>
                                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                                Order #{order.id}
                                            </h3>
                                            <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                                Placed on {new Date(order.date).toLocaleDateString()} by <span className="font-medium text-gray-900">{order.buyer.name}</span>
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wide ${statusMeta.className}`}>
                                                {statusMeta.label}
                                            </span>
                                            {(order.status === 'pending' || order.status === 'confirmed') && (
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
                                            <div className="flex-1">
                                                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                    <FaBox /> Product Details
                                                </h4>
                                                <div className="bg-white p-4 rounded-md border border-gray-100">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <p className="text-base font-medium text-gray-900">{order.product.title}</p>
                                                            <p className="mt-1 text-sm text-gray-500">Buyer: {order.buyer.name}</p>
                                                            <p className="mt-1 text-sm text-gray-500">Item Price: ৳{order.product.price.toFixed(2)}</p>
                                                        </div>
                                                        <p className="text-lg font-bold text-indigo-600">৳{order.amount.toFixed(2)}</p>
                                                    </div>
                                                </div>

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
                                                    <p className="text-base font-bold text-gray-900 ml-auto flex items-center gap-2">
                                                        Total Value: <span className="text-xl">৳{order.amount.toFixed(2)}</span>
                                                    </p>
                                                </div>

                                                {order.status === 'completed' && (
                                                    <div className="mt-4 border-t pt-4">
                                                        {reviewingOrderId === order.id ? (
                                                            <div className="animate-fadeIn">
                                                                <h4 className="text-sm font-medium text-gray-900 mb-2">Rate the Buyer</h4>
                                                                <ReviewForm
                                                                    orderId={order.id}
                                                                    onSuccess={() => {
                                                                        setReviewingOrderId(null);
                                                                        toast.success('Thank you for your review!');
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

                                            <div className="md:w-1/3 bg-gray-50 p-4 rounded-lg h-fit">
                                                <h4 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                                                    <FaTruck /> Shipping Details
                                                </h4>
                                                <p className="text-sm text-gray-900 mb-2">{formatShippingAddress(order.shippingAddress)}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
