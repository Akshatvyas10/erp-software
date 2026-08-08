'use strict';

import db from '../models/index.js';
const { Permission } = db;
import { getPermissions, hasPermission } from '../services/permissionService.js';
import { encryptPayload } from '../utils/payloadCrypto.js';
import { success, error } from '../utils/apiResponse.js';

// ─── GET /api/permissions/my ──────────────────────────────────────────────────
/**
 * Returns the authenticated user's permission payload — AES-encrypted.
 * The frontend must decrypt it with the shared VITE_PERMISSION_ENCRYPT_KEY.
 *
 * Encrypted payload contains:
 *   { roles, permissions, permissionMap, cachedAt, sub }
 *
 * Response shape:
 *   { success: true, data: { encrypted: "<base64 cipher>" } }
 */
const getMyPermissions = async (req, res, next) => {
    try {
        const data = await getPermissions(req.user.id);
        if (!data) return error(res, 'User permissions not found', 404);

        const plainPayload = {
            sub: req.user.id,
            roles: data.roles,
            permissions: data.permissions,
            permissionMap: data.permissionMap,
            cachedAt: data.cachedAt instanceof Date
                ? data.cachedAt.toISOString()
                : new Date().toISOString(),
        };

        const encrypted = encryptPayload(plainPayload);

        return success(res, { encrypted }, 'Permissions fetched successfully');
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/permissions/check ─────────────────────────────────────────────
/**
 * Server-side single permission check.
 * Body: { resource: "students", action: "read" }
 * Response: { resource, action, allowed }
 */
const checkPermission = async (req, res, next) => {
    try {
        const { resource, action } = req.body;
        if (!resource || !action) {
            return error(res, 'resource and action are required', 422);
        }
        const allowed = await hasPermission(req.user.id, resource, action);
        return success(res, { resource, action, allowed });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/permissions/check-many ────────────────────────────────────────
/**
 * Bulk server-side permission check.
 * Body: { checks: [{ resource, action }] }
 */
const checkManyPermissions = async (req, res, next) => {
    try {
        const { checks } = req.body;
        if (!Array.isArray(checks) || checks.length === 0) {
            return error(res, 'checks must be a non-empty array', 422);
        }
        if (checks.length > 50) {
            return error(res, 'Maximum 50 checks per request', 422);
        }
        const results = await Promise.all(
            checks.map(async ({ resource, action }) => ({
                resource,
                action,
                allowed: await hasPermission(req.user.id, resource, action),
            }))
        );
        return success(res, { results });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/permissions  (admin) ───────────────────────────────────────────
const listPermissions = async (req, res, next) => {
    try {
        const permissions = await Permission.findAll({
            order: [['resource', 'ASC'], ['action', 'ASC']],
        });
        return success(res, { permissions });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/permissions  (admin) ──────────────────────────────────────────
const createPermission = async (req, res, next) => {
    try {
        const { name, resource, action, description } = req.body;
        const permission = await Permission.create({ name, resource, action, description });
        return success(res, { permission }, 'Permission created', 201);
    } catch (err) {
        next(err);
    }
};

// ─── DELETE /api/permissions/:id  (admin) ────────────────────────────────────
const deletePermission = async (req, res, next) => {
    try {
        const permission = await Permission.findByPk(req.params.id);
        if (!permission) return error(res, 'Permission not found', 404);
        await permission.destroy();
        return success(res, null, 'Permission deleted');
    } catch (err) {
        next(err);
    }
};

export {
    getMyPermissions,
    checkPermission,
    checkManyPermissions,
    listPermissions,
    createPermission,
    deletePermission,
};
