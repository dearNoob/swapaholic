'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaGavel, FaShoppingBag, FaHeart, FaComment, FaUserPlus } from 'react-icons/fa';

interface ActivityItem {
    id: string;
    type: 'bid' | 'order' | 'wishlist' | 'message' | 'follow';
    title: string;
    description: string;
    timestamp: string;
    image?: string;
    link: string;
    isRead: boolean;
}

interface ActivityFeedProps {
    activities?: ActivityItem[];
}

export default function ActivityFeed({ activities }: ActivityFeedProps) {
    // Mock data
    const mockActivities: ActivityItem[] = [
        {
            id: '1',
            type: 'bid',
            title: 'Outbid Alert',
            description: 'You were outbid on "Vintage Leather Jacket"',
            timestamp: '2 mins ago',
            image: 'https://images.unsplash.com/photo-1551028919-ac7bcb7d715a?w=100&q=80',
            link: '/products/1',
            isRead: false
        },
        {
            id: '2',
            type: 'order',
            title: 'Order Shipped',
            description: 'Your order #12345 has been shipped',
            timestamp: '2 hours ago',
            image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80',
            link: '/orders/12345',
            isRead: true
        },
        {
            id: '3',
            type: 'wishlist',
            title: 'Price Drop',
            description: '"Sony WH-1000XM4" is now 20% off',
            timestamp: '5 hours ago',
            image: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=100&q=80',
            link: '/products/2',
            isRead: true
        },
        {
            id: '4',
            type: 'message',
            title: 'New Message',
            description: 'Seller "RetroFinds" replied to your question',
            timestamp: '1 day ago',
            link: '/messages/1',
            isRead: true
        }
    ];

    const data = activities || mockActivities;

    const getIcon = (type: ActivityItem['type']) => {
        switch (type) {
            case 'bid': return <FaGavel className="text-yellow-600" />;
            case 'order': return <FaShoppingBag className="text-blue-600" />;
            case 'wishlist': return <FaHeart className="text-red-600" />;
            case 'message': return <FaComment className="text-indigo-600" />;
            case 'follow': return <FaUserPlus className="text-green-600" />;
            default: return <FaGavel />;
        }
    };

    const getBgColor = (type: ActivityItem['type']) => {
        switch (type) {
            case 'bid': return 'bg-yellow-50';
            case 'order': return 'bg-blue-50';
            case 'wishlist': return 'bg-red-50';
            case 'message': return 'bg-indigo-50';
            case 'follow': return 'bg-green-50';
            default: return 'bg-gray-50';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                <Link href="/notifications" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    View All
                </Link>
            </div>

            <div className="divide-y divide-gray-100">
                {data.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No recent activity
                    </div>
                ) : (
                    data.map((item) => (
                        <Link
                            key={item.id}
                            href={item.link}
                            className={`
                block p-4 hover:bg-gray-50 transition
                ${!item.isRead ? 'bg-indigo-50/30' : ''}
              `}
                        >
                            <div className="flex gap-4">
                                {/* Icon or Image */}
                                <div className="flex-shrink-0">
                                    {item.image ? (
                                        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-200">
                                            <Image
                                                src={item.image}
                                                alt=""
                                                fill
                                                className="object-cover"
                                            />
                                            <div className={`absolute bottom-0 right-0 p-1 rounded-tl-md ${getBgColor(item.type)}`}>
                                                <div className="text-[10px]">{getIcon(item.type)}</div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getBgColor(item.type)}`}>
                                            {getIcon(item.type)}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start">
                                        <p className={`text-sm font-medium truncate ${!item.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                                            {item.title}
                                        </p>
                                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                                            {item.timestamp}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-0.5 line-clamp-2">
                                        {item.description}
                                    </p>
                                </div>

                                {!item.isRead && (
                                    <div className="flex-shrink-0 self-center">
                                        <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
