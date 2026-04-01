'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    FaTruck, FaTachometerAlt, FaTasks, FaHistory,
    FaSignOutAlt, FaUser, FaBars, FaTimes, FaChevronLeft,
    FaChevronRight
} from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/authSlice';

const navItems = [
    { label: 'Dashboard', href: '/logistics/dashboard', icon: FaTachometerAlt },
    // Future expansion: { label: 'Task History', href: '/logistics/tasks', icon: FaHistory },
];

export default function LogisticsSidebar() {
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
        if (href === '/logistics/dashboard') {
            return pathname === '/logistics/dashboard' || pathname === '/logistics';
        }
        return pathname.startsWith(href);
    };

    const getInitials = () => {
        if (!user) return 'L';
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase() || 'L';
    };

    const sidebarContent = (
        <>
            {/* Logo / Brand */}
            <div className="flex items-center gap-3 px-4 py-5 border-b border-teal-700/30">
                <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-teal-500/30">
                    <FaTruck className="text-white text-lg" />
                </div>
                {!collapsed && (
                    <div className="overflow-hidden">
                        <h1 className="text-white font-bold text-lg leading-tight">Swapaholic</h1>
                        <p className="text-teal-200 text-xs">Logistics Portal</p>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto w-full">
                {navItems.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={`
                                flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                ${active
                                    ? 'bg-gradient-to-r from-teal-600/20 to-cyan-600/20 border-l-2 border-teal-400 text-teal-300 shadow-md shadow-teal-900/10'
                                    : 'text-slate-400 border-l-2 border-transparent hover:bg-slate-800/50 hover:text-slate-200 hover:border-slate-500'
                                }
                            `}
                            title={collapsed ? item.label : undefined}
                        >
                            <Icon className={`text-base flex-shrink-0 ${active ? 'text-teal-400' : 'text-slate-500'}`} />
                            {!collapsed && <span>{item.label}</span>}
                        </Link>
                    );
                })}
            </nav>

            {/* Profile Section */}
            <div className="border-t border-slate-700/50 p-3 space-y-2 w-full">
                <Link
                    href="/logistics/profile"
                    onClick={() => setMobileOpen(false)}
                    className={`
                        flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200
                        ${pathname === '/logistics/profile'
                            ? 'bg-slate-800 text-teal-300 border border-slate-700'
                            : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                        }
                    `}
                    title={collapsed ? 'Profile' : undefined}
                >
                    <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center text-teal-300 font-semibold text-xs flex-shrink-0 border border-slate-600">
                        {getInitials()}
                    </div>
                    {!collapsed && (
                        <div className="overflow-hidden">
                            <p className="text-slate-200 font-medium text-sm truncate">
                                {user?.firstName} {user?.lastName}
                            </p>
                            <p className="text-slate-500 text-xs truncate">{user?.email}</p>
                        </div>
                    )}
                </Link>

                <button
                    onClick={handleLogout}
                    className="flex justify-start items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 border border-transparent hover:border-red-500/20"
                    title={collapsed ? 'Logout' : undefined}
                >
                    <FaSignOutAlt className="text-base flex-shrink-0 text-red-500/70" />
                    {!collapsed && <span>Logout</span>}
                </button>
            </div>

            {/* Collapse Toggle (Desktop only) */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex items-center justify-center w-full py-3 border-t border-slate-700/50 text-slate-500 hover:text-slate-300 hover:bg-slate-800/30 transition-all"
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
                className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-slate-800 text-teal-400 border border-slate-700 rounded-xl shadow-lg hover:bg-slate-700 transition-all"
                aria-label="Open menu"
            >
                <FaBars className="text-lg" />
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside
                className={`
                    lg:hidden fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800
                    z-50 flex flex-col shadow-2xl transition-transform duration-300
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                <button
                    onClick={() => setMobileOpen(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 transition-colors"
                    aria-label="Close menu"
                >
                    <FaTimes className="text-lg" />
                </button>
                {sidebarContent}
            </aside>

            {/* Desktop Sidebar - Matches dashboard's dark teal/slate theme */}
            <aside
                className={`
                    hidden lg:flex flex-col fixed top-0 left-0 h-full
                    bg-slate-900 border-r border-slate-800
                    shadow-2xl z-30 transition-all duration-300
                    ${collapsed ? 'w-[72px]' : 'w-64'}
                `}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
