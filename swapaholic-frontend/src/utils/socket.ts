import { io, Socket } from 'socket.io-client';
import { store } from '../store/store';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

class SocketService {
    private socket: Socket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;

    connect() {
        if (this.socket?.connected) {
            console.log('Socket already connected');
            return this.socket;
        }

        const state = store.getState();
        const token = state.auth.accessToken;
        const userId = state.auth.user?.id;

        if (!token || !userId) {
            console.warn('Cannot connect to socket: No token or user ID');
            return null;
        }

        this.socket = io(SOCKET_URL, {
            auth: {
                token,
                userId
            },
            transports: ['websocket', 'polling'],
            reconnectionAttempts: this.maxReconnectAttempts,
            reconnectionDelay: 1000,
            withCredentials: true,
        });

        this.socket.on('connect', () => {
            console.log('✅ Socket.IO connected:', this.socket?.id);
            this.reconnectAttempts = 0;
        });

        this.socket.on('disconnect', (reason) => {
            console.log('❌ Socket.IO disconnected:', reason);
        });

        this.socket.on('connect_error', (error) => {
            console.error('Socket.IO connection error:', error);
            this.reconnectAttempts++;

            if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                console.error('Max reconnection attempts reached');
            }
        });

        this.socket.on('connected', (data) => {
            console.log('Server confirmed connection:', data);
        });

        return this.socket;
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
            console.log('Socket.IO disconnected manually');
        }
    }

    on(event: string, callback: (...args: any[]) => void) {
        if (!this.socket) {
            console.warn('Socket not connected. Call connect() first');
            return;
        }
        this.socket.on(event, callback);
    }

    off(event: string, callback?: (...args: any[]) => void) {
        if (!this.socket) return;
        if (callback) {
            this.socket.off(event, callback);
        } else {
            this.socket.off(event);
        }
    }

    emit(event: string, data: any) {
        if (!this.socket) {
            console.warn('Socket not connected. Cannot emit event');
            return;
        }
        this.socket.emit(event, data);
    }

    isConnected() {
        return this.socket?.connected || false;
    }

    getSocket() {
        return this.socket;
    }
}

// Export singleton instance
export const socketService = new SocketService();

// Legacy exports for compatibility
export const getSocket = () => socketService.getSocket();
export const connectSocket = () => socketService.connect();
export const disconnectSocket = () => socketService.disconnect();
