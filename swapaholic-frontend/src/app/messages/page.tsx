'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { FaComments, FaSearch } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { messagesApi } from '../../api/messages';
import ConversationList from '../../components/messages/ConversationList';
import ChatWindow from '../../components/messages/ChatWindow';
import { socketService } from '../../utils/socket';
import { ChatConversation, ConversationMessage, ConversationSummary } from '../../types/messages';

const toChatConversation = (conversation: ConversationSummary): ChatConversation => ({
    ...conversation,
    recipientId: conversation.otherUser?.id || '',
    recipientName: conversation.otherUser?.name || 'Unknown User',
    recipientAvatar: conversation.otherUser?.avatar || '/placeholder-avatar.svg',
    messages: []
});

export default function MessagesPage() {
    return (
        <Suspense
            fallback={(
                <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <div className="text-center text-gray-500">
                        <FaComments className="mx-auto text-5xl mb-4 text-gray-300" />
                        <p>Loading messages...</p>
                    </div>
                </div>
            )}
        >
            <MessagesPageContent />
        </Suspense>
    );
}

function MessagesPageContent() {
    const searchParams = useSearchParams();
    const [conversations, setConversations] = useState<ConversationSummary[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const convList = await messagesApi.getConversations();
            setConversations(convList);
            return convList;
        } catch (err) {
            console.error('Error fetching conversations:', err);
            toast.error('Failed to load conversations');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const count = await messagesApi.getUnreadCount();
            setUnreadCount(count);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    }, []);

    // Auto-select conversation from URL param (e.g., from Contact Seller)
    const handleSelectConversation = useCallback(async (conversation: ConversationSummary) => {
        const normalizedConversation = toChatConversation(conversation);
        setSelectedConversation(normalizedConversation);

        try {
            await messagesApi.markAsRead(conversation.id);
            void fetchConversations();
            void fetchUnreadCount();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    }, [fetchConversations, fetchUnreadCount]);

    useEffect(() => {
        const conversationId = searchParams.get('conversationId');
        if (conversationId && conversations.length > 0 && !selectedConversation) {
            const targetConv = conversations.find(
                (conversation) => conversation.id === conversationId
            );
            if (targetConv) {
                void handleSelectConversation(targetConv);
            }
        }
    }, [conversations, handleSelectConversation, searchParams, selectedConversation]);

    useEffect(() => {
        void fetchConversations();
        void fetchUnreadCount();

        if (!socketService.isConnected()) {
            socketService.connect();
        }

        const handleNewMessage = (message: ConversationMessage) => {
            void fetchConversations();

            if (selectedConversation?.id === message.conversationId) {
                setSelectedConversation((prev) => {
                    if (!prev || prev.id !== message.conversationId) {
                        return prev;
                    }

                    return {
                        ...prev,
                        messages: [...(prev.messages || []), message],
                    };
                });
                return;
            }

            toast.info(`New message from ${message.senderName || 'a user'}`);
            void fetchUnreadCount();
        };

        const handleMessageRead = (data: { conversationId: string }) => {
            if (selectedConversation?.id === data.conversationId) {
                void fetchConversations();
            }
            void fetchUnreadCount();
        };

        socketService.on('new-message', handleNewMessage);
        socketService.on('message-read', handleMessageRead);

        return () => {
            socketService.off('new-message', handleNewMessage);
            socketService.off('message-read', handleMessageRead);
        };
    }, [fetchConversations, fetchUnreadCount, selectedConversation?.id]);

    const handleSendMessage = async (content: string, attachments?: File[]) => {
        if (!selectedConversation) return;

        try {
            await messagesApi.sendMessage(selectedConversation.id, content, attachments);
            // Socket will handle updating the UI
        } catch {
            toast.error('Failed to send message');
        }
    };

    const handleSearch = async (query: string) => {
        setSearchTerm(query);
        if (query.trim()) {
            try {
                const matchingConversations = await messagesApi.searchConversations(query);
                setConversations(matchingConversations);
            } catch (err) {
                console.error('Error searching:', err);
            }
        } else {
            void fetchConversations();
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-gray-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <FaComments className="text-4xl text-indigo-600" />
                            <div>
                                <h1 className="text-4xl font-extrabold text-gray-900">
                                    Messages 💬
                                </h1>
                                <p className="text-gray-600">
                                    {unreadCount > 0 ? `${unreadCount} unread message${unreadCount > 1 ? 's' : ''}` : 'No unread messages'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Chat Container */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)] relative">
                    {/* Conversations Sidebar */}
                    <div className={`lg:col-span-1 bg-white rounded-lg shadow-lg overflow-hidden flex-col h-full ${selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                        {/* Search */}
                        <div className="p-4 border-b">
                            <div className="relative">
                                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search conversations..."
                                    value={searchTerm}
                                    onChange={(e) => handleSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>

                        {/* Conversation List */}
                        <ConversationList
                            conversations={conversations}
                            selectedConversation={selectedConversation}
                            onSelectConversation={handleSelectConversation}
                            isLoading={isLoading}
                        />
                    </div>

                    {/* Chat Window */}
                    <div className={`lg:col-span-2 bg-white rounded-lg shadow-lg h-full overflow-hidden flex-col ${!selectedConversation ? 'hidden lg:flex' : 'flex'}`}>
                        {selectedConversation ? (
                            <div className="flex flex-col h-full">
                                {/* Mobile Back Button */}
                                <div className="lg:hidden p-3 border-b border-gray-100 bg-gray-50/50 flex items-center">
                                    <button 
                                        onClick={() => setSelectedConversation(null)}
                                        className="text-indigo-600 font-medium flex items-center gap-2 hover:text-indigo-800 transition"
                                    >
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                        </svg>
                                        Back to Messages
                                    </button>
                                </div>
                                <div className="flex-1 relative">
                                    <ChatWindow
                                        conversation={selectedConversation}
                                        onSendMessage={handleSendMessage}
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <FaComments className="mx-auto text-6xl mb-4 text-gray-300" />
                                    <p className="text-lg font-medium">Your Messages</p>
                                    <p className="text-sm mt-1">Select a conversation to start messaging</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
