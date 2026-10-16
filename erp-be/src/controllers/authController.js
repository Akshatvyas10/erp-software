'use strict';

import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import db from '../models/index.js';
const { User, Role, Permission } = db;
import { signAccessToken, signRefreshToken, verifyRefreshToken, signResetToken } from '../utils/tokenUtils.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import permissionEmitter from '../events/permissionEmitter.js';
import {
    createSession,
    validateSession,
    revokeSession,
    revokeAllUserSessions,
    blacklistAccessToken
} from '../services/session.service.js';

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
            {
                model: db.Teacher,
                as: 'teacherProfile',
                attributes: ['id']
            }
        ],
    });
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
    try {
        const { userId, password, remember } = req.body;
        const identifier = (userId || '').trim();

        // Allow login with either userId (case-insensitive) or email (case-insensitive)
        const user = await User.findOne({
            where: {
                [Op.and]: [
                    { isActive: true },
                    {
                        [Op.or]: [
                            { userId: identifier },
                            { email: identifier.toLowerCase() }
                        ]
                    }
                ]
            }
        });
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

        // Decode refresh token to grab its unique JTI and persist in Redis session store
        const decodedRefresh = verifyRefreshToken(refreshToken);
        await createSession(user.id, decodedRefresh.jti, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

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

        // 1. Verify Redis session (or fallback)
        const isSessionActive = await validateSession(decoded.sub, decoded.jti);
        if (!isSessionActive) {
            return error(res, 'Session expired or invalidated. Please log in again.', 401);
        }

        const user = await User.findOne({ where: { id: decoded.sub, isActive: true } });
        if (!user) return error(res, 'User not found or deactivated', 401);

        // 2. Rotate session in Redis: Revoke old refresh token, generate new paired tokens
        await revokeSession(user.id, decoded.jti);

        const fullUser = await loadUserWithRoles(user.id);
        const roles = fullUser.Roles ? fullUser.Roles.map((r) => r.name) : [];
        const permissions = fullUser.Roles
            ? [...new Set(fullUser.Roles.flatMap((r) => (r.Permissions || []).map((p) => p.name)))]
            : [];

        const newAccessToken = signAccessToken(buildTokenPayload(fullUser, roles, permissions));
        const newRefreshToken = signRefreshToken({ sub: user.id });
        const newDecodedRefresh = verifyRefreshToken(newRefreshToken);

        await createSession(user.id, newDecodedRefresh.jti, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });

        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: '/api/auth',
        });

        // ── Fire refresh event → keep permission cache warm ────────────────────
        permissionEmitter.emit('user:refresh', { userId: user.id });

        return success(res, { accessToken: newAccessToken }, 'Token refreshed');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        // 1. Blacklist active access token in Redis
        if (req.tokenJti && req.tokenExp) {
            await blacklistAccessToken(req.tokenJti, req.tokenExp);
        }

        // 2. Revoke refresh token session in Redis
        if (refreshToken) {
            try {
                const decoded = verifyRefreshToken(refreshToken);
                if (decoded && decoded.jti) {
                    await revokeSession(decoded.sub, decoded.jti);
                }
            } catch {
                // Ignore expired token decoding error on logout
            }
        }

        if (req.user) {
            await User.update({ refreshTokenHash: null }, { where: { id: req.user.id } });
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
        if (req.tokenJti && req.tokenExp) {
            await blacklistAccessToken(req.tokenJti, req.tokenExp);
        }

        await revokeAllUserSessions(req.user.id);
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

// ─── POST /api/auth/forgot-password ──────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
    try {
        const rawIdentifier = (req.body.identifier || req.body.email || '').trim();
        if (!rawIdentifier) {
            return error(res, 'Username, email or mobile number is required', 422);
        }

        // Look up by email, userId (username), or phone
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: rawIdentifier.toLowerCase() },
                    { userId: rawIdentifier },
                    { phone: rawIdentifier },
                ],
                isActive: true,
            },
        });

        // If account does not exist, return an explicit 404 error message
        if (!user) {
            return error(
                res,
                'No account found. Check your username, email or mobile number and try again.',
                404
            );
        }

        // Security check: verify the user has a valid registered email address
        if (!user.email || !user.email.includes('@')) {
            return error(
                res,
                'This account does not have a verified email address associated for password reset. Please contact administration.',
                400
            );
        }

        const resetToken = signResetToken({ sub: user.id, email: user.email });
        const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
        const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;

        try {
            const { sendPasswordResetEmail } = await import('../services/email.service.js');
            await sendPasswordResetEmail(user.email, resetLink);
        } catch (emailErr) {
            logger.error(`[ForgotPassword] Failed to send email to ${user.email}: ${emailErr.message}`);
            return error(res, 'Failed to send password reset email. Please try again later.', 500);
        }

        return success(
            res,
            null,
            `Password reset link has been sent to your registered email address (${user.email.replace(/(.{2})(.*)(?=@)/, '$1***')}).`
        );
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/auth/reset-password ───────────────────────────────────────────
const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return error(res, 'Token and new password are required', 422);
        }

        if (newPassword.length < 6) {
            return error(res, 'Password must be at least 6 characters', 422);
        }

        let decoded;
        try {
            const { verifyResetToken } = await import('../utils/tokenUtils.js');
            decoded = verifyResetToken(token);
        } catch (err) {
            return error(res, 'Invalid or expired reset token', 400);
        }

        const user = await User.findByPk(decoded.sub);
        if (!user || !user.isActive) {
            return error(res, 'User not found or inactive', 404);
        }

        user.password = newPassword;
        user.refreshTokenHash = null; // Invalidate existing sessions in DB
        user.loginAttempts = 0;
        user.lockedUntil = null;
        await user.save();

        // Revoke all active Redis sessions
        await revokeAllUserSessions(user.id);

        logger.info(`[ResetPassword] Password reset successfully and sessions invalidated for user: ${user.userId}`);
        return success(res, null, 'Password reset successfully. You can now login with your new password.');
    } catch (err) {
        next(err);
    }
};

export { login, refresh, logout, logoutAll, me, forgotPassword, resetPassword };

