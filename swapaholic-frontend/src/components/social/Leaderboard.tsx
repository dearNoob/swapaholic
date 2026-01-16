'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FaTrophy, FaMedal, FaCrown, FaStar, FaGavel, FaShoppingBag } from 'react-icons/fa';

interface LeaderboardUser {
    rank: number;
    userId: string;
    username: string;
    avatar?: string;
    score: number;
    change?: number; // Position change from last period
}

interface LeaderboardProps {
    category: 'sellers' | 'buyers' | 'bidders';
    users: LeaderboardUser[];
    period: 'daily' | 'weekly' | 'monthly' | 'allTime';
    onPeriodChange?: (period: LeaderboardProps['period']) => void;
}

export default function Leaderboard({ category, users, period, onPeriodChange }: LeaderboardProps) {
    const getRankIcon = (rank: number) => {
        if (rank === 1) return <FaCrown className="text-yellow-400 text-2xl" />;
        if (rank === 2) return <FaMedal className="text-gray-400 text-xl" />;
        if (rank === 3) return <FaMedal className="text-amber-600 text-xl" />;
        return <span className="text-lg font-bold text-gray-600">#{rank}</span>;
    };

    const getCategoryIcon = () => {
        const icons = {
            sellers: <FaShoppingBag className="text-blue-600" />,
            buyers: <FaGavel className="text-green-600" />,
            bidders: <FaStar className="text-yellow-600" />
        };
        return icons[category];
    };

    const getCategoryLabel = () => {
        const labels = {
            sellers: 'Top Sellers',
            buyers: 'Top Buyers',
            bidders: 'Top Bidders'
        };
        return labels[category];
    };

    const getScoreLabel = () => {
        const labels = {
            sellers: 'Sales',
            buyers: 'Purchases',
            bidders: 'Bids Won'
        };
        return labels[category];
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header */}
            <div className="border-b p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <FaTrophy className="text-yellow-500" />
                        {getCategoryLabel()}
                    </h2>
                </div>

                {/* Period Selector */}
                <div className="flex gap-2 overflow-x-auto pb-2">
                    {(['daily', 'weekly', 'monthly', 'allTime'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => onPeriodChange?.(p)}
                            className={`
                px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition
                ${period === p
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }
              `}
                        >
                            {p === 'allTime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="divide-y divide-gray-100">
                {users.map((user, index) => {
                    const isTopThree = user.rank <= 3;

                    return (
                        <Link
                            key={user.userId}
                            href={`/profile/${user.userId}`}
                            className={`
                flex items-center gap-4 p-4 hover:bg-gray-50 transition
                ${isTopThree ? 'bg-linear-to-r from-yellow-50 to-transparent' : ''}
              `}
                        >
                            {/* Rank */}
                            <div className="w-12 flex justify-center">
                                {getRankIcon(user.rank)}
                            </div>

                            {/* Avatar */}
                            <div className={`
                relative w-12 h-12 rounded-full overflow-hidden
                ${isTopThree ? 'ring-2 ring-yellow-400' : ''}
              `}>
                                {user.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt={user.username}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-200 flex items-center justify-center text-lg font-bold text-gray-400">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-gray-900 truncate">
                                    {user.username}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {user.score} {getScoreLabel()}
                                </p>
                            </div>

                            {/* Change Indicator */}
                            {user.change !== undefined && user.change !== 0 && (
                                <div className={`
                  flex items-center gap-1 text-sm font-medium px-2 py-1 rounded
                  ${user.change > 0
                                        ? 'text-green-700 bg-green-100'
                                        : 'text-red-700 bg-red-100'
                                    }
                `}>
                                    <span>{user.change > 0 ? '↑' : '↓'}</span>
                                    <span>{Math.abs(user.change)}</span>
                                </div>
                            )}

                            {/* Trophy for Top 3 */}
                            {isTopThree && (
                                <div className="ml-2">
                                    {getCategoryIcon()}
                                </div>
                            )}
                        </Link>
                    );
                })}
            </div>

            {users.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                    <FaTrophy className="text-4xl mx-auto mb-3 text-gray-300" />
                    <p>No leaderboard data available</p>
                </div>
            )}
        </div>
    );
}
