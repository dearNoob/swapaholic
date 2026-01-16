'use client';

import Link from 'next/link';
import { FaPlus, FaBox, FaShippingFast, FaChartBar, FaCog, FaEnvelope } from 'react-icons/fa';

export default function QuickActions() {
    const actions = [
        {
            title: 'Create Listing',
            description: 'Add a new product',
            icon: FaPlus,
            href: '/seller/create-listing',
            color: 'bg-indigo-600 hover:bg-indigo-700',
        },
        {
            title: 'Manage Listings',
            description: 'Edit your products',
            icon: FaBox,
            href: '/seller/listings',
            color: 'bg-blue-600 hover:bg-blue-700',
        },
        {
            title: 'View Orders',
            description: 'Track all orders',
            icon: FaShippingFast,
            href: '/seller/orders',
            color: 'bg-green-600 hover:bg-green-700',
        },
        {
            title: 'Analytics',
            description: 'View detailed stats',
            icon: FaChartBar,
            href: '/seller/analytics',
            color: 'bg-purple-600 hover:bg-purple-700',
        },
        {
            title: 'Settings',
            description: 'Account preferences',
            icon: FaCog,
            href: '/profile',
            color: 'bg-gray-600 hover:bg-gray-700',
        },
        {
            title: 'Messages',
            description: 'Chat with buyers',
            icon: FaEnvelope,
            href: '/messages',
            color: 'bg-orange-600 hover:bg-orange-700',
        },
    ];

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {actions.map((action) => (
                    <Link
                        key={action.title}
                        href={action.href}
                        className={`${action.color} text-white rounded-lg p-4 text-center hover:shadow-lg transition transform hover:scale-105 group`}
                    >
                        <action.icon className="text-3xl mx-auto mb-2 group-hover:scale-110 transition" />
                        <p className="font-semibold text-sm mb-1">{action.title}</p>
                        <p className="text-xs opacity-90">{action.description}</p>
                    </Link>
                ))}
            </div>
        </div>
    );
}
