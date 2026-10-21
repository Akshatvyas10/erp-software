'use strict';
import express from 'express';
import { body, param } from 'express-validator';
import * as C from '../controllers/academicClassController.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

const isUUID = (name) => param(name).isUUID().withMessage(`${name} must be a UUID`);

// 1. Setup Status (Checks whether first-time wizard should trigger)
router.get('/setup-status', C.getSetupStatus);

// 2. Class Directory
router.get('/', requirePermission('classrooms', 'read'), C.listClasses);
router.get('/:id', [isUUID('id')], validate, requirePermission('classrooms', 'read'), C.getClass);

// 3. Bulk Setup Wizard (Privileged administrators only)
router.post(
    '/bulk-setup',
    requireRole('admin', 'super_admin', 'principal'),
    [
        body('classes').isArray({ min: 1 }).withMessage('Classes must be a non-empty array'),
        body('classes.*.name').trim().notEmpty().withMessage('Each class requires a name'),
        body('defaultSections').optional().isArray(),
        body('academicYear').optional().trim()
    ],
    validate,
    C.bulkSetup
);

// 4. Single Class Management
router.post(
    '/',
    requireRole('admin', 'super_admin', 'principal'),
    [
        body('name').trim().notEmpty().withMessage('Class name is required'),
        body('code').optional().trim(),
        body('orderIndex').optional().isInt({ min: 1 }),
        body('departmentId').optional().isUUID()
    ],
    validate,
    C.createClass
);

router.put(
    '/:id',
    requireRole('admin', 'super_admin', 'principal'),
    [isUUID('id')],
    validate,
    C.updateClass
);

router.delete(
    '/:id',
    requireRole('admin', 'super_admin', 'principal'),
    [isUUID('id')],
    validate,
    C.deleteClass
);

export default router;
