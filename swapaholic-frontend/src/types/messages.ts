export interface MessageAttachment {
    url: string;
    type: 'image' | 'file' | 'video';
    name?: string;
    size?: number;
}

export interface ConversationSummary {
    id: string;
    otherUser: {
        id: string;
        name: string;
        avatar?: string | null;
    } | null;
    lastMessage: {
        content: string;
        sender?: string;
        createdAt: string;
    } | null;
    unreadCount: number;
    orderId?: string;
    updatedAt: string;
}

export interface ConversationMessage {
    id?: string;
    _id?: string;
    conversationId?: string;
    senderId?: string;
    senderName?: string;
    sender?:
        | string
        | {
            _id?: string;
            id?: string;
            firstName?: string;
            lastName?: string;
            profilePicture?: string | null;
        };
    content: string;
    timestamp?: string;
    createdAt?: string;
    attachments?: MessageAttachment[];
    isRead?: boolean;
    reactions?:
        | Record<string, string[]>
        | Array<{
            user: string | { _id?: string; id?: string };
            emoji: string;
        }>;
}

export interface ChatConversation extends ConversationSummary {
    recipientId: string;
    recipientName: string;
    recipientAvatar: string;
    messages?: ConversationMessage[];
}
