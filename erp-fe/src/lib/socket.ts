import { io, Socket } from 'socket.io-client';
import { store } from '@/store'; // Assuming a redux store exists, will double check

let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
    if (socket) return socket;

    socket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
        auth: { token: `Bearer ${token}` },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
    });

    socket.on('connect', () => {
        console.log('[Socket.IO] Connected');
    });

    socket.on('disconnect', () => {
        console.log('[Socket.IO] Disconnected');
    });

    return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};
