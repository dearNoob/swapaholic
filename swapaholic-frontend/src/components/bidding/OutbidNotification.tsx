'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaGavel, FaTimes, FaBell } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface OutbidNotification {
    id: string;
    productId: string;
    productName: string;
    productImage?: string;
    yourBid: number;
    currentBid: number;
    newBidder: string;
    timestamp: Date;
}

interface OutbidNotificationAlertProps {
    notification: OutbidNotification;
    onDismiss: () => void;
    onQuickRebid?: () => void;
}

export function OutbidNotificationAlert({ notification, onDismiss, onQuickRebid }: OutbidNotificationAlertProps) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Auto-dismiss after 10 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onDismiss, 300); // Wait for fade animation
        }, 10000);

        return () => clearTimeout(timer);
    }, [onDismiss]);

    if (!isVisible) return null;

    return (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right max-w-sm">
            <div className="bg-white rounded-lg shadow-2xl border-2 border-orange-500 overflow-hidden">
                {/* Header */}
                <div className="bg-linear-to-r from-orange-500 to-red-500 p-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                            <FaGavel className="text-xl" />
                        </div>
                        <div>
                            <h4 className="font-bold">You've Been Outbid!</h4>
                            <p className="text-xs opacity-90">Act fast to stay in the lead</p>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            setIsVisible(false);
                            setTimeout(onDismiss, 300);
                        }}
                        className="p-2 hover:bg-white/20 rounded-lg transition"
                    >
                        <FaTimes />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <div className="flex gap-3 mb-4">
                        {notification.productImage && (
                            <img
                                src={notification.productImage}
                                alt={notification.productName}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                            />
                        )}
                        <div className="flex-1 min-w-0">
                            <h5 className="font-semibold text-gray-900 truncate">{notification.productName}</h5>
                            <div className="text-sm text-gray-600 mt-1">
                                <p>Your bid: <span className="font-medium">09f3{notification.yourBid}</span></p>
                                <p>New bid: <span className="font-bold text-orange-600">09f3{notification.currentBid}</span></p>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                        <Link
                            href={`/products/${notification.productId}`}
                            className="flex-1 py-2 px-3 bg-orange-600 text-white text-center rounded-lg font-semibold hover:bg-orange-700 transition text-sm"
                        >
                            Place New Bid
                        </Link>
                        {onQuickRebid && (
                            <button
                                onClick={onQuickRebid}
                                className="py-2 px-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition text-sm"
                            >
                                Quick +৳5
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Notification Manager Component
export function OutbidNotificationManager() {
    const [notifications, setNotifications] = useState<OutbidNotification[]>([]);

    useEffect(() => {
        // Listen for socket events (mock for now)
        const handleOutbid = (data: OutbidNotification) => {
            setNotifications(prev => [...prev, data]);

            // Also show toast
            toast.warn(`You've been outbid on "${data.productName}"!`, {
                icon: <FaGavel className="text-orange-600" />
            });
        };

        // TODO: Connect to actual socket service
        // socketService.on('outbid', handleOutbid);

        return () => {
            // socketService.off('outbid', handleOutbid);
        };
    }, []);

    const handleDismiss = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    return (
        <>
            {notifications.map((notification, index) => (
                <div
                    key={notification.id}
                    style={{ top: `${4 + index * 200}px` }}
                    className="fixed right-4 z-50"
                >
                    <OutbidNotificationAlert
                        notification={notification}
                        onDismiss={() => handleDismiss(notification.id)}
                    />
                </div>
            ))}
        </>
    );
}

export default OutbidNotificationManager;
