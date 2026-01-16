'use client';

import { useState, useEffect } from 'react';
import { FaComments, FaSearch, FaPlus } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { messagesApi } from '../../api/messages';
import ConversationList from '../../components/messages/ConversationList';
import ChatWindow from '../../components/messages/ChatWindow';
import { socketService } from '../../utils/socket';

export default function MessagesPage() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [selectedConversation, setSelectedConversation] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        fetchConversations();
        fetchUnreadCount();
        setupSocketListeners();

        return () => {
            socketService.off('new-message');
            socketService.off('message-read');
        };
    }, []);

    const setupSocketListeners = () => {
        // Listen for new messages
        socketService.on('new-message', (message: any) => {
            // Update conversation list
            fetchConversations();
            // If message is for current conversation, update chat
            if (selectedConversation && message.conversationId === selectedConversation.id) {
                setSelectedConversation((prev: any) => ({
                    ...prev,
                    messages: [...(prev.messages || []), message],
                }));
            } else {
                // Show notification
                toast.info(`New message from ${message.senderName}`);
                fetchUnreadCount();
            }
        });

        // Listen for read receipts
        socketService.on('message-read', (data: any) => {
            if (selectedConversation && data.conversationId === selectedConversation.id) {
                fetchConversations();
            }
            fetchUnreadCount();
        });
    };

    const fetchConversations = async () => {
        try {
            setIsLoading(true);
            const data = await messagesApi.getConversations();
            setConversations(data.conversations || []);
        } catch (err) {
            console.error('Error fetching conversations:', err);
            // Mock data
            setConversations(Array.from({ length: 10 }, (_, i) => ({
                id: `conv-${i + 1}`,
                recipientName: `User ${i + 1}`,
                recipientAvatar: '/placeholder-avatar.jpg',
                lastMessage: `Last message from conversation ${i + 1}`,
                lastMessageTime: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
                unreadCount: Math.floor(Math.random() * 5),
                orderId: i % 3 === 0 ? `order-${i + 1}` : null,
            })));
        } finally {
            setIsLoading(false);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const data = await messagesApi.getUnreadCount();
            setUnreadCount(data.count || 0);
        } catch (err) {
            console.error('Error fetching unread count:', err);
        }
    };

    const handleSelectConversation = async (conversation: any) => {
        setSelectedConversation(conversation);

        // Mark as read
        try {
            await messagesApi.markAsRead(conversation.id);
            fetchConversations();
            fetchUnreadCount();
        } catch (err) {
            console.error('Error marking as read:', err);
        }
    };

    const handleSendMessage = async (content: string, attachments?: File[]) => {
        if (!selectedConversation) return;

        try {
            await messagesApi.sendMessage(selectedConversation.id, content, attachments);
            // Socket will handle updating the UI
        } catch (err) {
            toast.error('Failed to send message');
        }
    };

    const handleSearch = async (query: string) => {
        setSearchTerm(query);
        if (query.trim()) {
            try {
                const data = await messagesApi.searchConversations(query);
                setConversations(data.conversations || []);
            } catch (err) {
                console.error('Error searching:', err);
            }
        } else {
            fetchConversations();
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
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
                    {/* Conversations Sidebar */}
                    <div className="lg:col-span-1 bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
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
                    <div className="lg:col-span-2">
                        {selectedConversation ? (
                            <ChatWindow
                                conversation={selectedConversation}
                                onSendMessage={handleSendMessage}
                            />
                        ) : (
                            <div className="bg-white rounded-lg shadow-lg h-full flex items-center justify-center">
                                <div className="text-center text-gray-500">
                                    <FaComments className="mx-auto text-6xl mb-4 text-gray-300" />
                                    <p className="text-lg">Select a conversation to start messaging</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
