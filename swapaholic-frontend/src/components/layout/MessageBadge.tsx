'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { FaEnvelope } from 'react-icons/fa';
import { messagesApi } from '../../api/messages';
import { socketService } from '../../utils/socket';
import { useAppSelector } from '../../store/hooks';

export default function MessageBadge() {
    const [unreadCount, setUnreadCount] = useState(0);
    const { isAuthenticated } = useAppSelector((state) => state.auth);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchUnreadCount = async () => {
            try {
                const data = await messagesApi.getUnreadCount();
                setUnreadCount(data.count || 0);
            } catch (err) {
                console.error('Error fetching message count:', err);
            }
        };

        fetchUnreadCount();

        const handleNewMessage = () => {
            fetchUnreadCount();
        };
        const handleMessageRead = () => {
            fetchUnreadCount();
        };

        if (!socketService.isConnected()) {
            socketService.connect();
        }

        socketService.on('new-message', handleNewMessage);
        socketService.on('message-read', handleMessageRead);

        return () => {
            socketService.off('new-message', handleNewMessage);
            socketService.off('message-read', handleMessageRead);
        };
    }, [isAuthenticated]);

    if (!isAuthenticated) return null;

    return (
        <Link href="/messages" className="relative p-2 text-gray-600 hover:text-indigo-600 transition-colors mr-2">
            <FaEnvelope className="h-6 w-6" />
            {unreadCount > 0 && (
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                    {unreadCount > 99 ? '99+' : unreadCount}
                </span>
            )}
        </Link>
    );
}
