'use client';

import Link from 'next/link';
import { FaBox, FaCheckCircle, FaClock, FaTruck, FaEye } from 'react-icons/fa';

interface Order {
    id: string;
    productTitle: string;
    buyerName: string;
    amount: number;
    status: 'pending' | 'paid' | 'shipped' | 'delivered';
    createdAt: string;
}

interface RecentOrdersProps {
    orders: Order[];
}

export default function RecentOrders({ orders }: RecentOrdersProps) {
    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending':
                return { text: 'Pending', class: 'bg-yellow-100 text-yellow-800', icon: FaClock };
            case 'paid':
                return { text: 'Paid', class: 'bg-green-100 text-green-800', icon: FaCheckCircle };
            case 'shipped':
                return { text: 'Shipped', class: 'bg-blue-100 text-blue-800', icon: FaTruck };
            case 'delivered':
                return { text: 'Delivered', class: 'bg-purple-100 text-purple-800', icon: FaCheckCircle };
            default:
                return { text: status, class: 'bg-gray-100 text-gray-800', icon: FaClock };
        }
    };

    if (orders.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FaBox className="text-indigo-600" />
                    Recent Orders
                </h2>
                <div className="text-center py-12">
                    <FaBox className="mx-auto text-6xl text-gray-300 mb-4" />
                    <p className="text-gray-600">No recent orders yet</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FaBox className="text-indigo-600" />
                    Recent Orders
                </h2>
                <Link
                    href="/seller/orders"
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center gap-1"
                >
                    View All <FaEye />
                </Link>
            </div>

            <div className="space-y-3">
                {orders.map((order) => {
                    const statusInfo = getStatusInfo(order.status);
                    const StatusIcon = statusInfo.icon;

                    return (
                        <div
                            key={order.id}
                            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition"
                        >
                            <div className="flex-1">
                                <Link
                                    href={`/seller/orders/${order.id}`}
                                    className="font-semibold text-gray-900 hover:text-indigo-600 transition"
                                >
                                    {order.productTitle}
                                </Link>
                                <p className="text-sm text-gray-600 mt-1">
                                    Buyer: {order.buyerName} • {new Date(order.createdAt).toLocaleDateString()}
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-bold text-lg text-gray-900">৳{order.amount}</span>
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.class}`}>
                                    <StatusIcon />
                                    {statusInfo.text}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
