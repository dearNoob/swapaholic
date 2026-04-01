'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaChevronDown, FaUser, FaTachometerAlt, FaCog, FaSignOutAlt, FaShoppingCart, FaStore } from 'react-icons/fa';
import { useAppSelector } from '../../store/hooks';
import RoleSwitcher from './RoleSwitcher';
import { User } from '../../types/api';

interface UserDropdownProps {
    user: User | null;
    onLogout: () => void;
}

export default function UserDropdown({ user, onLogout }: UserDropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { activeMode } = useAppSelector((state) => state.auth);

    // Close dropdown when clicking outside or pressing Escape
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    if (!user) return null;

    const getInitials = (firstName: string, lastName: string) => {
        return `${firstName[0]}${lastName[0]}`.toUpperCase();
    };

    const getDashboardLink = () => {
        if (user.role === 'admin') return '/admin/dashboard';
        if (user.role === 'logistics_officer') return '/logistics/dashboard';
        if (user.role === 'delivery') return '/delivery/dashboard';
        // For unified 'user' role, use activeMode to determine dashboard
        return activeMode === 'seller' ? '/seller/dashboard' : '/buyer/dashboard';
    };

    const getModeLabel = () => {
        if (user.role === 'admin') return 'Admin';
        return activeMode === 'seller' ? 'Seller Mode' : 'Buyer Mode';
    };

    const getModeIcon = () => {
        if (user.role === 'admin') return null;
        return activeMode === 'seller' ? (
            <FaStore className="text-green-600 mr-1" />
        ) : (
            <FaShoppingCart className="text-indigo-600 mr-1" />
        );
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 transition"
            >
                <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {getInitials(user.firstName, user.lastName)}
                </div>
                <FaChevronDown className={`h-3 w-3 text-gray-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-200">
                        <p className="text-sm font-semibold text-gray-900">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-gray-600 mt-1">{user.email}</p>
                        <div className="flex items-center mt-2">
                            <span className="inline-flex items-center px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded">
                                {getModeIcon()}
                                {getModeLabel()}
                            </span>
                        </div>
                    </div>

                    {/* Role Switcher - Only show for unified 'user' role */}
                    {(user.role === 'user' || user.role === 'buyer' || user.role === 'seller') && (
                        <RoleSwitcher onSwitch={() => setIsOpen(false)} />
                    )}

                    {/* Menu Items */}
                    <div className="py-2">
                        <Link
                            href={getDashboardLink()}
                            onClick={() => setIsOpen(false)}
                            className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                        >
                            <FaTachometerAlt className="mr-3 h-4 w-4 text-gray-400" />
                            Dashboard
                        </Link>

                        {/* Marketplace specific links - Only for unified 'user' role */}
                        {user.role === 'user' && (
                            <>
                                <Link
                                    href="/profile"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                >
                                    <FaUser className="mr-3 h-4 w-4 text-gray-400" />
                                    Profile
                                </Link>
                                
                                {activeMode === 'buyer' && (
                                    <Link
                                        href="/orders"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        <FaShoppingCart className="mr-3 h-4 w-4 text-gray-400" />
                                        My Purchases
                                    </Link>
                                )}
                                {activeMode === 'seller' && (
                                    <Link
                                        href="/seller/orders"
                                        onClick={() => setIsOpen(false)}
                                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                    >
                                        <FaStore className="mr-3 h-4 w-4 text-gray-400" />
                                        Order Management
                                    </Link>
                                )}

                                <Link
                                    href="/profile"
                                    onClick={() => setIsOpen(false)}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                >
                                    <FaCog className="mr-3 h-4 w-4 text-gray-400" />
                                    Settings
                                </Link>
                            </>
                        )}
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-200">
                        <button
                            onClick={() => {
                                onLogout();
                                setIsOpen(false);
                            }}
                            className="flex items-center w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition"
                        >
                            <FaSignOutAlt className="mr-3 h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
