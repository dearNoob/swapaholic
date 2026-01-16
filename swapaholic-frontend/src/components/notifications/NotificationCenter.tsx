'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaBell, FaCheck, FaGavel, FaShoppingBag, FaComment, FaHeart, FaTimes } from 'react-icons/fa';
import { toast } from 'react-toastify';

interface Notification {
    id: string;
    type: 'bid' | 'order' | 'message' | 'system' | 'wishlist';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    link?: string;
    image?: string;
}

interface NotificationCenterProps {
    notifications?: Notification[];
    onMarkAsRead?: (id: string) => void;
    onMarkAllAsRead?: () => void;
    onDelete?: (id: string) => void;
    onEnableDesktopNotifications?: () => void;
}

export default function NotificationCenter({
    notifications = [],
    onMarkAsRead,
    onMarkAllAsRead,
    onDelete,
    onEnableDesktopNotifications
}: NotificationCenterProps) {
    const [filter, setFilter] = useState<'all' | Notification['type']>('all');
    const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    const requestDesktopNotifications = async () => {
        if ('Notification' in window && Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);

            if (permission === 'granted') {
                toast.success('Desktop notifications enabled!');
                onEnableDesktopNotifications?.();

                // Show test notification
                new Notification('Swapaholic', {
                    body: 'You will now receive desktop notifications',
                    icon: '/favicon.ico'
                });
            }
        }
    };

    const getIcon = (type: Notification['type']) => {
        const icons = {
            bid: <FaGavel className="text-yellow-600" />,
            order: <FaShoppingBag className="text-blue-600" />,
            message: <FaComment className="text-indigo-600" />,
            system: <FaBell className="text-gray-600" />,
            wishlist: <FaHeart className="text-red-600" />
        };
        return icons[type];
    };

    const getBgColor = (type: Notification['type']) => {
        const colors = {
            bid: 'bg-yellow-50',
            order: 'bg-blue-50',
            message: 'bg-indigo-50',
            system: 'bg-gray-50',
            wishlist: 'bg-red-50'
        };
        return colors[type];
    };

    const filteredNotifications = filter === 'all'
        ? notifications
        : notifications.filter(n => n.type === filter);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const categories = [
        { key: 'all' as const, label: 'All', count: notifications.length },
        { key: 'bid' as const, label: 'Bids', count: notifications.filter(n => n.type === 'bid').length },
        { key: 'order' as const, label: 'Orders', count: notifications.filter(n => n.type === 'order').length },
        { key: 'message' as const, label: 'Messages', count: notifications.filter(n => n.type === 'message').length },
        { key: 'wishlist' as const, label: 'Wishlist', count: notifications.filter(n => n.type === 'wishlist').length }
    ];

    const formatTime = (date: Date) => {
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="border-b p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
                        {unreadCount > 0 && (
                            <span className="px-2.5 py-0.5 bg-indigo-600 text-white text-sm font-bold rounded-full">
                                {unreadCount}
                            </span>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {notificationPermission !== 'granted' && (
                            <button
                                onClick={requestDesktopNotifications}
                                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                            >
                                <FaBell />
                                Enable Desktop Alerts
                            </button>
                        )}

                        {unreadCount > 0 && (
                            <button
                                onClick={onMarkAllAsRead}
                                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center gap-2"
                            >
                                <FaCheck />
                                Mark All as Read
                            </button>
                        )}
                    </div>
                </div>

                {/* Categories */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {categories.map(category => (
                        <button
                            key={category.key}
                            onClick={() => setFilter(category.key)}
                            className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
                ${filter === category.key
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
              `}
                        >
                            {category.label} ({category.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Notifications List */}
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12">
                        <FaBell className="text-4xl text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-600">No notifications</p>
                    </div>
                ) : (
                    filteredNotifications.map(notification => (
                        <div
                            key={notification.id}
                            className={`
                p-4 hover:bg-gray-50 transition relative
                ${!notification.isRead ? 'bg-indigo-50/30' : ''}
              `}
                        >
                            <div className="flex gap-4">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getBgColor(notification.type)}`}>
                                    {getIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 text-sm">
                                                {notification.title}
                                            </h4>
                                            <p className="text-sm text-gray-600 mt-0.5">
                                                {notification.message}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-2">
                                                {formatTime(notification.timestamp)}
                                            </p>
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-2">
                                            {!notification.isRead && (
                                                <button
                                                    onClick={() => onMarkAsRead?.(notification.id)}
                                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                    title="Mark as read"
                                                >
                                                    <FaCheck />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => {
                                                    onDelete?.(notification.id);
                                                    toast.success('Notification deleted');
                                                }}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete"
                                            >
                                                <FaTimes />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Link */}
                                    {notification.link && (
                                        <Link
                                            href={notification.link}
                                            className="inline-block mt-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                                        >
                                            View Details →
                                        </Link>
                                    )}
                                </div>

                                {/* Unread Indicator */}
                                {!notification.isRead && (
                                    <div className="absolute top-4 right-4 w-2 h-2 bg-indigo-600 rounded-full" />
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
