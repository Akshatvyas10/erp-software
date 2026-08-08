'use strict';

import { Op } from 'sequelize';
import db from '../models/index.js';
const { User, Role, Student, Teacher } = db;
import { success, error } from '../utils/apiResponse.js';

const safeAttrs = { exclude: ['password', 'refreshTokenHash', 'loginAttempts', 'lockedUntil'] };

const withRolesProfiles = [
    { model: Role, as: 'Roles', through: { attributes: [] }, required: false },
    { model: Student, as: 'studentProfile', required: false },
    { model: Teacher, as: 'teacherProfile', required: false },
];

// ─── GET /api/users ───────────────────────────────────────────────────────────
const listUsers = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;
        const search = req.query.search || '';
        const role = req.query.role || '';      // filter by role name
        const status = req.query.status || '';      // 'active' | 'inactive'

        const where = {};
        if (search) {
            where[Op.or] = [
                { userId: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
            ];
        }
        if (status === 'active') where.isActive = true;
        if (status === 'inactive') where.isActive = false;

        const roleInclude = {
            model: Role, as: 'Roles', through: { attributes: [] }, required: !!role,
            ...(role ? { where: { name: role } } : {}),
        };

        const { count, rows } = await User.findAndCountAll({
            where,
            include: [roleInclude],
            attributes: safeAttrs,
            limit, offset,
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        return success(res, {
            users: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) { next(err); }
};

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
const getUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id, {
            include: withRolesProfiles,
            attributes: safeAttrs,
        });
        if (!user) return error(res, 'User not found', 404);
        return success(res, { user });
    } catch (err) { next(err); }
};

// ─── POST /api/users ──────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
    try {
        const { userId, email, password, firstName, lastName, roleIds } = req.body;

        const existing = await User.findOne({ where: { [Op.or]: [{ userId }, { email }] } });
        if (existing) {
            return error(res, existing.userId === userId ? 'User ID already exists' : 'Email already exists', 409);
        }

        const user = await User.create({ userId, email, password, firstName, lastName });

        if (roleIds?.length) {
            const roles = await Role.findAll({ where: { id: roleIds } });
            await user.setRoles(roles);
        }

        const created = await User.findByPk(user.id, { include: withRolesProfiles, attributes: safeAttrs });
        return success(res, { user: created }, 'User created', 201);
    } catch (err) { next(err); }
};

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return error(res, 'User not found', 404);

        const allowed = ['firstName', 'lastName', 'email', 'phone'];
        const updates = {};
        for (const k of allowed) { if (req.body[k] !== undefined) updates[k] = req.body[k]; }
        if (req.body.password) updates.password = req.body.password;

        await user.update(updates);
        const updated = await User.findByPk(user.id, { include: withRolesProfiles, attributes: safeAttrs });
        return success(res, { user: updated }, 'User updated');
    } catch (err) { next(err); }
};

// ─── PATCH /api/users/:id/roles ───────────────────────────────────────────────
const assignRoles = async (req, res, next) => {
    try {
        const { roleIds } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return error(res, 'User not found', 404);
        const roles = await Role.findAll({ where: { id: roleIds } });
        await user.setRoles(roles);
        return success(res, null, 'Roles assigned successfully');
    } catch (err) { next(err); }
};

// ─── PATCH /api/users/:id/activate|deactivate ────────────────────────────────
const setActiveStatus = (isActive) => async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return error(res, 'User not found', 404);
        await user.update({ isActive });
        return success(res, null, `User ${isActive ? 'activated' : 'deactivated'}`);
    } catch (err) { next(err); }
};

// ─── DELETE /api/users/:id (soft delete) ─────────────────────────────────────
const deleteUser = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) return error(res, 'User not found', 404);
        await user.destroy();
        return success(res, null, 'User deleted');
    } catch (err) { next(err); }
};

export { listUsers, getUser, createUser, updateUser, assignRoles, setActiveStatus, deleteUser };
