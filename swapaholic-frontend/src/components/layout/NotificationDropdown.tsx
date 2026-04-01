'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaBell, FaDollarSign, FaTruck, FaGavel, FaExclamation, FaCheckCircle } from 'react-icons/fa';
import { useAppSelector } from '../../store/hooks';
import { socketService } from '../../utils/socket';
import { notificationApi, Notification } from '../../api/notifications';
import { toast } from 'react-toastify';

export default function NotificationDropdown() {
    const { user } = useAppSelector((state) => state.auth);
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // Fetch notifications
    useEffect(() => {
        if (user && isOpen) {
            fetchNotifications();
        }
    }, [user, isOpen]);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const data = await notificationApi.getAll();
            const notificationsList = Array.isArray(data) ? data : (data.notifications || []);
            setNotifications(notificationsList.slice(0, 5)); // Show only latest 5 in dropdown
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscape);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen]);

    // Listen for real-time notifications
    useEffect(() => {
        if (!user?.id) return;

        const handleNewNotification = (data: any) => {
            const newNotification: Notification = {
                id: data.id || Date.now().toString(),
                title: data.title || 'New Notification',
                message: data.message || '',
                type: data.type || 'system',
                isRead: false,
                createdAt: new Date().toISOString(),
                metadata: data.metadata,
            };

            setNotifications((prev) => [newNotification, ...prev].slice(0, 5));
            
            if (data.type === 'outbid') {
                toast.warn(data.message || data.title || "You've been outbid!", {
                    icon: <FaGavel className="text-orange-600" />
                });
            } else {
                toast.info(data.title || 'New Notification');
            }
        };

        socketService.on('notification', handleNewNotification);

        return () => {
            socketService.off('notification', handleNewNotification);
        };
    }, [user]);

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications((prev) =>
                prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
            );
        } catch (error) {
            console.error('Error marking notification as read:', error);
            // Update locally even if API fails
            setNotifications((prev) =>
                prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
            );
        }
    };

    const handleMarkAllAsRead = async () => {
        try {
            await notificationApi.markAllAsRead();
            setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
            toast.success('All notifications marked as read');
        } catch (error) {
            console.error('Error marking all as read:', error);
            setNotifications((prev) => prev.map((notif) => ({ ...notif, isRead: true })));
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'bid':
                return <FaGavel className="text-indigo-600" />;
            case 'payment':
                return <FaDollarSign className="text-green-600" />;
            case 'delivery':
                return <FaTruck className="text-blue-600" />;
            case 'dispute':
                return <FaExclamation className="text-red-600" />;
            case 'verification':
                return <FaCheckCircle className="text-green-600" />;
            default:
                return <FaBell className="text-gray-600" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-700 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition"
            >
                <FaBell className="h-5 w-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-linear-to-r from-indigo-50 to-purple-50">
                        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {isLoading ? (
                            <div className="px-4 py-8 text-center">
                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="px-4 py-12 text-center">
                                <FaBell className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                <p className="text-gray-500 text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleMarkAsRead(notif.id)}
                                    className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${!notif.isRead ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0 mt-1 text-xl">
                                            {getNotificationIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {notif.title}
                                            </p>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <p className="text-xs text-gray-400 mt-1">
                                                {getTimeAgo(notif.createdAt)}
                                            </p>
                                        </div>
                                        {!notif.isRead && (
                                            <div className="flex-shrink-0 w-2 h-2 bg-indigo-600 rounded-full mt-2"></div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                        <Link
                            href="/notifications"
                            className="block text-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                            onClick={() => setIsOpen(false)}
                        >
                            View All Notifications →
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
