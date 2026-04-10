'use client';

import Image from 'next/image';
import { FaClock, FaCircle, FaBox } from 'react-icons/fa';

interface Conversation {
    id: string;
    otherUser: {
        id: string;
        name: string;
        avatar: string;
    } | null;
    lastMessage: {
        content: string;
        sender: string;
        createdAt: string;
    } | null;
    unreadCount: number;
    orderId?: string;
    updatedAt: string;
}

interface ConversationListProps {
    conversations: Conversation[];
    selectedConversation: Conversation | null;
    onSelectConversation: (conversation: Conversation) => void;
    isLoading: boolean;
}

export default function ConversationList({
    conversations,
    selectedConversation,
    onSelectConversation,
    isLoading,
}: ConversationListProps) {
    const getTimeAgo = (timestamp: string) => {
        const diff = Date.now() - new Date(timestamp).getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) return `${days}d`;
        if (hours > 0) return `${hours}h`;
        if (minutes > 0) return `${minutes}m`;
        return 'now';
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                    <p className="text-gray-600 mt-2 text-sm">Loading...</p>
                </div>
            </div>
        );
    }

    if (conversations.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                    <p className="text-gray-600">No conversations yet</p>
                    <p className="text-sm text-gray-500 mt-2">Start chatting with buyers or sellers!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            {conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation)}
                    className={`w-full p-4 border-b hover:bg-gray-50 transition text-left ${selectedConversation?.id === conversation.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                        }`}
                >
                    <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 bg-gray-200">
                            <Image
                                src={conversation.otherUser?.avatar || '/placeholder-avatar.svg'}
                                alt={conversation.otherUser?.name || 'User'}
                                fill
                                className="object-cover"
                            />
                            {conversation.unreadCount > 0 && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">{conversation.unreadCount}</span>
                                </div>
                            )}
                        </div>

                        {/* Conversation Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <p className={`font-semibold truncate ${conversation.unreadCount > 0 ? 'text-gray-900' : 'text-gray-700'
                                    }`}>
                                    {conversation.otherUser?.name || 'Unknown User'}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <FaClock className="text-xs" />
                                    {getTimeAgo(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                                </div>
                            </div>

                            {/* Order Badge */}
                            {conversation.orderId && (
                                <div className="flex items-center gap-1 text-xs text-indigo-600 mb-1">
                                    <FaBox className="text-xs" />
                                    Order #{conversation.orderId}
                                </div>
                            )}

                            {/* Last Message */}
                            <p className={`text-sm truncate ${conversation.unreadCount > 0 ? 'text-gray-900 font-medium' : 'text-gray-600'
                                }`}>
                                {conversation.lastMessage?.content || 'No messages yet'}
                            </p>
                        </div>
                    </div>
                </button>
            ))}
        </div>
    );
}
