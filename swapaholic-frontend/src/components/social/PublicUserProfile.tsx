'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { FaStar, FaUserPlus, FaUserCheck, FaMapMarkerAlt, FaCalendar, FaTrophy, FaGavel, FaShoppingBag } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { usersApi } from '@/api/users';
import { showErrorToast } from '@/utils/errorHandler';

interface UserBadge {
    id: string;
    name: string;
    icon: string;
    description: string;
    rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
}

interface UserProfile {
    id: string;
    username: string;
    fullName: string;
    avatar?: string;
    coverPhoto?: string;
    bio?: string;
    location?: string;
    memberSince: Date;
    rating: number;
    totalReviews: number;
    totalSales: number;
    totalPurchases: number;
    badges: UserBadge[];
    isFollowing: boolean;
    followerCount: number;
    followingCount: number;
}

interface PublicUserProfileProps {
    user: UserProfile;
    onFollow?: () => void;
    onUnfollow?: () => void;
    onMessageClick?: () => void;
}

export default function PublicUserProfile({
    user,
    onFollow,
    onUnfollow,
    onMessageClick
}: PublicUserProfileProps) {
    const [isFollowing, setIsFollowing] = useState(user.isFollowing);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'listings' | 'reviews' | 'badges'>('listings');

    const handleFollowToggle = async () => {
        setIsLoading(true);
        try {
            if (isFollowing) {
                await usersApi.unfollowUser(user.id);
                onUnfollow?.();
                setIsFollowing(false);
                toast.success(`Unfollowed ${user.username}`);
            } else {
                await usersApi.followUser(user.id);
                onFollow?.();
                setIsFollowing(true);
                toast.success(`Following ${user.username}`);
            }
        } catch (error) {
            showErrorToast(error);
        } finally {
            setIsLoading(false);
        }
    };

    const getRarityColor = (rarity: UserBadge['rarity']) => {
        const colors = {
            bronze: 'bg-amber-700 text-amber-100',
            silver: 'bg-gray-400 text-gray-900',
            gold: 'bg-yellow-400 text-yellow-900',
            platinum: 'bg-purple-600 text-purple-100'
        };
        return colors[rarity];
    };

    return (
        <div className="max-w-4xl mx-auto">
            {/* Cover Photo */}
            <div className="relative h-48 bg-linear-to-r from-indigo-500 to-purple-600 rounded-t-lg overflow-hidden">
                {user.coverPhoto && (
                    <Image
                        src={user.coverPhoto}
                        alt="Cover photo"
                        fill
                        className="object-cover"
                    />
                )}
            </div>

            {/* Profile Header */}
            <div className="bg-white rounded-b-lg shadow-sm border border-gray-200 -mt-16 relative">
                <div className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        {/* Avatar */}
                        <div className="relative">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-200">
                                {user.avatar ? (
                                    <Image
                                        src={user.avatar}
                                        alt={user.username}
                                        width={128}
                                        height={128}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-gray-400">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{user.fullName}</h1>
                                    <p className="text-gray-600">@{user.username}</p>

                                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                                        {user.location && (
                                            <div className="flex items-center gap-1">
                                                <FaMapMarkerAlt />
                                                <span>{user.location}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-1">
                                            <FaCalendar />
                                            <span>Joined {user.memberSince.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>

                                    {user.bio && (
                                        <p className="mt-3 text-gray-700">{user.bio}</p>
                                    )}

                                    <div className="flex items-center gap-4 mt-3 text-sm">
                                        <button className="hover:underline">
                                            <span className="font-bold text-gray-900">{user.followerCount}</span>
                                            <span className="text-gray-600"> Followers</span>
                                        </button>
                                        <button className="hover:underline">
                                            <span className="font-bold text-gray-900">{user.followingCount}</span>
                                            <span className="text-gray-600"> Following</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleFollowToggle}
                                        disabled={isLoading}
                                        className={`
                      px-6 py-2 rounded-lg font-semibold transition flex items-center gap-2 disabled:opacity-50
                      ${isFollowing
                                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                                : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                            }
                    `}
                                    >
                                        {isLoading ? '...' : (isFollowing ? (
                                            <>
                                                <FaUserCheck />
                                                Following
                                            </>
                                        ) : (
                                            <>
                                                <FaUserPlus />
                                                Follow
                                            </>
                                        ))}
                                    </button>
                                    <button
                                        onClick={onMessageClick}
                                        className="px-6 py-2 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                                    >
                                        Message
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="border-t grid grid-cols-3 divide-x">
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-yellow-400 mb-1">
                            <FaStar />
                            <span className="text-2xl font-bold text-gray-900">{user.rating.toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-gray-600">{user.totalReviews} Reviews</p>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-blue-600 mb-1">
                            <FaShoppingBag />
                            <span className="text-2xl font-bold text-gray-900">{user.totalSales}</span>
                        </div>
                        <p className="text-sm text-gray-600">Items Sold</p>
                    </div>
                    <div className="p-4 text-center">
                        <div className="flex items-center justify-center gap-2 text-green-600 mb-1">
                            <FaGavel />
                            <span className="text-2xl font-bold text-gray-900">{user.totalPurchases}</span>
                        </div>
                        <p className="text-sm text-gray-600">Items Bought</p>
                    </div>
                </div>

                {/* Badges */}
                {user.badges.length > 0 && (
                    <div className="border-t p-6">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            <FaTrophy className="text-yellow-500" />
                            Achievements
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {user.badges.slice(0, 6).map(badge => (
                                <div
                                    key={badge.id}
                                    className={`
                    px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2
                    ${getRarityColor(badge.rarity)}
                  `}
                                    title={badge.description}
                                >
                                    <span>{badge.icon}</span>
                                    <span>{badge.name}</span>
                                </div>
                            ))}
                            {user.badges.length > 6 && (
                                <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition">
                                    +{user.badges.length - 6} more
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Tabs */}
                <div className="border-t">
                    <div className="flex gap-1 p-2">
                        {['listings', 'reviews', 'badges'].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`
                  flex-1 py-2 px-4 rounded-lg font-medium capitalize transition
                  ${activeTab === tab
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : 'text-gray-600 hover:bg-gray-50'
                                    }
                `}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                {activeTab === 'listings' && (
                    <div className="text-center py-12 text-gray-500">
                        <FaShoppingBag className="text-4xl mx-auto mb-3 text-gray-300" />
                        <p>Active listings will appear here</p>
                    </div>
                )}
                {activeTab === 'reviews' && (
                    <div className="text-center py-12 text-gray-500">
                        <FaStar className="text-4xl mx-auto mb-3 text-gray-300" />
                        <p>Reviews will appear here</p>
                    </div>
                )}
                {activeTab === 'badges' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {user.badges.map(badge => (
                            <div
                                key={badge.id}
                                className="border border-gray-200 rounded-lg p-4 text-center hover:shadow-md transition"
                            >
                                <div className="text-4xl mb-2">{badge.icon}</div>
                                <h4 className="font-semibold text-gray-900">{badge.name}</h4>
                                <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                                <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${getRarityColor(badge.rarity)}`}>
                                    {badge.rarity}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}
