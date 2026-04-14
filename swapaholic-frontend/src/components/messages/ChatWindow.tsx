'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { FaPaperPlane, FaPaperclip, FaEllipsisV, FaBan, FaFlag, FaBox } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { messagesApi } from '../../api/messages';
import { TypingIndicator, ReadReceipt, MessageReactions, useTypingIndicator } from '../messaging/MessageEnhancements';
import { socketService } from '../../utils/socket';
import { useAppSelector } from '../../store/hooks';
import { ChatConversation, ConversationMessage } from '../../types/messages';

interface ChatWindowProps {
    conversation: ChatConversation;
    onSendMessage: (content: string, attachments?: File[]) => Promise<ConversationMessage | null>;
    isRecipientBlocked?: boolean;
    onBlockStatusChanged?: () => Promise<void> | void;
}

export default function ChatWindow({
    conversation,
    onSendMessage,
    isRecipientBlocked = false,
    onBlockStatusChanged,
}: ChatWindowProps) {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [showMenu, setShowMenu] = useState(false);
    const [isUpdatingBlockStatus, setIsUpdatingBlockStatus] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAppSelector((state) => state.auth);
    const currentUserId = user?.id || '';

    // Message enhancements
    const { typingUsers, notifyTyping } = useTypingIndicator(conversation.id, currentUserId, socketService);

    useEffect(() => {
        if (isAuthLoading || !isAuthenticated) {
            return;
        }

        // Connect socket if not connected
        if (!socketService.isConnected()) {
            socketService.connect();
        }

        // Listen for new messages
        socketService.on(`message:${conversation.id}`, (newMessage: ConversationMessage) => {
            setMessages((prev) => [...prev, newMessage]);
            // Mark as read if window is focused
            if (document.hasFocus()) {
                messagesApi.markAsRead(conversation.id);
                socketService.emit('read', { conversationId: conversation.id, messageId: newMessage.id });
            }
        });

        // Listen for reactions
        socketService.on(`reaction:${conversation.id}`, (data: { messageId: string; reactions: Record<string, string[]> }) => {
            setMessages((prev) => prev.map(msg =>
                msg.id === data.messageId ? { ...msg, reactions: data.reactions } : msg
            ));
        });

        // Listen for read receipts
        socketService.on(`read:${conversation.id}`, (data: { messageId: string }) => {
            setMessages((prev) => prev.map(msg =>
                msg.id === data.messageId ? { ...msg, isRead: true } : msg
            ));
        });

        return () => {
            socketService.off(`message:${conversation.id}`);
            socketService.off(`reaction:${conversation.id}`);
            socketService.off(`read:${conversation.id}`);
        };
    }, [conversation.id, currentUserId, isAuthenticated, isAuthLoading]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const fetchMessages = useCallback(async () => {
        try {
            setIsLoading(true);
            const messageList = await messagesApi.getMessages(conversation.id);
            setMessages(messageList);
        } catch (err) {
            console.error('Error fetching messages:', err);
            // Mock data fallback if API fails
            setMessages(Array.from({ length: 10 }, (_, i) => ({
                id: `msg-${i + 1}`,
                senderId: i % 2 === 0 ? currentUserId : conversation.recipientId,
                senderName: i % 2 === 0 ? 'You' : conversation.recipientName,
                content: `Message ${i + 1} content goes here...`,
                timestamp: new Date(Date.now() - (10 - i) * 3600000).toISOString(),
            })));
        } finally {
            setIsLoading(false);
        }
    }, [conversation.id, conversation.recipientId, conversation.recipientName, currentUserId]);

    useEffect(() => {
        void fetchMessages();
    }, [fetchMessages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const formatReactions = (reactions: ConversationMessage['reactions']) => {
        if (!reactions) return {};
        // If it's the raw MongoDB Array format
        if (Array.isArray(reactions)) {
            const grouped: { [emoji: string]: string[] } = {};
            reactions.forEach((reaction) => {
                const uId = (typeof reaction.user === 'object' && reaction.user !== null)
                    ? reaction.user._id || reaction.user.id
                    : reaction.user;
                if (!uId || !reaction.emoji) return;

                if (!grouped[reaction.emoji]) grouped[reaction.emoji] = [];
                if (!grouped[reaction.emoji].includes(uId.toString())) {
                    grouped[reaction.emoji].push(uId.toString());
                }
            });
            return grouped;
        }
        // If it's already the grouped Dictionary format
        return reactions;
    };

    const handleSend = async () => {
        if (messageInput.trim()) {
            const content = messageInput;
            setMessageInput('');

            try {
                // Call parent handler which calls API
                const sentMessage = await onSendMessage(content);

                if (sentMessage) {
                    setMessages((prev) => {
                        const sentId = sentMessage.id || sentMessage._id;
                        if (sentId && prev.some((message) => (message.id || message._id) === sentId)) {
                            return prev;
                        }

                        return [...prev, sentMessage];
                    });
                }
            } catch {
                toast.error('Failed to send message');
                setMessageInput(content); // Restore input on failure
            }
        }
    };

    const handleReaction = async (messageId: string, emoji: string) => {
        try {
                await messagesApi.reactToMessage(messageId, emoji);
                // Optimistic update
                setMessages(prev => prev.map(msg => {
                if ((msg.id || msg._id) === messageId) {
                    const formatted = formatReactions(msg.reactions);
                    const currentEmojiTaps = formatted[emoji] || [];
                    const hasReacted = currentEmojiTaps.includes(currentUserId);
                    const newEmojiTaps = hasReacted
                        ? currentEmojiTaps.filter((id: string) => id !== currentUserId)
                        : [...currentEmojiTaps, currentUserId];

                    return {
                        ...msg,
                        reactions: {
                            ...formatted,
                            [emoji]: newEmojiTaps
                        }
                    };
                }
                return msg;
            }));
        } catch {
            toast.error('Failed to add reaction');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleToggleBlock = async () => {
        if (isUpdatingBlockStatus) {
            return;
        }

        const action = isRecipientBlocked ? 'unblock' : 'block';
        const confirmationText = isRecipientBlocked
            ? `Are you sure you want to unblock ${conversation.recipientName}?`
            : `Are you sure you want to block ${conversation.recipientName}?`;

        if (!confirm(confirmationText)) {
            return;
        }

        try {
            setIsUpdatingBlockStatus(true);

            if (isRecipientBlocked) {
                await messagesApi.unblockUser(conversation.recipientId);
                toast.success('User unblocked');
            } else {
                await messagesApi.blockUser(conversation.recipientId);
                toast.success('User blocked');
            }

            setShowMenu(false);
            await onBlockStatusChanged?.();
        } catch {
            toast.error(`Failed to ${action} user`);
        } finally {
            setIsUpdatingBlockStatus(false);
        }
    };

    const handleReport = async () => {
        const reason = prompt('Report reason:');
        if (reason) {
            try {
                await messagesApi.reportUser(conversation.recipientId, reason);
                toast.success('User reported');
                setShowMenu(false);
            } catch {
                toast.error('Failed to report user');
            }
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);

        if (diffDays === 0) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Yesterday ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg h-full min-h-0 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden">
                        <Image
                            src={conversation.recipientAvatar || '/placeholder-avatar.svg'}
                            alt={conversation.recipientName}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">{conversation.recipientName}</h3>
                        {conversation.orderId && (
                            <div className="flex items-center gap-1 text-xs text-indigo-600">
                                <FaBox className="text-xs" />
                                Order #{conversation.orderId}
                            </div>
                        )}
                    </div>
                </div>

                {/* Menu */}
                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                        <FaEllipsisV className="text-gray-600" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border z-10">
                            <button
                                onClick={handleToggleBlock}
                                disabled={isUpdatingBlockStatus}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-red-600"
                            >
                                <FaBan />
                                {isRecipientBlocked ? 'Unblock User' : 'Block User'}
                            </button>
                            <button
                                onClick={handleReport}
                                className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-orange-600"
                            >
                                <FaFlag /> Report User
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                {isLoading ? (
                    <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <>
                        {messages.map((message, index) => {
                            const actualId = message.id || message._id || `temp-${index}`;
                            const actualSenderId = typeof message.sender === 'object'
                                ? message.sender?._id || message.sender?.id
                                : message.sender || message.senderId;
                            const msgTime = message.timestamp || message.createdAt || new Date().toISOString();
                            const isOwnMessage = actualSenderId === currentUserId;
                            return (
                                <div
                                    key={actualId}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[70%] ${isOwnMessage ? 'order-2' : 'order-1'}`}>
                                        <div
                                            className={`rounded-lg px-4 py-2 ${isOwnMessage
                                                ? 'bg-indigo-600 text-white'
                                                : 'bg-gray-100 text-gray-900'
                                                }`}
                                        >
                                            <p className="text-sm break-words">{message.content}</p>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <p className={`text-xs text-gray-500 ${isOwnMessage ? 'text-right' : 'text-left'}`}>
                                                {formatTime(msgTime)}
                                            </p>
                                            {isOwnMessage && (
                                                <ReadReceipt
                                                    message={{
                                                        id: actualId,
                                                        content: message.content,
                                                        senderId: actualSenderId || '',
                                                        isRead: message.isRead
                                                    }}
                                                    currentUserId={currentUserId}
                                                />
                                            )}
                                        </div>
                                        <MessageReactions
                                            messageId={actualId}
                                            reactions={formatReactions(message.reactions)}
                                            currentUserId={currentUserId}
                                            onReact={(emoji) => handleReaction(actualId, emoji)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />

                        {/* Typing Indicator */}
                        {typingUsers.length > 0 && (
                            <div className="mb-4">
                                <TypingIndicator userName={typingUsers[0]} />
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                    <button className="p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition">
                        <FaPaperclip className="text-xl" />
                    </button>
                    <textarea
                        value={messageInput}
                        disabled={isRecipientBlocked}
                        onChange={(e) => {
                            setMessageInput(e.target.value);
                            notifyTyping();
                        }}
                        onKeyPress={handleKeyPress}
                        placeholder={isRecipientBlocked ? 'Unblock this user to send messages' : 'Type a message...'}
                        rows={1}
                        className="flex-1 px-4 py-3 text-gray-900 dark:text-blue-600 bg-white dark:bg-slate-800 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                        style={{color:"black"}}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!messageInput.trim() || isRecipientBlocked}
                        className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaPaperPlane className="text-xl" />
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    {isRecipientBlocked
                        ? 'You have blocked this user. Unblock them to send messages.'
                        : 'Press Enter to send, Shift+Enter for new line'}
                </p>
            </div>
        </div>
    );
}
