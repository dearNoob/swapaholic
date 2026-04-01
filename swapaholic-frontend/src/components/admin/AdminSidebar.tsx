'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    FaShieldAlt, FaTachometerAlt, FaUsers, FaBox,
    FaShoppingCart, FaExclamationTriangle, FaChartLine,
    FaFileAlt, FaTruck, FaCheckCircle, FaClipboardList,
    FaSignOutAlt, FaUser, FaBars, FaTimes, FaChevronLeft,
    FaChevronRight, FaMoneyBillWave
} from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/authSlice';

const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: FaTachometerAlt },
    { label: 'Users', href: '/admin/users', icon: FaUsers },
    { label: 'Products', href: '/admin/products', icon: FaBox },
    { label: 'Orders', href: '/admin/orders', icon: FaShoppingCart },
    { label: 'Payouts', href: '/admin/payouts', icon: FaMoneyBillWave },
    { label: 'Disputes', href: '/admin/disputes', icon: FaExclamationTriangle },
    { label: 'Analytics', href: '/admin/analytics', icon: FaChartLine },
    { label: 'Content', href: '/admin/content', icon: FaFileAlt },
    { label: 'Logistics', href: '/admin/logistics-officers', icon: FaTruck },
    { label: 'Verification', href: '/admin/verification', icon: FaCheckCircle },
    { label: 'Reports', href: '/admin/reports', icon: FaClipboardList },
];

export default function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user } = useAppSelector((state) => state.auth);
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/login');
    };

    const isActive = (href: string) => {
        if (href === '/admin/dashboard') {
            return pathname === '/admin/dashboard' || pathname === '/admin';
        }
        return pathname.startsWith(href);
    };

    const getInitials = () => {
        if (!user) return 'A';
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'A';
    };

    const sidebarContent = (
        <>
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-indigo-700/30">
                <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FaShieldAlt className="text-white text-lg" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-white font-bold text-lg leading-tight">Swapaholic</h1>
                        <p className="text-indigo-200 text-xs">Admin Panel</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`
                                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                ${active
                                    ? 'bg-white/15 text-white shadow-lg shadow-indigo-900/20'
                                    : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                                }
                            `}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`text-base flex-shrink-0 ${active ? 'text-white' : 'text-indigo-300'}`} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Profile Section */}
            <div className="border-t border-indigo-700/30 p-3 space-y-2">
                <Link
                    href="/admin/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                        ${pathname === '/admin/profile'
                            ? 'bg-white/15 text-white'
                            : 'text-indigo-200 hover:bg-white/10 hover:text-white'
                        }
                    `}
                    title={collapsed ? 'Profile' : undefined}
                >
                    <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-semibold text-xs flex-shrink-0">
                        {getInitials()}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-white font-medium text-sm truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-indigo-300 text-xs truncate">{user?.email}</p>
                        </div>
                    )}
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-300 hover:bg-red-500/20 hover:text-red-200 transition-all duration-200"
                    title={collapsed ? 'Logout' : undefined}
                >
                    <FaSignOutAlt className="text-base flex-shrink-0" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>

            {/* Collapse Toggle (Desktop only) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex items-center justify-center w-full py-3 border-t border-indigo-700/30 text-indigo-300 hover:text-white hover:bg-white/5 transition-all"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
                {collapsed ? <FaChevronRight className="text-xs" /> : <FaChevronLeft className="text-xs" />}
            </button>
        </>
    );

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all"
                aria-label="Open menu"
            >
                <FaBars className="text-lg" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    lg:hidden fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900
                    z-50 flex flex-col shadow-2xl transition-transform duration-300
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 text-indigo-300 hover:text-white transition-colors"
                    aria-label="Close menu"
                >
                    <FaTimes className="text-lg" />
                </button>
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar */}
            <aside
                className={`
                    hidden lg:flex flex-col fixed top-0 left-0 h-full
                    bg-gradient-to-b from-indigo-900 via-indigo-800 to-slate-900
                    shadow-2xl z-30 transition-all duration-300
                    ${collapsed ? 'w-[72px]' : 'w-64'}
                `}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
