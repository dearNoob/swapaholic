'use client';

import React, { useEffect, useState } from 'react';

interface TypingIndicatorProps {
    userName?: string;
    className?: string;
}

export function TypingIndicator({ userName = 'Someone', className = '' }: TypingIndicatorProps) {
    return (
        <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
            <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span>{userName} is typing...</span>
        </div>
    );
}

interface Message {
    id: string;
    content: string;
    senderId: string;
    isRead?: boolean;
}

interface ReadReceiptProps {
    message: Message;
    currentUserId: string;
}

export function ReadReceipt({ message, currentUserId }: ReadReceiptProps) {
    const isSentByMe = message.senderId === currentUserId;

    if (!isSentByMe) return null;

    return (
        <div className="flex items-center gap-1 text-xs">
            {message.isRead ? (
                <>
                    <svg className="w-3 h-3 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    <svg className="w-3 h-3 text-blue-500 -ml-2" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    <span className="text-blue-500">Read</span>
                </>
            ) : (
                <>
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                    <span className="text-gray-400">Sent</span>
                </>
            )}
        </div>
    );
}

interface MessageReactionsProps {
    messageId: string;
    reactions: { [emoji: string]: string[] }; // emoji -> array of user IDs
    currentUserId: string;
    onReact: (emoji: string) => void;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageReactions({ messageId, reactions, currentUserId, onReact }: MessageReactionsProps) {
    const [showPicker, setShowPicker] = useState(false);

    return (
        <div className="relative">
            {/* Existing Reactions */}
            {Object.keys(reactions).length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(reactions).map(([emoji, userIds]) => {
                        const hasReacted = userIds.includes(currentUserId);
                        return (
                            <button
                                key={emoji}
                                onClick={() => onReact(emoji)}
                                className={`
                  flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                  transition-colors
                  ${hasReacted
                                        ? 'bg-indigo-100 border border-indigo-300'
                                        : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                                    }
                `}
                            >
                                <span>{emoji}</span>
                                <span className="text-gray-600">{userIds.length}</span>
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Add Reaction Button */}
            <button
                onClick={() => setShowPicker(!showPicker)}
                className="text-xs text-gray-500 hover:text-gray-700 mt-1"
            >
                Add reaction
            </button>

            {/* Reaction Picker */}
            {showPicker && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowPicker(false)}
                    />
                    <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 shadow-lg rounded-lg p-2 flex gap-2 z-20">
                        {REACTION_EMOJIS.map((emoji) => (
                            <button
                                key={emoji}
                                onClick={() => {
                                    onReact(emoji);
                                    setShowPicker(false);
                                }}
                                className="text-2xl hover:scale-125 transition-transform"
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

// Hook for typing indicator management
export function useTypingIndicator(conversationId: string, userId: string, socketService: any) {
    const [isTyping, setIsTyping] = useState(false);
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!socketService) return;

        // Listen for typing events
        socketService.on(`typing:${conversationId}`, (data: { userId: string; userName: string }) => {
            if (data.userId !== userId) {
                setTypingUsers(prev => [...new Set([...prev, data.userName])]);

                // Clear after 3 seconds
                setTimeout(() => {
                    setTypingUsers(prev => prev.filter(u => u !== data.userName));
                }, 3000);
            }
        });

        return () => {
            socketService.off(`typing:${conversationId}`);
        };
    }, [conversationId, userId, socketService]);

    const notifyTyping = () => {
        if (!socketService || isTyping) return;

        setIsTyping(true);
        socketService.emit('typing', { conversationId, userId });

        // Reset after 2 seconds
        setTimeout(() => setIsTyping(false), 2000);
    };

    return { typingUsers, notifyTyping };
}
