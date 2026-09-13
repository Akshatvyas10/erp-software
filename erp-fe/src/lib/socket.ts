import { io, Socket } from 'socket.io-client';


let socket: Socket | null = null;

export const initializeSocket = (token: string) => {
    if (socket) return socket;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');

    socket = io(baseUrl, {
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
