import { hasPermission } from '../services/permissionService.js';
import { error } from '../utils/apiResponse.js';

/**
 * requirePermission('students', 'read')
 *
 * Async middleware — checks the permission service cache (populated by the
 * user:login event emitter) instead of re-querying the DB on every request.
 *
 * Supports:
 *   - Multiple permission pairs:  requirePermission('students','read', 'teachers','read')
 *     → user must pass ALL listed checks
 */
export const requirePermission = (...pairs) => {
    if (pairs.length % 2 !== 0) {
        throw new Error('requirePermission: arguments must be resource/action pairs e.g. ("students","read")');
    }

    return async (req, res, next) => {
        if (!req.user) return error(res, 'Authentication required', 401);

        for (let i = 0; i < pairs.length; i += 2) {
            const resource = pairs[i];
            const action = pairs[i + 1];
            const allowed = await hasPermission(req.user.id, resource, action);

            if (!allowed) {
                return error(res, `Forbidden — missing permission: ${resource}:${action}`, 403);
            }
        }

        next();
    };
};

/**
 * requireRole('admin', 'teacher')
 * User must have ANY of the listed roles.
 */
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) return error(res, 'Authentication required', 401);

        const userRolesLower = (req.userRoles || []).map(r => r.toLowerCase());
        if (userRolesLower.includes('super_admin')) return next();

        const hasRole = roles.some((r) => userRolesLower.includes(r.toLowerCase()));
        if (!hasRole) {
            return error(res, `Forbidden — required role: ${roles.join(' or ')}`, 403);
        }
        next();
    };
};

/**
 * requireSelf(paramName, overridePermission)
 * User can only access their own resource unless they have the override permission.
 */
export const requireSelf = (paramName = 'id', overrideResource = null, overrideAction = 'manage') => {
    return async (req, res, next) => {
        if (!req.user) return error(res, 'Authentication required', 401);

        const userRolesLower = (req.userRoles || []).map(r => r.toLowerCase());
        if (userRolesLower.includes('super_admin')) return next();

        if (overrideResource) {
            const allowed = await hasPermission(req.user.id, overrideResource, overrideAction);
            if (allowed) return next();
        }

        if (req.user.id !== req.params[paramName]) {
            return error(res, 'Forbidden — you can only access your own resource', 403);
        }

        next();
    };
};
