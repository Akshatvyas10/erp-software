'use strict';

const router = require('express').Router();
const { body, param, query } = require('express-validator');
const {
    listRoles,
    getRole,
    getRoleUsers,
    searchUsers,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
} = require('../controllers/roleController');
const authenticate = require('../middlewares/authenticate');
const { requirePermission } = require('../middlewares/authorize');
const validate = require('../middlewares/validate');

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

module.exports = router;
