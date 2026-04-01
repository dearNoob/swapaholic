'use client';

import React from 'react';
import {
    FaClipboardList, FaShoppingCart, FaCheckCircle,
    FaExclamationCircle, FaGavel, FaCreditCard,
    FaArrowRight, FaClock
} from 'react-icons/fa';

interface StatsData {
    orders: { total: number; pending: number; completed: number; disputed: number };
    qc: { total: number; pending: number; approved: number; rejected: number; approvalRate: string | number };
    support: { open: number; resolved: number; closed: number };
    delivery: { total: number; delivered: number; failed: number; deliveryRate: string | number };
    payments: { total: number; escrowed: number; released: number; failed: number };
    bids: { total: number; active: number; accepted: number };
}

interface RecentActivityProps {
    stats: StatsData;
}

interface ActivityItem {
    icon: React.ElementType;
    title: string;
    value: string | number;
    description: string;
    color: string;
    bgColor: string;
    link?: string;
}

export default function RecentActivity({ stats }: RecentActivityProps) {
    const activityItems: ActivityItem[] = [
        {
            icon: FaShoppingCart,
            title: 'Pending Orders',
            value: stats.orders.pending,
            description: 'Orders awaiting processing',
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            link: '/admin/orders',
        },
        {
            icon: FaClipboardList,
            title: 'QC Pending',
            value: stats.qc.pending,
            description: `${stats.qc.approvalRate}% approval rate`,
            color: 'text-violet-600',
            bgColor: 'bg-violet-50',
            link: '/admin/verification',
        },
        {
            icon: FaExclamationCircle,
            title: 'Active Disputes',
            value: stats.orders.disputed,
            description: 'Requires immediate attention',
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            link: '/admin/disputes',
        },
        {
            icon: FaGavel,
            title: 'Active Bids',
            value: stats.bids.active,
            description: `${stats.bids.accepted} accepted of ${stats.bids.total} total`,
            color: 'text-pink-600',
            bgColor: 'bg-pink-50',
        },
        {
            icon: FaCreditCard,
            title: 'Escrowed Payments',
            value: stats.payments.escrowed,
            description: `${stats.payments.released} released · ${stats.payments.failed} failed`,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
        },
        {
            icon: FaCheckCircle,
            title: 'Deliveries',
            value: `${stats.delivery.delivered}/${stats.delivery.total}`,
            description: `${stats.delivery.deliveryRate}% delivery rate`,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
        {
            icon: FaClock,
            title: 'Support Tickets',
            value: stats.support.open,
            description: `${stats.support.resolved} resolved · ${stats.support.closed} closed`,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
        },
    ];

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaClipboardList className="text-indigo-600" /> Platform Activity
                </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {activityItems.map((item, index) => {
                    const Icon = item.icon;
                    const content = (
                        <div
                            key={index}
                            className={`flex items-center gap-4 p-4 rounded-xl border border-gray-100 transition-all hover:shadow-md hover:-translate-y-0.5 ${item.link ? 'cursor-pointer' : ''}`}
                        >
                            <div className={`p-3 rounded-xl ${item.bgColor}`}>
                                <Icon className={`text-xl ${item.color}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-500">{item.title}</p>
                                <p className="text-2xl font-bold text-gray-900">{item.value}</p>
                                <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                            </div>
                            {item.link && (
                                <FaArrowRight className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                            )}
                        </div>
                    );

                    if (item.link) {
                        return (
                            <a key={index} href={item.link} className="group">
                                {content}
                            </a>
                        );
                    }
                    return <div key={index}>{content}</div>;
                })}
            </div>
        </div>
    );
}
