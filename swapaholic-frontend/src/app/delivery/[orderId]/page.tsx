'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FaTruck, FaMapMarkerAlt, FaCheckCircle, FaClock, FaBox, FaHome, FaImage } from 'react-icons/fa';
import { deliveryApi } from '../../../api/delivery';
import { Button } from '../../../components/ui/Button';
import { toast } from 'react-toastify';

interface DeliveryStatus {
    status: 'pending' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered';
    timestamp: string;
    location?: string;
    message?: string;
}

interface Delivery {
    id: string;
    orderId: string;
    trackingNumber: string;
    currentStatus: DeliveryStatus['status'];
    estimatedDelivery: string;
    statusHistory: DeliveryStatus[];
    currentLocation?: {
        lat: number;
        lng: number;
        address: string;
    };
    deliveryProof?: {
        image: string;
        timestamp: string;
        receivedBy: string;
    };
    product: {
        title: string;
        image: string;
    };
    seller: {
        name: string;
        phone: string;
    };
    buyer: {
        name: string;
        address: string;
        phone: string;
    };
}

export default function DeliveryTracking() {
    const params = useParams();
    const orderId = params.orderId as string;

    const [delivery, setDelivery] = useState<Delivery | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [proofFile, setProofFile] = useState<File | null>(null);
    const [uploadingProof, setUploadingProof] = useState(false);

    useEffect(() => {
        fetchDelivery();
    }, [orderId]);

    const fetchDelivery = async () => {
        try {
            setIsLoading(true);
            const data = await deliveryApi.getDeliveryById(orderId);
            setDelivery(data);
        } catch (error) {
            console.error('Error fetching delivery:', error);
            // Mock data for demonstration
            setDelivery({
                id: orderId,
                orderId: orderId,
                trackingNumber: 'SWAP' + Math.random().toString(36).substring(2, 10).toUpperCase(),
                currentStatus: 'in_transit',
                estimatedDelivery: new Date(Date.now() + 86400000 * 2).toISOString(),
                statusHistory: [
                    {
                        status: 'pending',
                        timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
                        message: 'Order confirmed and packaged',
                    },
                    {
                        status: 'picked_up',
                        timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
                        location: 'Seller Location',
                        message: 'Package picked up by courier',
                    },
                    {
                        status: 'in_transit',
                        timestamp: new Date(Date.now() - 86400000).toISOString(),
                        location: 'Distribution Center',
                        message: 'Package in transit',
                    },
                ],
                currentLocation: {
                    lat: 23.8103,
                    lng: 90.4125,
                    address: 'Distribution Center, Dhaka',
                },
                product: {
                    title: 'Vintage Canon AE-1 Camera',
                    image: 'https://via.placeholder.com/150',
                },
                seller: {
                    name: 'John Seller',
                    phone: '+880 1234-567890',
                },
                buyer: {
                    name: 'Current User',
                    address: '123 Main Street, Dhaka 1000',
                    phone: '+880 1987-654321',
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleConfirmDelivery = async () => {
        if (!proofFile) {
            toast.error('Please upload delivery proof');
            return;
        }

        try {
            setUploadingProof(true);
            await deliveryApi.confirmDelivery(orderId, proofFile);
            toast.success('Delivery confirmed successfully!');
            fetchDelivery();
        } catch (error) {
            console.error('Error confirming delivery:', error);
            toast.error('Failed to confirm delivery');
        } finally {
            setUploadingProof(false);
        }
    };

    const getStatusIcon = (status: DeliveryStatus['status']) => {
        switch (status) {
            case 'pending':
                return <FaBox className="text-gray-400" />;
            case 'picked_up':
                return <FaTruck className="text-blue-500" />;
            case 'in_transit':
                return <FaTruck className="text-indigo-500" />;
            case 'out_for_delivery':
                return <FaTruck className="text-orange-500" />;
            case 'delivered':
                return <FaCheckCircle className="text-green-500" />;
            default:
                return <FaClock className="text-gray-400" />;
        }
    };

    const getStatusLabel = (status: DeliveryStatus['status']) => {
        const labels = {
            pending: 'Order Confirmed',
            picked_up: 'Picked Up',
            in_transit: 'In Transit',
            out_for_delivery: 'Out for Delivery',
            delivered: 'Delivered',
        };
        return labels[status] || status;
    };

    const isStatusComplete = (status: DeliveryStatus['status']) => {
        if (!delivery) return false;
        const statusOrder = ['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'];
        const currentIndex = statusOrder.indexOf(delivery.currentStatus);
        const targetIndex = statusOrder.indexOf(status);
        return targetIndex <= currentIndex;
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading delivery information...</p>
                </div>
            </div>
        );
    }

    if (!delivery) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Delivery not found</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Track Your Delivery</h1>
                    <p className="text-lg text-gray-600">
                        Tracking Number: <span className="font-semibold">{delivery.trackingNumber}</span>
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Current Status Card */}
                        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-indigo-500">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">
                                    {getStatusIcon(delivery.currentStatus)}
                                </div>
                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        {getStatusLabel(delivery.currentStatus)}
                                    </h2>
                                    <p className="text-gray-600 mt-1">
                                        Estimated Delivery: {new Date(delivery.estimatedDelivery).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                        })}
                                    </p>
                                </div>
                            </div>

                            {delivery.currentLocation && (
                                <div className="mt-4 pt-4 border-t border-gray-200">
                                    <div className="flex items-start gap-2 text-gray-700">
                                        <FaMapMarkerAlt className="text-red-500 mt-1" />
                                        <div>
                                            <p className="font-medium">Current Location</p>
                                            <p className="text-sm">{delivery.currentLocation.address}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Status Timeline */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Delivery Timeline</h3>

                            <div className="relative">
                                {/* Vertical line */}
                                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                                {/* Timeline items */}
                                <div className="space-y-6">
                                    {(['pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered'] as DeliveryStatus['status'][]).map((status, index) => {
                                        const historyItem = delivery.statusHistory.find(h => h.status === status);
                                        const isComplete = isStatusComplete(status);
                                        const isCurrent = delivery.currentStatus === status;

                                        return (
                                            <div key={status} className="relative flex gap-4">
                                                {/* Icon */}
                                                <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 ${isComplete
                                                    ? 'bg-indigo-500 border-indigo-500'
                                                    : 'bg-white border-gray-300'
                                                    }`}>
                                                    <div className={`text-lg ${isComplete ? 'text-white' : 'text-gray-400'}`}>
                                                        {getStatusIcon(status)}
                                                    </div>
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 pb-6">
                                                    <div className={`font-semibold ${isCurrent ? 'text-indigo-600' : isComplete ? 'text-gray-900' : 'text-gray-400'}`}>
                                                        {getStatusLabel(status)}
                                                    </div>
                                                    {historyItem && (
                                                        <>
                                                            <div className="text-sm text-gray-600 mt-1">
                                                                {new Date(historyItem.timestamp).toLocaleString()}
                                                            </div>
                                                            {historyItem.message && (
                                                                <div className="text-sm text-gray-700 mt-1">
                                                                    {historyItem.message}
                                                                </div>
                                                            )}
                                                            {historyItem.location && (
                                                                <div className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                                                    <FaMapMarkerAlt className="text-xs" />
                                                                    {historyItem.location}
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Delivery Proof */}
                        {delivery.currentStatus === 'delivered' && delivery.deliveryProof && (
                            <div className="bg-white rounded-lg shadow-md p-6">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Delivery Proof</h3>
                                <div className="space-y-3">
                                    <img
                                        src={delivery.deliveryProof.image}
                                        alt="Delivery Proof"
                                        className="w-full max-w-md rounded-lg border border-gray-200"
                                    />
                                    <p className="text-sm text-gray-600">
                                        Received by: <span className="font-medium">{delivery.deliveryProof.receivedBy}</span>
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        {new Date(delivery.deliveryProof.timestamp).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Confirm Delivery */}
                        {delivery.currentStatus === 'out_for_delivery' && (
                            <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
                                <h3 className="text-xl font-bold text-gray-900 mb-4">Confirm Delivery</h3>
                                <p className="text-gray-600 mb-4">
                                    Once you receive your package, please upload a photo as proof of delivery.
                                </p>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Upload Photo
                                        </label>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleConfirmDelivery}
                                        isLoading={uploadingProof}
                                        disabled={!proofFile || uploadingProof}
                                        className="flex items-center gap-2"
                                    >
                                        <FaCheckCircle /> Confirm Delivery
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Product Info */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Product</h3>
                            <div className="flex items-center gap-3">
                                <img
                                    src={delivery.product.image}
                                    alt={delivery.product.title}
                                    className="w-16 h-16 object-cover rounded border border-gray-200"
                                />
                                <p className="text-sm font-medium text-gray-900">{delivery.product.title}</p>
                            </div>
                        </div>

                        {/* Seller Info */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Seller</h3>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-gray-900">{delivery.seller.name}</p>
                                <p className="text-gray-600">{delivery.seller.phone}</p>
                            </div>
                        </div>

                        {/* Delivery Address */}
                        <div className="bg-white rounded-lg shadow-md p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <FaHome className="text-indigo-600" /> Delivery Address
                            </h3>
                            <div className="space-y-2 text-sm">
                                <p className="font-medium text-gray-900">{delivery.buyer.name}</p>
                                <p className="text-gray-700">{delivery.buyer.address}</p>
                                <p className="text-gray-600">{delivery.buyer.phone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
