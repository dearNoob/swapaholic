import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useAppSelector } from '../../store/hooks';
import { FaBell, FaDollarSign, FaTruck, FaGavel, FaExclamation, FaCheckCircle, FaFilter, FaTrash, FaCheck } from 'react-icons/fa';
import { notificationApi, Notification, normalizeNotificationPayload } from '../../api/notifications';
import { socketService } from '../../utils/socket';
import { Button } from '../../components/ui/Button';

export const Notifications = () => {
    const { user, accessToken, isAuthenticated, isLoading: isAuthLoading } = useAppSelector((state) => state.auth);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'unread' | Notification['type']>('all');

    useEffect(() => {
        if (!isAuthenticated || isAuthLoading || !accessToken) {
            return;
        }

        void fetchNotifications();
    }, [accessToken, isAuthLoading, isAuthenticated]);

    // Listen for real-time notifications
    useEffect(() => {
        if (!user?.id || !accessToken || isAuthLoading || !isAuthenticated) return;

        const handleNewNotification = (data: unknown) => {
            const newNotification: Notification = normalizeNotificationPayload(data);

            setNotifications((prev) => [newNotification, ...prev]);
        };

        socketService.on('notification', handleNewNotification);

        return () => {
            socketService.off('notification', handleNewNotification);
        };
    }, [user, accessToken, isAuthLoading, isAuthenticated]);

    const fetchNotifications = async () => {
        try {
            setIsLoading(true);
            const data = await notificationApi.getAll();
            const notificationsList = Array.isArray(data) ? data : (data.notifications || []);
            setNotifications(notificationsList);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            toast.error('Failed to load notifications');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMarkAsRead = async (id: string) => {
        try {
            await notificationApi.markAsRead(id);
            setNotifications((prev) =>
                prev.map((notif) => (notif.id === id ? { ...notif, isRead: true } : notif))
            );
        } catch (error) {
            console.error('Error marking as read:', error);
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
            toast.error('Failed to mark all as read');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this notification?')) return;

        try {
            await notificationApi.delete(id);
            setNotifications((prev) => prev.filter((notif) => notif.id !== id));
            toast.success('Notification deleted');
        } catch (error) {
            console.error('Error deleting notification:', error);
            toast.error('Failed to delete notification');
        }
    };

    const getTimeAgo = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'bid':
                return <FaGavel className="text-2xl text-indigo-600" />;
            case 'payment':
                return <FaDollarSign className="text-2xl text-green-600" />;
            case 'delivery':
                return <FaTruck className="text-2xl text-blue-600" />;
            case 'dispute':
                return <FaExclamation className="text-2xl text-red-600" />;
            case 'verification':
                return <FaCheckCircle className="text-2xl text-green-600" />;
            default:
                return <FaBell className="text-2xl text-gray-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'bid':
                return 'bg-indigo-100 text-indigo-800';
            case 'payment':
                return 'bg-green-100 text-green-800';
            case 'delivery':
                return 'bg-blue-100 text-blue-800';
            case 'dispute':
                return 'bg-red-100 text-red-800';
            case 'verification':
                return 'bg-green-100 text-green-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const filteredNotifications = notifications.filter((notif) => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !notif.isRead;
        return notif.type === filter;
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                            <p className="mt-2 text-lg text-gray-600">
                                {unreadCount > 0 ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}
                            </p>
                        </div>
                        {unreadCount > 0 && (
                            <Button onClick={handleMarkAllAsRead} variant="outline" className="flex items-center gap-2">
                                <FaCheck /> Mark All as Read
                            </Button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow mb-6 p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <FaFilter className="text-gray-500" />
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All ({notifications.length})
                        </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'unread' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Unread ({unreadCount})
                        </button>
                        <button
                            onClick={() => setFilter('bid')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'bid' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Bids
                        </button>
                        <button
                            onClick={() => setFilter('payment')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'payment' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Payments
                        </button>
                        <button
                            onClick={() => setFilter('delivery')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filter === 'delivery' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Delivery
                        </button>
                    </div>
                </div>

                {/* Notifications List */}
                {isLoading ? (
                    <div className="text-center py-16">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
                        <p className="mt-4 text-gray-500">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="bg-white rounded-lg shadow p-12 text-center">
                        <FaBell className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                        <p className="text-gray-500">
                            {filter === 'unread' ? "You're all caught up!" : 'No notifications in this category.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredNotifications.map((notif) => (
                            <div
                                key={notif.id}
                                className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${!notif.isRead ? 'border-l-4 border-l-indigo-500' : ''
                                    }`}
                            >
                                <div className="p-6">
                                    <div className="flex items-start gap-4">
                                        {/* Icon */}
                                        <div className="flex-shrink-0 mt-1">
                                            {getNotificationIcon(notif.type)}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                        {notif.title}
                                                    </h3>
                                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(notif.type)} capitalize`}>
                                                        {notif.type}
                                                    </span>
                                                </div>
                                                {!notif.isRead && (
                                                    <span className="ml-2 w-3 h-3 bg-indigo-600 rounded-full animate-pulse"></span>
                                                )}
                                            </div>

                                            <p className="text-gray-700 mb-3 leading-relaxed">
                                                {notif.message}
                                            </p>

                                            <div className="flex items-center justify-between">
                                                <p className="text-sm text-gray-500">
                                                    {getTimeAgo(notif.createdAt)}
                                                </p>

                                                <div className="flex items-center gap-2">
                                                    {!notif.isRead && (
                                                        <button
                                                            onClick={() => handleMarkAsRead(notif.id)}
                                                            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                                                        >
                                                            Mark as Read
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(notif.id)}
                                                        className="p-2 text-gray-400 hover:text-red-600 transition"
                                                        title="Delete"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
