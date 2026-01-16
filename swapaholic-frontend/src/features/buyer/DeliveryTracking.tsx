import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { deliveryApi } from '../../api/delivery';
import { socketService } from '../../utils/socket';
import { Button } from '../../components/ui/Button';

interface Delivery {
    id: string;
    orderId: string;
    productTitle: string;
    status: string;
    pickupAddress: string;
    deliveryAddress: string;
    estimatedDelivery: string;
    trackingNumber: string;
    deliveryPersonnel?: {
        name: string;
        phone: string;
    };
    statusHistory: Array<{
        status: string;
        timestamp: string;
        location?: string;
    }>;
}

export const DeliveryTracking = () => {
    const [deliveries, setDeliveries] = useState<Delivery[]>([]);
    const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        fetchDeliveries();

        // Socket.IO listeners for real-time updates
        socketService.on('delivery_status_updated', handleDeliveryUpdate);

        return () => {
            socketService.off('delivery_status_updated');
        };
    }, []);

    const fetchDeliveries = async () => {
        setIsLoading(true);
        try {
            const data = await deliveryApi.getActiveDeliveries();
            setDeliveries(data);
        } catch (error: any) {
            toast.error('Failed to fetch deliveries');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeliveryUpdate = (update: any) => {
        setDeliveries(prev =>
            prev.map(d => (d.id === update.deliveryId ? { ...d, ...update } : d))
        );
        if (selectedDelivery?.id === update.deliveryId) {
            setSelectedDelivery(prev => prev ? { ...prev, ...update } : null);
        }
        toast.info(`Delivery status updated: ${update.status}`);
    };

    const handleConfirmDelivery = async (orderId: string) => {
        setConfirming(true);
        try {
            await deliveryApi.confirmDelivery(orderId);
            toast.success('Delivery confirmed successfully!');
            fetchDeliveries();
            setSelectedDelivery(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to confirm delivery');
        } finally {
            setConfirming(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'delivered':
                return 'bg-green-100 text-green-800';
            case 'in_transit':
                return 'bg-blue-100 text-blue-800';
            case 'picked_up':
                return 'bg-yellow-100 text-yellow-800';
            case 'pending':
                return 'bg-gray-100 text-gray-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">My Deliveries</h1>

            {deliveries.length === 0 ? (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No active deliveries</h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Your deliveries will appear here once your purchases are shipped.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Deliveries List */}
                    <div className="space-y-4">
                        {deliveries.map((delivery) => (
                            <div
                                key={delivery.id}
                                className={`bg-white shadow rounded-lg p-4 cursor-pointer hover:shadow-lg transition-shadow ${selectedDelivery?.id === delivery.id ? 'ring-2 ring-blue-500' : ''
                                    }`}
                                onClick={() => setSelectedDelivery(delivery)}
                            >
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-gray-900">{delivery.productTitle}</h3>
                                        <p className="text-sm text-gray-500">Tracking: {delivery.trackingNumber}</p>
                                    </div>
                                    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(delivery.status)}`}>
                                        {delivery.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                                <div className="mt-3 text-sm text-gray-600">
                                    <p>To: {delivery.deliveryAddress}</p>
                                    {delivery.estimatedDelivery && (
                                        <p className="mt-1">Est. Delivery: {new Date(delivery.estimatedDelivery).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Delivery Details */}
                    {selectedDelivery && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">Delivery Details</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Product</h3>
                                    <p className="mt-1 text-base text-gray-900">{selectedDelivery.productTitle}</p>
                                </div>

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Tracking Number</h3>
                                    <p className="mt-1 text-base font-mono text-gray-900">{selectedDelivery.trackingNumber}</p>
                                </div>

                                {selectedDelivery.deliveryPersonnel && (
                                    <div>
                                        <h3 className="text-sm font-medium text-gray-500">Delivery Personnel</h3>
                                        <p className="mt-1 text-base text-gray-900">{selectedDelivery.deliveryPersonnel.name}</p>
                                        <p className="text-sm text-gray-600">{selectedDelivery.deliveryPersonnel.phone}</p>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-medium text-gray-500">Delivery Address</h3>
                                    <p className="mt-1 text-base text-gray-900">{selectedDelivery.deliveryAddress}</p>
                                </div>

                                {/* Status Timeline */}
                                <div>
                                    <h3 className="text-sm font-medium text-gray-500 mb-3">Delivery Timeline</h3>
                                    <div className="flow-root">
                                        <ul className="-mb-8">
                                            {selectedDelivery.statusHistory.map((event, idx) => (
                                                <li key={idx}>
                                                    <div className="relative pb-8">
                                                        {idx !== selectedDelivery.statusHistory.length - 1 && (
                                                            <span
                                                                className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                        <div className="relative flex space-x-3">
                                                            <div>
                                                                <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                                                    <svg className="h-5 w-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                                    </svg>
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">
                                                                        {event.status.replace('_', ' ').toUpperCase()}
                                                                    </p>
                                                                    <p className="mt-0.5 text-sm text-gray-500">
                                                                        {new Date(event.timestamp).toLocaleString()}
                                                                    </p>
                                                                    {event.location && (
                                                                        <p className="mt-0.5 text-xs text-gray-400">{event.location}</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                {selectedDelivery.status.toLowerCase() === 'delivered' && (
                                    <div className="pt-4 border-t">
                                        <Button
                                            fullWidth
                                            onClick={() => handleConfirmDelivery(selectedDelivery.orderId)}
                                            isLoading={confirming}
                                        >
                                            Confirm Delivery Received
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
