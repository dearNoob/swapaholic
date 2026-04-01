'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBell, FaSearch, FaUserCircle, FaBars, FaTimes, FaTrophy } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/authSlice';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import MessageBadge from './MessageBadge';
import UserDropdown from './UserDropdown';
import { ConfirmationModal } from '../ui/ConfirmationModal';
import { authApi } from '../../api/auth';
import { bidsApi } from '../../api/bids';

export default function Header() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = React.useState(false);
    const [pendingWonBids, setPendingWonBids] = useState(0);

    const handleLogout = async () => {
        // 1. Immediately clear Redux state for instant UI response
        dispatch(logout());
        
        // 2. Comprehensive storage cleanup
        if (typeof window !== 'undefined') {
            localStorage.clear();
            sessionStorage.clear();
        }
        
        // 3. Instant redirection to home
        router.push('/');
        setIsMobileMenuOpen(false);

        // 4. Cleanup backend session in the background
        try {
            await authApi.logout();
        } catch (e) {
            console.warn('Background logout cleanup failed', e);
        }
    };

    // Fetch pending won bids count for buyer badge
    useEffect(() => {
        if (isAuthenticated && user?.role === 'buyer') {
            const fetchWonCount = async () => {
                try {
                    const wonBids = await bidsApi.getWonBids();
                    setPendingWonBids(wonBids.filter(b => !b.isExpired).length);
                } catch (e) {
                    // silently fail
                }
            };
            fetchWonCount();
            // Refresh every 60 seconds
            const interval = setInterval(fetchWonCount, 60000);
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user?.role]);

    return (
        <header className="bg-white dark:bg-slate-900 shadow-sm border-b border-gray-200 dark:border-slate-800 sticky top-0 z-50 transition-colors">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-linear-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-bold text-white">S</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900 dark:text-white">Swapaholic</span>


                        </Link>
                    </div>

                    {/* Search Bar - Desktop - Hide for Logistics/Delivery */}
                    {user?.role !== 'logistics_officer' && (
                        <div className="hidden md:block flex-1 max-w-xl mx-8">
                            <SearchBar />
                        </div>
                    )}

                    {/* Right Side - Desktop */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                {/* Messages Badge - Hide for Logistics/Delivery */}
                                {user?.role !== 'logistics_officer' && (
                                    <MessageBadge />
                                )}

                                {/* Won Auctions Badge */}
                                {pendingWonBids > 0 && (
                                    <Link
                                        href="/my-bids/won"
                                        className="relative p-2 text-amber-500 hover:text-amber-600 transition-colors"
                                        title={`${pendingWonBids} auction(s) to confirm`}
                                    >
                                        <FaTrophy className="h-5 w-5" />
                                        <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">
                                            {pendingWonBids}
                                        </span>
                                    </Link>
                                )}

                                {/* Notification Dropdown */}
                                <NotificationDropdown />

                                {/* User Dropdown */}
                                <UserDropdown user={user} onLogout={handleLogout} />
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 px-3 py-2 rounded-md text-sm font-medium transition"
                                >
                                    Login
                                </Link>

                                <Link
                                    href="/register"
                                    className="bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-md text-sm font-medium transition"
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="text-gray-700 hover:text-indigo-600 p-2"
                        >
                            {isMobileMenuOpen ? (
                                <FaTimes className="h-6 w-6" />
                            ) : (
                                <FaBars className="h-6 w-6" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden border-t border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <div className="px-4 py-3 space-y-3">
                        {/* Mobile Search - Hide for Logistics/Delivery */}
                        {user?.role !== 'logistics_officer' && (
                            <SearchBar />
                        )}

                        {isAuthenticated ? (
                            <>
                                <Link
                                    href={user?.role === 'admin' ? '/admin/dashboard' : 
                                          user?.role === 'logistics_officer' ? '/logistics/dashboard' : 
                                          '/dashboard'}
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
                                </Link>
                                <Link
                                    href="/profile"
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Profile
                                </Link>
                                <Link
                                    href="/messages"
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Messages
                                </Link>
                                {pendingWonBids > 0 && (
                                    <Link
                                        href="/my-bids/won"
                                        className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-md font-medium"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                    >
                                        <FaTrophy className="text-amber-500" />
                                        🎉 {pendingWonBids} Auction{pendingWonBids > 1 ? 's' : ''} Won — Confirm Now!
                                    </Link>
                                )}
                                <Link
                                    href="/notifications"
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Notifications
                                </Link>
                                <button
                                    onClick={() => {
                                        setIsMobileMenuOpen(false);
                                        handleLogout();
                                    }}
                                    className="block w-full text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded-md"
                                >
                                    Logout
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="block px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-md text-center"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Sign Up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Logout Confirmation Modal - Removed for direct logout */}
        </header>
    );
}
