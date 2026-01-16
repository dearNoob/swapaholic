'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FaExchangeAlt, FaShoppingCart, FaStore } from 'react-icons/fa';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { switchMode, ActiveMode } from '../../store/authSlice';

interface RoleSwitcherProps {
    variant?: 'compact' | 'full';
    onSwitch?: () => void;
}

export default function RoleSwitcher({ variant = 'full', onSwitch }: RoleSwitcherProps) {
    const router = useRouter();
    const dispatch = useAppDispatch();
    const { user, activeMode } = useAppSelector((state) => state.auth);

    // Don't show switcher for admin or non-user roles
    if (!user || user.role === 'admin' || (user.role !== 'user' && user.role !== 'buyer' && user.role !== 'seller')) {
        return null;
    }

    const handleSwitch = () => {
        dispatch(switchMode());

        // Navigate to the appropriate dashboard
        const newMode: ActiveMode = activeMode === 'buyer' ? 'seller' : 'buyer';
        const targetPath = newMode === 'seller' ? '/seller/dashboard' : '/buyer/dashboard';

        router.push(targetPath);
        onSwitch?.();
    };

    const isBuyerMode = activeMode === 'buyer';

    if (variant === 'compact') {
        return (
            <button
                onClick={handleSwitch}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-all duration-200"
                title={`Switch to ${isBuyerMode ? 'Seller' : 'Buyer'} Mode`}
            >
                <FaExchangeAlt className="text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">
                    {isBuyerMode ? 'Seller' : 'Buyer'}
                </span>
            </button>
        );
    }

    return (
        <div className="border-t border-b border-gray-200 py-3 my-2">
            <div className="flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    {isBuyerMode ? (
                        <FaShoppingCart className="text-indigo-600" />
                    ) : (
                        <FaStore className="text-green-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900">
                        {isBuyerMode ? 'Buyer Mode' : 'Seller Mode'}
                    </span>
                </div>
                <button
                    onClick={handleSwitch}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-full hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                    <FaExchangeAlt className="text-xs" />
                    <span>Switch to {isBuyerMode ? 'Seller' : 'Buyer'}</span>
                </button>
            </div>
        </div>
    );
}
