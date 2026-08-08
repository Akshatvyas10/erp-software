'use strict';

import bcrypt from 'bcryptjs';
import db from '../models/index.js';
const { User, Role, Permission } = db;
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/tokenUtils.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import permissionEmitter from '../events/permissionEmitter.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

// ─── helpers ─────────────────────────────────────────────────────────────────

const buildTokenPayload = (user, roles, permissions) => ({
    sub: user.id,
    userId: user.userId,
    email: user.email,
    roles,
    permissions,
});

const loadUserWithRoles = async (userId) => {
    return User.findOne({
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
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { userId, password, remember } = req.body;

        const user = await User.findOne({ where: { userId, isActive: true } });
        if (!user) return error(res, 'Invalid credentials', 401);

        if (user.isLocked()) {
            const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
            return error(res, `Account locked. Try again in ${minutesLeft} minute(s).`, 403);
        }

        const isValid = await user.validatePassword(password);

        if (!isValid) {
            const attempts = user.loginAttempts + 1;
            const updates = { loginAttempts: attempts };
            if (attempts >= MAX_LOGIN_ATTEMPTS) {
                updates.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
                updates.loginAttempts = 0;
                await user.update(updates);
                return error(res, 'Too many failed attempts. Account locked for 15 minutes.', 403);
            }
            await user.update(updates);
            return error(res, `Invalid credentials. ${MAX_LOGIN_ATTEMPTS - attempts} attempt(s) remaining.`, 401);
        }

        const fullUser = await loadUserWithRoles(user.id);
        const roles = fullUser.Roles ? fullUser.Roles.map((r) => r.name) : [];
        const permissions = fullUser.Roles
            ? [...new Set(fullUser.Roles.flatMap((r) => (r.Permissions || []).map((p) => p.name)))]
            : [];

        const payload = buildTokenPayload(fullUser, roles, permissions);
        const accessToken = signAccessToken(payload);
        const refreshToken = signRefreshToken({ sub: user.id });

        const hashedRefresh = await bcrypt.hash(refreshToken, 10);
        const existingTokens = user.refreshTokenHash
            ? user.refreshTokenHash.split('||').filter(Boolean)
            : [];
        const updatedTokens = [...existingTokens.slice(-4), hashedRefresh].join('||');

        await user.update({
            loginAttempts: 0,
            lockedUntil: null,
            lastLoginAt: new Date(),
            refreshTokenHash: updatedTokens,
        });

        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: remember ? 7 * 24 * 60 * 60 * 1000 : undefined,
            path: '/api/auth',
        });

        // ── Fire login event → permission service pre-warms cache ──────────────
        permissionEmitter.emit('user:login', { userId: user.id });

        logger.info(`User logged in: ${user.userId}`);

        // Return ONLY the access token and safe user profile.
        // All permission data is served separately from GET /api/permissions/my
        // as an AES-encrypted payload — never returned in plain text here.
        return success(res, {
            accessToken,
            user: fullUser.toSafeJSON(),
        }, 'Login successful');

    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
const refresh = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;
        if (!token) return error(res, 'Refresh token missing', 401);

        let decoded;
        try { decoded = verifyRefreshToken(token); }
        catch { return error(res, 'Invalid or expired refresh token', 401); }

        const user = await User.findOne({ where: { id: decoded.sub, isActive: true } });
        if (!user || !user.refreshTokenHash) return error(res, 'Session not found', 401);

        const storedHashes = user.refreshTokenHash.split('||').filter(Boolean);
        let tokenValid = false;
        for (const hash of storedHashes) {
            if (await bcrypt.compare(token, hash)) { tokenValid = true; break; }
        }

        if (!tokenValid) {
            await user.update({ refreshTokenHash: null });
            return error(res, 'Refresh token reuse detected. Please log in again.', 401);
        }

        const fullUser = await loadUserWithRoles(user.id);
        const roles = fullUser.Roles ? fullUser.Roles.map((r) => r.name) : [];
        const permissions = fullUser.Roles
            ? [...new Set(fullUser.Roles.flatMap((r) => (r.Permissions || []).map((p) => p.name)))]
            : [];

        const accessToken = signAccessToken(buildTokenPayload(fullUser, roles, permissions));

        // ── Fire refresh event → keep permission cache warm ────────────────────
        permissionEmitter.emit('user:refresh', { userId: user.id });

        return success(res, { accessToken }, 'Token refreshed');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;

        if (token && req.user) {
            const user = await User.findByPk(req.user.id);
            if (user && user.refreshTokenHash) {
                const hashes = user.refreshTokenHash.split('||').filter(Boolean);
                const remaining = [];
                for (const hash of hashes) {
                    if (!await bcrypt.compare(token, hash)) remaining.push(hash);
                }
                await user.update({ refreshTokenHash: remaining.join('||') || null });
            }
        }

        res.clearCookie('refreshToken', { path: '/api/auth' });

        // ── Fire logout event → bust permission cache ───────────────────────────
        if (req.user) {
            permissionEmitter.emit('user:logout', { userId: req.user.id });
            logger.info(`User logged out: ${req.user.userId}`);
        }

        return success(res, null, 'Logged out successfully');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/logout-all ────────────────────────────────────────────────
const logoutAll = async (req, res, next) => {
    try {
        await User.update({ refreshTokenHash: null }, { where: { id: req.user.id } });
        res.clearCookie('refreshToken', { path: '/api/auth' });
        permissionEmitter.emit('user:logout', { userId: req.user.id });
        return success(res, null, 'Logged out from all devices');
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
const me = async (req, res, next) => {
    try {
        const user = await loadUserWithRoles(req.user.id);
        if (!user) return error(res, 'User not found', 404);

        const roles = user.Roles ? user.Roles.map((r) => r.name) : [];
        const permissions = user.Roles
            ? [...new Set(user.Roles.flatMap((r) => (r.Permissions || []).map((p) => p.name)))]
            : [];

        return success(res, { user: user.toSafeJSON(), roles, permissions });
    } catch (err) {
        next(err);
    }
};

export { login, refresh, logout, logoutAll, me };
