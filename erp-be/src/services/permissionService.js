import db from '../models/index.js';
const { User, Role, Permission } = db;
import permissionEmitter from '../events/permissionEmitter.js';
import logger from '../utils/logger.js';

/**
 * In-process permission cache.
 * Structure: Map<userId, { roles: string[], permissions: string[], cachedAt: Date }>
 *
 * TTL is 15 minutes — matches the access token lifetime.
 * The cache is also busted immediately on logout or role change.
 */
const CACHE_TTL_MS = 15 * 60 * 1000;
const permissionCache = new Map();

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Load roles + permissions for a user directly from the DB.
 */
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

    // Build a structured permission map  { "users": ["read","create",...], ... }
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

const setCacheEntry = (userId, data) => {
    permissionCache.set(userId, { ...data, cachedAt: new Date() });
};

const getCacheEntry = (userId) => {
    const entry = permissionCache.get(userId);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt.getTime() > CACHE_TTL_MS) {
        permissionCache.delete(userId);
        return null;
    }
    return entry;
};

export const bustCache = (userId) => {
    permissionCache.delete(userId);
    logger.debug(`[PermissionService] Cache busted for user ${userId}`);
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get permissions for a user.
 * Returns from cache if fresh, otherwise fetches from DB and caches.
 */
export const getPermissions = async (userId) => {
    const cached = getCacheEntry(userId);
    if (cached) {
        logger.debug(`[PermissionService] Cache HIT for user ${userId}`);
        return cached;
    }

    logger.debug(`[PermissionService] Cache MISS — loading from DB for user ${userId}`);
    const data = await fetchFromDB(userId);
    if (!data) return null;

    setCacheEntry(userId, data);
    return data;
};

/**
 * Check whether a user has a specific permission.
 * Supports wildcard: if user has "all:manage" or "<resource>:manage" they pass any check.
 *
 * @param {string} userId
 * @param {string} resource  e.g. "students"
 * @param {string} action    e.g. "read"
 */
export const hasPermission = async (userId, resource, action) => {
    const data = await getPermissions(userId);
    if (!data) return false;

    const { permissionMap, roles } = data;

    // super_admin role bypasses all checks
    if (roles.includes('super_admin')) return true;

    // all:manage wildcard
    if (permissionMap['all']?.includes('manage')) return true;

    // resource-level manage grants all actions on that resource
    if (permissionMap[resource]?.includes('manage')) return true;

    // exact match
    return permissionMap[resource]?.includes(action) ?? false;
};

/**
 * Force-refresh the cache for a user (call after role/permission changes).
 */
export const refreshPermissions = async (userId) => {
    bustCache(userId);
    return getPermissions(userId);
};

// ─── Event listeners ──────────────────────────────────────────────────────────

/**
 * user:login — pre-warm the cache as soon as the user logs in.
 * This means the first authenticated request after login is instant.
 */
permissionEmitter.on('user:login', async ({ userId }) => {
    try {
        bustCache(userId); // always start fresh on login
        const data = await fetchFromDB(userId);
        if (data) {
            setCacheEntry(userId, data);
            logger.info(`[PermissionService] Permissions pre-cached on login for user ${userId} — ${data.permissions.length} permissions, roles: [${data.roles.join(', ')}]`);
        }
    } catch (err) {
        logger.error(`[PermissionService] Failed to pre-cache on login for ${userId}:`, err);
    }
});

/**
 * user:logout — clear cache on logout.
 */
permissionEmitter.on('user:logout', ({ userId }) => {
    bustCache(userId);
});

/**
 * role:changed — clear cache when admin mutates roles/permissions for a user.
 */
permissionEmitter.on('role:changed', ({ userId }) => {
    bustCache(userId);
    logger.info(`[PermissionService] Cache cleared after role change for user ${userId}`);
});

/**
 * user:refresh — called on token refresh, ensures cache is still warm.
 */
permissionEmitter.on('user:refresh', async ({ userId }) => {
    try {
        // Only re-fetch if the cache is already expired (don't thrash on every refresh)
        if (!getCacheEntry(userId)) {
            const data = await fetchFromDB(userId);
            if (data) setCacheEntry(userId, data);
        }
    } catch (err) {
        logger.error(`[PermissionService] Failed to warm cache on refresh for ${userId}:`, err);
    }
});
