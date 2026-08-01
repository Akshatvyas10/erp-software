'use strict';

const { verifyAccessToken } = require('../utils/tokenUtils');
const { User } = require('../models');
const { getPermissions } = require('../services/permissionService');
const { error } = require('../utils/apiResponse');

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

        // Lightweight user fetch — just status check, no joins needed
        const user = await User.findOne({
            where: { id: decoded.sub, isActive: true },
            attributes: ['id', 'userId', 'email', 'firstName', 'lastName', 'isActive', 'lockedUntil'],
        });

        if (!user) return error(res, 'User not found or deactivated', 401);
        if (user.isLocked()) return error(res, 'Account is temporarily locked', 403);

        req.user = user;

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

module.exports = authenticate;
