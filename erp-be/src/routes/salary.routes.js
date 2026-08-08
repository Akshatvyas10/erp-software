'use strict';

import express from 'express';
const router = express.Router();
import { body, param, query } from 'express-validator';
import * as salaryController from '../controllers/salaryController.js';
const { previewSalary, generateSalarySlip, getTeacherSalarySlips,
    getSalarySlip, updatePaymentStatus, listAllSalarySlips, } = salaryController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

router.use(authenticate);

// List all slips — admin/manage
router.get('/', requirePermission('teachers', 'read'), listAllSalarySlips);

// Single slip (for printing)
router.get('/slip/:slipId', [param('slipId').isUUID()], validate, requirePermission('teachers', 'read'), getSalarySlip);

// Per-teacher slips
router.get('/:teacherId',
    [param('teacherId').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTeacherSalarySlips
);

// Preview before generating
router.get('/:teacherId/preview',
    [param('teacherId').isUUID(), query('month').isInt({ min: 1, max: 12 }), query('year').isInt({ min: 2000 })],
    validate,
    requirePermission('teachers', 'read'),
    previewSalary
);

// Generate / recalculate
router.post('/:teacherId/generate',
    [
        param('teacherId').isUUID(),
        body('month').isInt({ min: 1, max: 12 }),
        body('year').isInt({ min: 2000 }),
    ],
    validate,
    requirePermission('teachers', 'manage'),
    generateSalarySlip
);

// Update payment status
router.patch('/slip/:slipId/status',
    [
        param('slipId').isUUID(),
        body('status').isIn(['pending', 'paid', 'on_hold']),
    ],
    validate,
    requirePermission('teachers', 'manage'),
    updatePaymentStatus
);

export default router;
