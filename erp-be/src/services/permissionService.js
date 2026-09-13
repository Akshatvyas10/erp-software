import db from '../models/index.js';
const { User, Role, Permission } = db;
import permissionEmitter from '../events/permissionEmitter.js';
import logger from '../utils/logger.js';
import redisClient, { getRedisStatus } from '../config/redis.js';
import { getIo } from '../config/socket.js';

const CACHE_TTL = 15 * 60; // 15 minutes in seconds
const fallbackCache = new Map(); // Fallback in-memory cache

// ─── Internal helpers ────────────────────────────────────────────────────────

const fetchFromDB = async (userId) => {
    const user = await User.findOne({
        where: { id: userId, isActive: true },
        include: [
            {
                model: Role,
                as: 'Roles',
                where: { isActive: true },
                required: false,
                through: { attributes: [] },
                include: [
                    {
                        model: Permission,
                        as: 'Permissions',
                        through: { attributes: [] },
                        required: false,
                    },
                ],
            },
        ],
    });

    if (!user) return null;

    const roles = user.Roles ? user.Roles.map((r) => r.name) : [];
    const permissions = user.Roles
        ? [...new Set(user.Roles.flatMap((r) => (r.Permissions || []).map((p) => p.name)))]
        : [];

    const permissionMap = {};
    for (const perm of permissions) {
        const [resource, action] = perm.split(':');
        if (!permissionMap[resource]) permissionMap[resource] = [];
        if (!permissionMap[resource].includes(action)) {
            permissionMap[resource].push(action);
        }
    }

    return { roles, permissions, permissionMap };
};

// ─── Cache operations ─────────────────────────────────────────────────────────

const setCacheEntry = async (userId, data) => {
    try {
        let version = 1;

        if (getRedisStatus()) {
            const key = `user:permissions:${userId}`;
            const existingDataStr = await redisClient.get(key);
            
            if (existingDataStr) {
                const existingData = JSON.parse(existingDataStr);
                version = existingData.version || 1;
            }

            const payload = { ...data, version, cachedAt: new Date().toISOString() };
            await redisClient.setex(key, CACHE_TTL, JSON.stringify(payload));
            return payload;
        } else {
            // Fallback to in-memory map
            const existing = fallbackCache.get(userId);
            version = existing ? existing.version : 1;
            const payload = { ...data, version, cachedAt: new Date().toISOString() };
            fallbackCache.set(userId, { payload, expiresAt: Date.now() + CACHE_TTL * 1000 });
            return payload;
        }
    } catch (err) {
        logger.error(`Cache set error for user ${userId}:`, err);
        return { ...data, version: 1 };
    }
};

const getCacheEntry = async (userId) => {
    try {
        if (getRedisStatus()) {
            const key = `user:permissions:${userId}`;
            const dataStr = await redisClient.get(key);
            if (!dataStr) return null;
            return JSON.parse(dataStr);
        } else {
            // Fallback
            const existing = fallbackCache.get(userId);
            if (!existing) return null;
            if (Date.now() > existing.expiresAt) {
                fallbackCache.delete(userId);
                return null;
            }
            return existing.payload;
        }
    } catch (err) {
        logger.error(`Cache get error for user ${userId}:`, err);
        return null;
    }
};

export const bustCache = async (userId) => {
    try {
        const newVersion = Date.now();
        if (getRedisStatus()) {
            const key = `user:permissions:${userId}`;
            await redisClient.del(key);
        } else {
            fallbackCache.delete(userId);
        }
        
        logger.debug(`[PermissionService] Cache busted for user ${userId}, new version: ${newVersion}`);
        return newVersion;
    } catch (err) {
        logger.error(`bustCache error for user ${userId}:`, err);
        return Date.now();
    }
};

export const invalidateAndEmit = async (userId) => {
    try {
        const newVersion = await bustCache(userId);
        
        // Emit to affected user's private room
        const io = getIo();
        if (io) {
            io.to(`user:${userId}`).emit('permissions:updated', {
                type: 'permissions:updated',
                userId,
                version: newVersion,
                updatedAt: new Date().toISOString()
            });
            logger.info(`[PermissionService] Emitted permissions:updated (v${newVersion}) to user:${userId}`);
        }
    } catch (err) {
        logger.error(`Failed to invalidate and emit for user ${userId}`, err);
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const getPermissions = async (userId) => {
    const cached = await getCacheEntry(userId);
    if (cached) {
        logger.debug(`[PermissionService] Cache HIT for user ${userId}`);
        return cached;
    }

    logger.debug(`[PermissionService] Cache MISS — loading from DB for user ${userId}`);
    const data = await fetchFromDB(userId);
    if (!data) return null;

    return await setCacheEntry(userId, data);
};

export const hasPermission = async (userId, resource, action) => {
    const data = await getPermissions(userId);
    if (!data) return false;

    const { permissionMap, roles } = data;

    if (roles.includes('super_admin')) return true;
    if (permissionMap['all']?.includes('manage')) return true;
    if (permissionMap[resource]?.includes('manage')) return true;

    return permissionMap[resource]?.includes(action) ?? false;
};

export const refreshPermissions = async (userId) => {
    await invalidateAndEmit(userId);
    return getPermissions(userId);
};

// ─── Event listeners ──────────────────────────────────────────────────────────

permissionEmitter.on('user:login', async ({ userId }) => {
    try {
        await bustCache(userId);
        const data = await fetchFromDB(userId);
        if (data) {
            await setCacheEntry(userId, data);
            logger.info(`[PermissionService] Permissions pre-cached on login for user ${userId}`);
        }
    } catch (err) {
        logger.error(`[PermissionService] Failed to pre-cache on login for ${userId}:`, err);
    }
});

permissionEmitter.on('user:logout', async ({ userId }) => {
    await bustCache(userId);
});

permissionEmitter.on('role:changed', async ({ userId }) => {
    await invalidateAndEmit(userId);
    logger.info(`[PermissionService] Cache cleared & event emitted after role change for user ${userId}`);
});

permissionEmitter.on('user:refresh', async ({ userId }) => {
    try {
        const cached = await getCacheEntry(userId);
        if (!cached) {
            const data = await fetchFromDB(userId);
            if (data) await setCacheEntry(userId, data);
        }
    } catch (err) {
        logger.error(`[PermissionService] Failed to warm cache on refresh for ${userId}:`, err);
    }
});
