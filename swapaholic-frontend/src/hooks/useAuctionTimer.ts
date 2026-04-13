import { useState, useEffect } from 'react';

export interface TimeRemaining {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isEnded: boolean;
    isEndingSoon: boolean; // For the 6 hour threshold
    formatted: string;
}

export const useAuctionTimer = (endTime?: string): TimeRemaining => {
    const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isEnded: false,
        isEndingSoon: false,
        formatted: 'Calculating...',
    });

    useEffect(() => {
        if (!endTime) {
            setTimeRemaining(prev => ({ ...prev, formatted: 'No end time' }));
            return;
        }

        const updateTimer = () => {
            const now = new Date().getTime();
            const end = new Date(endTime).getTime();
            const distance = end - now;

            if (distance <= 0) {
                setTimeRemaining({
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    seconds: 0,
                    isEnded: true,
                    isEndingSoon: false,
                    formatted: 'Auction ended',
                });
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            // 6 hour threshold for "ending soon"
            const isEndingSoon = distance < (6 * 60 * 60 * 1000);

            let formatted = '';
            if (days > 0) {
                formatted = `${days}d ${hours}h ${minutes}m`;
            } else if (hours > 0) {
                formatted = `${hours}h ${minutes}m ${seconds}s`;
            } else {
                formatted = `${minutes}m ${seconds}s`;
            }

            setTimeRemaining({
                days,
                hours,
                minutes,
                seconds,
                isEnded: false,
                isEndingSoon,
                formatted,
            });
        };

        updateTimer();
        const interval = setInterval(updateTimer, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    return timeRemaining;
};
