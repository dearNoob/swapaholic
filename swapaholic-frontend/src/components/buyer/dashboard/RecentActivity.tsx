'use client';

import Link from 'next/link';
import { FaBell, FaGavel, FaTrophy, FaExclamationCircle, FaHeart, FaClock } from 'react-icons/fa';

interface Activity {
    id: string;
    type: 'bid' | 'won' | 'outbid' | 'watchlist';
    productTitle: string;
    amount?: number;
    timestamp: string;
}

interface RecentActivityProps {
    activities: Activity[];
}

export default function RecentActivity({ activities }: RecentActivityProps) {
    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'bid':
                return { icon: FaGavel, color: 'text-blue-600', bg: 'bg-blue-100' };
            case 'won':
                return { icon: FaTrophy, color: 'text-yellow-600', bg: 'bg-yellow-100' };
            case 'outbid':
                return { icon: FaExclamationCircle, color: 'text-red-600', bg: 'bg-red-100' };
            case 'watchlist':
                return { icon: FaHeart, color: 'text-pink-600', bg: 'bg-pink-100' };
            default:
                return { icon: FaBell, color: 'text-gray-600', bg: 'bg-gray-100' };
        }
    };

    const getActivityText = (activity: Activity) => {
        switch (activity.type) {
            case 'bid':
                return `Placed bid of ৳${activity.amount}`;
            case 'won':
                return `Won auction for ৳${activity.amount}`;
            case 'outbid':
                return 'You were outbid';
            case 'watchlist':
                return 'Added to watchlist';
            default:
                return 'Activity';
        }
    };

    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d ago`;
        if (hours > 0) return `${hours}h ago`;
        if (minutes > 0) return `${minutes}m ago`;
        return 'Just now';
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center gap-2 mb-6">
                <FaClock className="text-xl text-indigo-600" />
                <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
            </div>

            <div className="space-y-4">
                {activities.map((activity) => {
                    const iconConfig = getActivityIcon(activity.type);
                    const Icon = iconConfig.icon;

                    return (
                        <div
                            key={activity.id}
                            className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition"
                        >
                            {/* Icon */}
                            <div className={`${iconConfig.bg} rounded-full p-2 flex-shrink-0`}>
                                <Icon className={`${iconConfig.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {activity.productTitle}
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                    {getActivityText(activity)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {getTimeAgo(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* View All Link */}
            <div className="mt-6 pt-4 border-t">
                <Link
                    href="/buyer/activity"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm block text-center"
                >
                    View All Activity →
                </Link>
            </div>
        </div>
    );
}
