import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { FaBox, FaCheckCircle, FaExclamationTriangle, FaSearch, FaFilter, FaClipboardList, FaTruck } from 'react-icons/fa';
import { ordersApi } from '../../api/orders';
import { Button } from '../../components/ui/Button';
import { ReviewForm } from '../../components/reviews/ReviewForm';
import { Order } from '../../types/api';

export const BuyerOrders = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [reviewingOrderId, setReviewingOrderId] = useState<string | null>(null);

    const fetchOrders = async () => {
        try {
            setIsLoading(true);
            const data = await ordersApi.getBuyerOrders();
            // Data has an array of orders inside 'data' property due to pagination structure
            setOrders(data.data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
            toast.error('Failed to load your purchases.');
            setOrders([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleConfirmDelivery = async (orderId: string) => {
        if (!window.confirm("Are you sure you want to confirm delivery? This will release the escrow funds to the seller and cannot be undone.")) return;
        
        try {
            await ordersApi.confirmDelivery(orderId);
            toast.success("Delivery confirmed! Funds released to seller.");
            fetchOrders();
        } catch (error: any) {
            console.error('Error confirming delivery:', error);
            toast.error(error.response?.data?.message || 'Failed to confirm delivery');
        }
    };

    const handleReportIssue = async (orderId: string) => {
        const reason = window.prompt("Briefly describe the issue (e.g., Damaged, Not as described):");
        if (!reason) return;

        try {
            await ordersApi.fileDispute(orderId, reason, "Buyer reported an issue from the Action Board.");
            toast.success("Dispute filed. Admin will review the issue.");
            fetchOrders();
        } catch (error: any) {
            console.error('Error reporting issue:', error);
            toast.error(error.response?.data?.message || 'Failed to report issue');
        }
    };

    const filteredOrders = orders.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'qc_pending': return 'bg-orange-100 text-orange-800';
            case 'qc_approved': return 'bg-teal-100 text-teal-800';
            case 'in_delivery': return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
            case 'completed': return 'bg-green-100 text-green-800 font-bold';
            case 'disputed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-200 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'in_delivery': return 'Shipped (In Transit)';
            case 'qc_pending': return 'QC Verification';
            case 'qc_approved': return 'Ready to Ship';
            default: return status.charAt(0).toUpperCase() + status.slice(1);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                            My Purchases
                        </h2>
                        <p className="mt-1 text-lg text-gray-500">
                            Track your orders, confirm delivery, and manage escrow payments.
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
                            placeholder="Search by Order ID..."
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
                            <option value="all">All Orders</option>
                            <option value="pending">Pending</option>
                            <option value="in_delivery">Shipped (In Transit)</option>
                            <option value="completed">Completed</option>
                            <option value="disputed">Disputed</option>
                        </select>
                    </div>
                </div>

                {/* Orders List */}
                <div className="space-y-6">
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            <p className="mt-2 text-gray-500">Loading purchases...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-lg shadow">
                            <FaBox className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">No purchases found</h3>
                            <p className="mt-1 text-sm text-gray-500">
                                {searchTerm || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'You haven\'t bought anything yet.'}
                            </p>
                        </div>
                    ) : (
                        filteredOrders.map((order) => (
                            <div key={order.id} className="bg-white shadow rounded-lg overflow-hidden border border-gray-200 hover:shadow-md transition-shadow">
                                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div>
                                        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center gap-2">
                                            Order #{order.id}
                                        </h3>
                                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                                            Purchased on {new Date(order.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1.5 rounded-full text-sm font-medium uppercase tracking-wide flex items-center gap-1.5 ${getStatusColor(order.status)}`}>
                                            {order.status === 'in_delivery' && <FaTruck />}
                                            {order.status === 'completed' && <FaCheckCircle />}
                                            {order.status === 'disputed' && <FaExclamationTriangle />}
                                            {getStatusLabel(order.status)}
                                        </span>
                                    </div>
                                </div>
                                <div className="px-4 py-5 sm:p-6">
                                    <div className="flex flex-col md:flex-row justify-between gap-6 items-center">
                                        {/* Order Info */}
                                        <div className="flex-1">
                                            <p className="text-sm text-gray-500">Total Amount</p>
                                            <p className="text-2xl font-bold text-gray-900">৳{order.totalAmount.toFixed(2)}</p>
                                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                                <FaCheckCircle /> Payment secure in Escrow
                                            </p>
                                        </div>

                                        {/* Escrow Actions */}
                                        <div className="flex flex-col gap-2 w-full md:w-auto">
                                            {order.status === 'in_delivery' && (
                                                <>
                                                    <Button
                                                        onClick={() => handleConfirmDelivery(order.id)}
                                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 shadow-md flex items-center justify-center gap-2"
                                                    >
                                                        <FaCheckCircle className="text-lg" /> Confirm Delivery
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => handleReportIssue(order.id)}
                                                        className="w-full border-red-200 text-red-600 hover:bg-red-50 flex items-center justify-center gap-2"
                                                    >
                                                        <FaExclamationTriangle /> Report Issue
                                                    </Button>
                                                </>
                                            )}

                                            {order.status === 'completed' && (
                                                <div className="flex flex-col gap-2 w-full">
                                                    <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-md text-sm text-center">
                                                        Order completed. Escrow released to seller.
                                                    </div>
                                                    
                                                    {reviewingOrderId === order.id ? (
                                                        <div className="mt-4 animate-fadeIn">
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
                                                            variant="primary"
                                                            onClick={() => setReviewingOrderId(order.id)}
                                                            className="w-full mt-2"
                                                        >
                                                            Leave a Review
                                                        </Button>
                                                    )}
                                                </div>
                                            )}

                                            {order.status === 'disputed' && (
                                                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-md text-sm text-center">
                                                    Order under review by Admin.
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
