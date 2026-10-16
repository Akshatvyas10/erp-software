import { verifyAccessToken } from '../utils/tokenUtils.js';
import db from '../models/index.js';
const { User } = db;
import { getPermissions } from '../services/permissionService.js';
import { isAccessTokenBlacklisted } from '../services/session.service.js';
import { error } from '../utils/apiResponse.js';

/**
 * Verifies the Bearer JWT access token.
 * Attaches req.user, req.userRoles, req.userPermissions using the permission
 * service cache (pre-warmed by the user:login event on login).
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return error(res, 'Authentication required', 401);
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = verifyAccessToken(token);
        } catch (err) {
            if (err.name === 'TokenExpiredError') return error(res, 'Access token expired', 401);
            return error(res, 'Invalid access token', 401);
        }

        // Fast-path token blacklist check (instant revocation on logout/password change)
        if (decoded.jti && (await isAccessTokenBlacklisted(decoded.jti))) {
            return error(res, 'Token has been revoked. Please log in again.', 401);
        }

        // Lightweight user fetch — just status check, no joins needed
        const user = await User.findOne({
            where: { id: decoded.sub, isActive: true },
            attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'isActive', 'lockedUntil'],
            include: [{ model: db.Teacher, as: 'teacherProfile', attributes: ['id'] }]
        });

        if (!user) return error(res, 'User not found or deactivated', 401);
        if (user.isLocked()) return error(res, 'Account is temporarily locked', 403);

        req.user = user;
        req.tokenJti = decoded.jti;
        req.tokenExp = decoded.exp;
        if (user.teacherProfile) {
            req.user.teacherId = user.teacherProfile.id;
        }

        // Pull permissions from cache (set by permissionEmitter on login)
        // Falls back to a fresh DB fetch if cache has expired
        const permData = await getPermissions(user.id);

        req.userRoles = permData?.roles ?? [];
        req.userPermissions = permData?.permissions ?? [];
        req.permissionMap = permData?.permissionMap ?? {};

        next();
    } catch (err) {
        next(err);
    }
};

export default authenticate;
