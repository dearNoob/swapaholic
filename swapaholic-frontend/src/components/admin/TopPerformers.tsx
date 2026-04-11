'use client';

import React, { useState } from 'react';
import { FaTrophy, FaStar, FaMedal } from 'react-icons/fa';

interface Performer {
    sellerId?: string;
    buyerId?: string;
    name: string;
    completedOrders: number;
    totalRevenue?: number;
    totalSpent?: number;
    averageRating?: string | number;
    reviewCount?: number;
}

interface TopPerformersProps {
    performers: {
        topSellers: Performer[];
        topBuyers: Performer[];
        topRatedSellers: Performer[];
    } | null;
}

const getRankBadge = (index: number) => {
    if (index === 0) return <FaTrophy className="text-yellow-500 text-lg" />;
    if (index === 1) return <FaMedal className="text-gray-400 text-lg" />;
    if (index === 2) return <FaMedal className="text-amber-600 text-lg" />;
    return <span className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 text-gray-600 text-xs font-bold">{index + 1}</span>;
};

export default function TopPerformers({ performers }: TopPerformersProps) {
    const [activeTab, setActiveTab] = useState<'sellers' | 'buyers' | 'rated'>('sellers');

    if (!performers) {
        return (
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <FaTrophy className="text-amber-500" /> Top Performers
                </h3>
                <div className="text-gray-400 text-center py-8">Loading performers...</div>
            </div>
        );
    }

    const tabs: Array<{ key: 'sellers' | 'buyers' | 'rated'; label: string }> = [
        { key: 'sellers', label: 'Top Sellers' },
        { key: 'buyers', label: 'Top Buyers' },
        { key: 'rated', label: 'Highest Rated' },
    ];

    const getList = () => {
        switch (activeTab) {
            case 'sellers': return performers.topSellers || [];
            case 'buyers': return performers.topBuyers || [];
            case 'rated': return performers.topRatedSellers || [];
            default: return [];
        }
    };

    const list = getList();

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <FaTrophy className="text-amber-500" /> Top Performers
                </h3>
            </div>

            {/* Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`flex-1 px-3 py-2 text-xs font-semibold rounded-md transition-all ${
                            activeTab === tab.key
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* List */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1 admin-scrollbar">
                {list.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm">
                        No performer data available yet
                    </div>
                ) : (
                    list.map((performer, index) => (
                        <div
                            key={performer.sellerId || performer.buyerId || index}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all group"
                        >
                            <div className="flex-shrink-0">
                                {getRankBadge(index)}
                            </div>
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                                {performer.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-gray-900 text-sm truncate">
                                    {performer.name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {performer.completedOrders} orders
                                    {performer.averageRating && (
                                        <span className="ml-2 inline-flex items-center gap-1">
                                            <FaStar className="text-yellow-400" />
                                            {performer.averageRating}
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="text-right flex-shrink-0">
                                {activeTab === 'rated' ? (
                                    <div className="flex items-center gap-1">
                                        <FaStar className="text-yellow-400" />
                                        <span className="font-bold text-gray-900 text-sm">{performer.averageRating}</span>
                                        <span className="text-xs text-gray-400">({performer.reviewCount})</span>
                                    </div>
                                ) : (
                                    <span className="font-bold text-emerald-600 text-sm">
                                        BDT {(performer.totalRevenue || performer.totalSpent || 0).toLocaleString()}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
