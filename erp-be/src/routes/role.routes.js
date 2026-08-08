'use strict';

import express from 'express';
const router = express.Router();
import { body, param, query } from 'express-validator';
import * as roleController from '../controllers/roleController.js';
const { listRoles,
    getRole,
    getRoleUsers,
    searchUsers,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser, } = roleController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

router.use(authenticate);

const roleValidation = [body('name').trim().notEmpty().withMessage('Role name is required')];

// ── Read ──────────────────────────────────────────────────────────────────────
router.get('/',
    requirePermission('roles', 'read'),
    listRoles
);

// Search users (any type) for role assignment — must come BEFORE /:id
router.get('/users/search',
    [query('q').optional().isString()],
    validate,
    requirePermission('roles', 'manage'),
    searchUsers
);

router.get('/:id',
    [param('id').isInt()], validate,
    requirePermission('roles', 'read'),
    getRole
);

router.get('/:id/users',
    [param('id').isInt()], validate,
    requirePermission('roles', 'read'),
    getRoleUsers
);

// ── Write ─────────────────────────────────────────────────────────────────────
router.post('/',
    roleValidation, validate,
    requirePermission('roles', 'manage'),
    createRole
);

router.put('/:id',
    [param('id').isInt(), ...roleValidation], validate,
    requirePermission('roles', 'manage'),
    updateRole
);

router.delete('/:id',
    [param('id').isInt()], validate,
    requirePermission('roles', 'manage'),
    deleteRole
);

// Assign / remove role from any user (admin, teacher, student)
router.patch('/:id/users/:userId',
    [
        param('id').isInt(),
        param('userId').isUUID(),
        body('action').isIn(['assign', 'remove']),
    ],
    validate,
    requirePermission('roles', 'manage'),
    assignRoleToUser
);

export default router;
