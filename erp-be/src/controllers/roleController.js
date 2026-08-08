'use strict';

import { Op } from 'sequelize';
import db from '../models/index.js';
const { Role, Permission, User } = db;
import { success, error } from '../utils/apiResponse.js';
import permissionEmitter from '../events/permissionEmitter.js';

// ─── shared include helpers ───────────────────────────────────────────────────

/** Include permissions on a role */
const withPermissions = {
    model: Permission,
    as: 'Permissions',
    through: { attributes: [] },
};

/** Include users (safe fields only) on a role */
const withUsers = {
    model: User,
    as: 'Users',
    through: { attributes: [] },
    attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'isActive'],
    required: false,
};

// ─── GET /api/roles ───────────────────────────────────────────────────────────
/**
 * Returns all roles with their permissions AND the list of assigned users
 * (id, userId, firstName, lastName, email, isActive).
 */
const listRoles = async (req, res, next) => {
    try {
        const roles = await Role.findAll({
            include: [withPermissions, withUsers],
            order: [['name', 'ASC']],
        });
        return success(res, { roles });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/roles/:id ───────────────────────────────────────────────────────
const getRole = async (req, res, next) => {
    try {
        const role = await Role.findByPk(req.params.id, {
            include: [withPermissions, withUsers],
        });
        if (!role) return error(res, 'Role not found', 404);
        return success(res, { role });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/roles/:id/users ─────────────────────────────────────────────────
/**
 * Paginated list of users assigned to a specific role.
 * Query params: ?page=1&limit=20&search=
 */
const getRoleUsers = async (req, res, next) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return error(res, 'Role not found', 404);

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = req.query.search || '';

        const userWhere = search
            ? {
                [Op.or]: [
                    { userId: { [Op.iLike]: `%${search}%` } },
                    { firstName: { [Op.iLike]: `%${search}%` } },
                    { lastName: { [Op.iLike]: `%${search}%` } },
                    { email: { [Op.iLike]: `%${search}%` } },
                ],
            }
            : {};

        const { count, rows } = await User.findAndCountAll({
            where: userWhere,
            include: [{ model: Role, as: 'Roles', where: { id: role.id }, through: { attributes: [] }, required: true }],
            attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'isActive', 'lastLoginAt'],
            limit,
            offset,
            order: [['firstName', 'ASC']],
            distinct: true,
        });

        return success(res, {
            role: { id: role.id, name: role.name },
            users: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) {
        next(err);
    }
};

// ─── GET /api/roles/users/search ─────────────────────────────────────────────
/**
 * Search ALL users (admin, teacher, student) to find someone to assign a role to.
 * Query params: ?q=akshat&limit=10
 * Returns safe user fields + current roles.
 */
const searchUsers = async (req, res, next) => {
    try {
        const q = (req.query.q || '').trim();
        const limit = Math.min(50, parseInt(req.query.limit) || 10);

        if (!q) return success(res, { users: [] });

        const users = await User.findAll({
            where: {
                [Op.or]: [
                    { userId: { [Op.iLike]: `%${q}%` } },
                    { firstName: { [Op.iLike]: `%${q}%` } },
                    { lastName: { [Op.iLike]: `%${q}%` } },
                    { email: { [Op.iLike]: `%${q}%` } },
                ],
            },
            include: [
                {
                    model: Role,
                    as: 'Roles',
                    through: { attributes: [] },
                    required: false,
                    attributes: ['id', 'name'],
                },
            ],
            attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'isActive'],
            limit,
            order: [['firstName', 'ASC']],
        });

        return success(res, { users });
    } catch (err) {
        next(err);
    }
};

// ─── POST /api/roles ──────────────────────────────────────────────────────────
const createRole = async (req, res, next) => {
    try {
        const { name, description, permissionIds } = req.body;
        const role = await Role.create({ name, description });

        if (permissionIds?.length) {
            const perms = await Permission.findAll({ where: { id: permissionIds } });
            await role.setPermissions(perms);
        }

        const created = await Role.findByPk(role.id, { include: [withPermissions, withUsers] });
        return success(res, { role: created }, 'Role created', 201);
    } catch (err) {
        next(err);
    }
};

// ─── PUT /api/roles/:id ───────────────────────────────────────────────────────
const updateRole = async (req, res, next) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return error(res, 'Role not found', 404);

        const { name, description, isActive, permissionIds } = req.body;
        await role.update({ name, description, isActive });

        if (permissionIds !== undefined) {
            const perms = await Permission.findAll({ where: { id: permissionIds } });
            await role.setPermissions(perms);

            // Bust permission cache for all users who carry this role
            const affected = await User.findAll({
                include: [{ model: Role, as: 'Roles', where: { id: role.id }, through: { attributes: [] }, required: true }],
                attributes: ['id'],
            });
            for (const u of affected) permissionEmitter.emit('role:changed', { userId: u.id });
        }

        const updated = await Role.findByPk(role.id, { include: [withPermissions, withUsers] });
        return success(res, { role: updated }, 'Role updated');
    } catch (err) {
        next(err);
    }
};

// ─── DELETE /api/roles/:id ────────────────────────────────────────────────────
const deleteRole = async (req, res, next) => {
    try {
        const role = await Role.findByPk(req.params.id);
        if (!role) return error(res, 'Role not found', 404);

        const affected = await User.findAll({
            include: [{ model: Role, as: 'Roles', where: { id: role.id }, through: { attributes: [] }, required: true }],
            attributes: ['id'],
        });
        for (const u of affected) permissionEmitter.emit('role:changed', { userId: u.id });

        await role.destroy();
        return success(res, null, 'Role deleted');
    } catch (err) {
        next(err);
    }
};

// ─── PATCH /api/roles/:id/users/:userId ──────────────────────────────────────
/**
 * Assign or remove a role from any user (admin, teacher, student).
 * Body: { action: "assign" | "remove" }
 */
const assignRoleToUser = async (req, res, next) => {
    try {
        const { id: roleId, userId } = req.params;
        const { action } = req.body;

        const role = await Role.findByPk(roleId);
        if (!role) return error(res, 'Role not found', 404);

        const user = await User.findByPk(userId);
        if (!user) return error(res, 'User not found', 404);

        if (action === 'assign') {
            await user.addRole(role);
        } else if (action === 'remove') {
            await user.removeRole(role);
        } else {
            return error(res, 'action must be "assign" or "remove"', 422);
        }

        permissionEmitter.emit('role:changed', { userId: user.id });

        // Return updated user info with all roles
        const updatedUser = await User.findByPk(user.id, {
            attributes: ['id', 'userId', 'firstName', 'lastName', 'email', 'isActive'],
            include: [{ model: Role, as: 'Roles', through: { attributes: [] }, attributes: ['id', 'name'] }],
        });

        return success(res, {
            user: updatedUser,
            message: `Role "${role.name}" ${action === 'assign' ? 'assigned to' : 'removed from'} ${user.firstName} ${user.lastName}`,
        }, `Role ${action}ed successfully`);
    } catch (err) {
        next(err);
    }
};

export {
    listRoles,
    getRole,
    getRoleUsers,
    searchUsers,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
};
