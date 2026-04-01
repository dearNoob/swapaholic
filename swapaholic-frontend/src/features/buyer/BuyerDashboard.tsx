import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { useAppSelector } from '../../store/hooks';
import { bidsApi } from '../../api/bids';

export const BuyerDashboard = () => {
    useRequireAuth();
    const { user } = useAppSelector((state) => state.auth);
    const [pendingConfirmations, setPendingConfirmations] = useState(0);

    useEffect(() => {
        const fetchPending = async () => {
            try {
                const wonBids = await bidsApi.getWonBids();
                setPendingConfirmations(wonBids.filter(b => !b.isExpired).length);
            } catch (e) {
                // silently fail
            }
        };
        fetchPending();
    }, []);

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">
                Welcome, {user?.firstName}!
            </h1>

            {/* Pending Confirmations Banner */}
            {pendingConfirmations > 0 && (
                <Link href="/my-bids/won">
                    <div className="mb-6 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 rounded-xl p-5 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="relative">
                                    <div className="bg-white/20 backdrop-blur rounded-full p-3">
                                        <span className="text-2xl">🏆</span>
                                    </div>
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                                        {pendingConfirmations}
                                    </span>
                                </div>
                                <div>
                                    <h3 className="text-white text-lg font-bold">🎉 You won {pendingConfirmations} auction{pendingConfirmations > 1 ? 's' : ''}!</h3>
                                    <p className="text-indigo-200 text-sm mt-0.5">Confirm within 3 hours to secure your purchase.</p>
                                </div>
                            </div>
                            <span className="bg-white text-indigo-700 font-semibold px-5 py-2.5 rounded-lg text-sm flex-shrink-0">
                                Confirm Now →
                            </span>
                        </div>
                    </div>
                </Link>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats / Quick Actions */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Active Bids
                                    </dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">
                                            0
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link href="/my-bids" className="font-medium text-blue-700 hover:text-blue-900">
                                View all
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Won Auctions
                                    </dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">
                                            {pendingConfirmations}
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link href="/my-bids/won" className="font-medium text-green-700 hover:text-green-900">
                                View & confirm
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="p-5">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div className="ml-5 w-0 flex-1">
                                <dl>
                                    <dt className="text-sm font-medium text-gray-500 truncate">
                                        Pending Deliveries
                                    </dt>
                                    <dd>
                                        <div className="text-lg font-medium text-gray-900">
                                            0
                                        </div>
                                    </dd>
                                </dl>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gray-50 px-5 py-3">
                        <div className="text-sm">
                            <Link href="/orders" className="font-medium text-yellow-700 hover:text-yellow-900">
                                Track orders
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8">
                <h2 className="text-lg font-medium text-gray-900 mb-4">Recommended for you</h2>
                <div className="bg-white shadow overflow-hidden sm:rounded-md">
                    <ul className="divide-y divide-gray-200">
                        <li className="px-4 py-4 sm:px-6 text-center text-gray-500">
                            No recommendations yet.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};
