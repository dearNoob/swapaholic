'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaUsers, FaBox, FaShoppingCart, FaExclamationTriangle, FaChartLine, FaFileAlt } from 'react-icons/fa';
import { adminApi } from '../../../api/admin';
import { toast } from 'react-toastify';

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setIsLoading(true);
            const data = await adminApi.getDashboardStats();
            setStats(data);
        } catch (err) {
            console.error('Error fetching admin stats:', err);
            // Mock data
            setStats({
                users: {
                    total: 1543,
                    active: 1234,
                    pending: 45,
                    banned: 12,
                },
                products: {
                    total: 3421,
                    pending: 23,
                    active: 3156,
                    rejected: 242,
                },
                orders: {
                    total: 2134,
                    pending: 45,
                    completed: 1987,
                    disputed: 12,
                },
                disputes: {
                    total: 34,
                    open: 12,
                    underReview: 15,
                    resolved: 7,
                },
                revenue: {
                    total: 156789,
                    thisMonth: 23456,
                    commission: 7839,
                },
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent mb-4"></div>
                    <p className="text-gray-600">Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    const quickLinks = [
        {
            title: 'User Management',
            description: 'Manage users, verify accounts, ban users',
            icon: FaUsers,
            color: 'bg-blue-500',
            href: '/admin/users',
            stat: `${stats.users.pending} pending`,
        },
        {
            title: 'Product Moderation',
            description: 'Review and approve product listings',
            icon: FaBox,
            color: 'bg-green-500',
            href: '/admin/products',
            stat: `${stats.products.pending} pending`,
        },
        {
            title: 'Order Oversight',
            description: 'Monitor and manage all orders',
            icon: FaShoppingCart,
            color: 'bg-purple-500',
            href: '/admin/orders',
            stat: `${stats.orders.pending} pending`,
        },
        {
            title: 'Dispute Resolution',
            description: 'Handle user disputes and conflicts',
            icon: FaExclamationTriangle,
            color: 'bg-red-500',
            href: '/admin/disputes',
            stat: `${stats.disputes.open} open`,
        },
        {
            title: 'Platform Analytics',
            description: 'View platform statistics and reports',
            icon: FaChartLine,
            color: 'bg-orange-500',
            href: '/admin/analytics',
            stat: 'View reports',
        },
        {
            title: 'Content Management',
            description: 'Manage site content and settings',
            icon: FaFileAlt,
            color: 'bg-indigo-500',
            href: '/admin/content',
            stat: 'Manage',
        },
    ];

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                        Admin Dashboard 🛡️
                    </h1>
                    <p className="text-lg text-gray-600">
                        Platform management and oversight
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <FaUsers className="text-3xl text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.users.total}</p>
                        <p className="text-xs text-gray-500 mt-2">{stats.users.active} active</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <FaBox className="text-3xl text-green-600" />
                        </div>
                        <p className="text-sm text-gray-600">Total Products</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.products.total}</p>
                        <p className="text-xs text-gray-500 mt-2">{stats.products.active} active</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <FaShoppingCart className="text-3xl text-purple-600" />
                        </div>
                        <p className="text-sm text-gray-600">Total Orders</p>
                        <p className="text-3xl font-bold text-gray-900">{stats.orders.total}</p>
                        <p className="text-xs text-gray-500 mt-2">{stats.orders.completed} completed</p>
                    </div>

                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                            <FaChartLine className="text-3xl text-orange-600" />
                        </div>
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-900">৳{(stats.revenue.total / 1000).toFixed(1)}k</p>
                        <p className="text-xs text-gray-500 mt-2">৳{(stats.revenue.thisMonth / 1000).toFixed(1)}k this month</p>
                    </div>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {quickLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="group bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition transform hover:scale-105"
                        >
                            <div className="flex items-start gap-4">
                                <div className={`${link.color} text-white rounded-lg p-3`}>
                                    <link.icon className="text-2xl" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-indigo-600 transition">
                                        {link.title}
                                    </h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        {link.description}
                                    </p>
                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                                        {link.stat}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}
