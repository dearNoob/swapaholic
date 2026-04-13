'use client';

import React from 'react';
import { FaClock } from 'react-icons/fa';
import { useAuctionTimer } from '../hooks/useAuctionTimer';

interface AuctionTimerProps {
    endTime?: string;
    variant?: 'compact' | 'full';
    className?: string;
    showLabel?: boolean;
}

export default function AuctionTimer({ 
    endTime, 
    variant = 'compact', 
    className = '',
    showLabel = true
}: AuctionTimerProps) {
    const { formatted, isEnded, isEndingSoon } = useAuctionTimer(endTime);

    if (variant === 'compact') {
        return (
            <div className={`flex items-center gap-1.5 ${isEnded ? 'text-gray-400' : isEndingSoon ? 'text-red-500 font-bold animate-pulse' : 'text-orange-600'} ${className}`}>
                <FaClock className={isEndingSoon ? 'text-red-500' : 'text-orange-500'} size={12} />
                <span className="text-xs font-medium">{formatted}</span>
            </div>
        );
    }

    return (
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl shadow-sm transition-all duration-300 ${isEnded ? 'bg-gray-100 text-gray-500' : isEndingSoon ? 'bg-red-50 text-red-600 border border-red-100 ring-2 ring-red-500/20' : 'bg-orange-50 text-orange-700 border border-orange-100'} ${className}`}>
            <FaClock className={isEnded ? 'text-gray-400' : isEndingSoon ? 'animate-pulse' : ''} />
            <div>
                {showLabel && (
                    <p className={`text-[10px] uppercase tracking-wider font-bold ${isEnded ? 'text-gray-400' : 'text-slate-500'}`}>
                        {isEnded ? 'Auction Ended' : 'Time Remaining'}
                    </p>
                )}
                <p className={`font-mono text-sm sm:text-base font-bold tabular-nums ${isEnded ? 'line-through' : ''}`}>
                    {formatted}
                </p>
            </div>
        </div>
    );
}
