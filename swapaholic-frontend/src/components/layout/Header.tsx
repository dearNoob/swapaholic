'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaBell, FaSearch, FaUserCircle, FaBars, FaTimes } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { logout } from '../../store/authSlice';
import SearchBar from './SearchBar';
import NotificationDropdown from './NotificationDropdown';
import UserDropdown from './UserDropdown';

export default function Header() {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, isAuthenticated } = useAppSelector((state) => state.auth);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

    const handleLogout = () => {
        dispatch(logout());
        router.push('/');
    };

    return (
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-linear-to-br from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-700">S</span>
                            </div>
                            <span className="text-lg font-bold text-gray-900">Swapaholic</span>
                            {isAuthenticated && user && (
                                <span className="text-sm font-medium text-gray-700 ml-2">{user.firstName} {user.lastName}</span>
                            )}
                        </Link>
                    </div>

                    {/* Search Bar - Desktop */}
                    <div className="hidden md:block flex-1 max-w-xl mx-8">
                        <SearchBar />
                    </div>

                    {/* Right Side - Desktop */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                {/* Notification Dropdown */}
                                <NotificationDropdown />

                                {/* User Dropdown */}
                                <UserDropdown user={user} onLogout={handleLogout} />
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="text-gray-700 hover:text-indigo-600 px-3 py-2 rounded-md text-sm font-medium transition"
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
                <div className="md:hidden border-t border-gray-200 bg-white">
                    <div className="px-4 py-3 space-y-3">
                        {/* Mobile Search */}
                        <SearchBar />

                        {isAuthenticated ? (
                            <>
                                <Link
                                    href="/dashboard"
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
                                    href="/notifications"
                                    className="block px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Notifications
                                </Link>
                                <button
                                    onClick={() => {
                                        handleLogout();
                                        setIsMobileMenuOpen(false);
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
        </header>
    );
}
