'use strict';

import express from 'express';
const router = express.Router();
import { body } from 'express-validator';
import * as permissionController from '../controllers/permissionController.js';
const { getMyPermissions,
    checkPermission,
    checkManyPermissions,
    listPermissions,
    createPermission, } = permissionController;

import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

// All routes require a valid JWT
router.use(authenticate);

// ── Every authenticated user — own permissions (encrypted) ───────────────────
router.get('/my', getMyPermissions);

router.post('/check',
    [
        body('resource').trim().notEmpty().withMessage('resource is required'),
        body('action').trim().notEmpty().withMessage('action is required'),
    ],
    validate,
    checkPermission
);

router.post('/check-many',
    [
        body('checks').isArray({ min: 1, max: 50 }).withMessage('checks must be an array of 1-50 items'),
        body('checks.*.resource').trim().notEmpty(),
        body('checks.*.action').trim().notEmpty(),
    ],
    validate,
    checkManyPermissions
);

// ── Admin — read and create only (NO DELETE route) ────────────────────────────
router.get('/', requirePermission('permissions', 'read'), listPermissions);

router.post('/',
    [
        body('name').trim().notEmpty(),
        body('resource').trim().notEmpty(),
        body('action').isIn(['create', 'read', 'update', 'delete', 'manage']),
    ],
    validate,
    requirePermission('permissions', 'manage'),
    createPermission
);

// DELETE is intentionally NOT exposed — permissions are system records
// and can only be restored via the seed script on the server.

export default router;
