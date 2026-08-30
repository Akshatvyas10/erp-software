import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/tokenUtils.js';
import db from '../models/index.js';
import logger from '../utils/logger.js';

const { User } = db;
let io;

export const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });

    // Socket Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const authHeader = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
            if (!authHeader) {
                return next(new Error('Authentication error'));
            }

            const token = authHeader.replace('Bearer ', '');
            const decoded = verifyAccessToken(token);

            const user = await User.findOne({
                where: { id: decoded.sub, isActive: true },
                attributes: ['id', 'isActive', 'lockedUntil'],
            });

            if (!user) return next(new Error('User not found or deactivated'));
            if (user.isLocked()) return next(new Error('Account is temporarily locked'));

            socket.user = user;
            next();
        } catch (err) {
            logger.error('Socket authentication failed', err);
            next(new Error('Authentication error'));
        }
    });

    io.on('connection', (socket) => {
        const userId = socket.user.id;
        const roomName = `user:${userId}`;
        
        // Join the private room for this user
        socket.join(roomName);
        logger.info(`Socket ${socket.id} authenticated and joined room ${roomName}`);

        socket.on('disconnect', () => {
            logger.info(`Socket ${socket.id} disconnected`);
        });
    });

    return io;
};

export const getIo = () => {
    if (!io) {
        throw new Error('Socket.io is not initialized!');
    }
    return io;
};
