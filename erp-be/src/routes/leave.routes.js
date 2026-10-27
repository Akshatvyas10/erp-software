'use strict';

import express from 'express';
const router = express.Router();
import { body, param, query } from 'express-validator';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import * as teacherLeaveController from '../controllers/teacherLeaveController.js';
import * as leaveTypeController from '../controllers/leaveTypeController.js';

router.use(authenticate);

// ─── LEAVE TYPE ROUTES ──────────────────────────────────────────────────────
router.get(
    '/types',
    requirePermission('leave_types', 'read'),
    leaveTypeController.listLeaveTypes
);

router.post(
    '/types',
    requirePermission('leave_types', 'manage'),
    [
        body('code').trim().notEmpty().withMessage('Leave type code is required'),
        body('name').trim().notEmpty().withMessage('Leave type name is required'),
        body('defaultDaysPerYear').isDecimal().withMessage('Default days must be a numeric value'),
    ],
    validate,
    leaveTypeController.createLeaveType
);

router.put(
    '/types/:id',
    requirePermission('leave_types', 'manage'),
    [param('id').isUUID()],
    validate,
    leaveTypeController.updateLeaveType
);

router.patch(
    '/types/:id/toggle',
    requirePermission('leave_types', 'manage'),
    [param('id').isUUID()],
    validate,
    leaveTypeController.toggleLeaveType
);

// ─── LEAVE CALCULATION / PREVIEW ───────────────────────────────────────────
router.post(
    '/calculate-days',
    requirePermission('teacher_leaves', 'read'),
    [
        body('fromDate').isISO8601().withMessage('Valid fromDate required'),
        body('toDate').isISO8601().withMessage('Valid toDate required'),
    ],
    validate,
    teacherLeaveController.previewLeaveDays
);

// ─── LEAVE BALANCES ─────────────────────────────────────────────────────────
router.get(
    '/balances/my',
    requirePermission('teacher_leaves', 'read'),
    teacherLeaveController.getMyBalances
);

router.get(
    '/balances/:teacherId',
    requirePermission('teacher_leaves', 'read'),
    [param('teacherId').isUUID()],
    validate,
    teacherLeaveController.getTeacherBalances
);

// ─── LEAVE REQUESTS ─────────────────────────────────────────────────────────
router.get(
    '/requests/my',
    requirePermission('teacher_leaves', 'read'),
    teacherLeaveController.getMyRequests
);

router.post(
    '/requests',
    requirePermission('teacher_leaves', 'create'),
    [
        body('leaveTypeId').isUUID().withMessage('Valid leaveTypeId is required'),
        body('fromDate').isISO8601().withMessage('Valid fromDate is required'),
        body('toDate').isISO8601().withMessage('Valid toDate is required'),
        body('reason').trim().isLength({ min: 3 }).withMessage('Reason must be at least 3 characters'),
    ],
    validate,
    teacherLeaveController.applyLeave
);

router.get(
    '/requests',
    requirePermission('teacher_leaves', 'read'),
    teacherLeaveController.listLeaveRequests
);

router.patch(
    '/requests/:id/decide',
    requirePermission('teacher_leaves', 'update'),
    [
        param('id').isUUID(),
        body('decision').isIn(['APPROVED', 'REJECTED']).withMessage('Decision must be APPROVED or REJECTED'),
    ],
    validate,
    teacherLeaveController.decideLeave
);

router.patch(
    '/requests/:id/cancel',
    requirePermission('teacher_leaves', 'delete'),
    [param('id').isUUID()],
    validate,
    teacherLeaveController.cancelLeave
);

// ─── LEAVE RULES (POLICY) ROUTES ────────────────────────────────────────────
router.get(
    '/rules/active',
    requirePermission('leave_rules', 'read'),
    teacherLeaveController.getActiveLeaveRule
);

router.get(
    '/rules',
    requirePermission('leave_rules', 'read'),
    teacherLeaveController.listLeaveRules
);

router.post(
    '/rules',
    requirePermission('leave_rules', 'create'),
    [
        body('ruleName').trim().notEmpty().withMessage('Rule name is required'),
        body('casualLeaveCount').optional().isNumeric().withMessage('Casual leave count must be numeric'),
        body('sickLeaveCount').optional().isNumeric().withMessage('Sick leave count must be numeric'),
        body('earnedLeaveCount').optional().isNumeric().withMessage('Earned leave count must be numeric'),
        body('maternityLeaveCount').optional().isNumeric().withMessage('Maternity leave count must be numeric'),
        body('leaveWithoutPayCount').optional().isNumeric().withMessage('LWP count must be numeric'),
    ],
    validate,
    teacherLeaveController.createLeaveRule
);

router.put(
    '/rules/:id',
    requirePermission('leave_rules', 'update'),
    [
        param('id').isUUID(),
        body('ruleName').optional().trim().notEmpty().withMessage('Rule name cannot be empty'),
        body('casualLeaveCount').optional().isNumeric().withMessage('Casual leave count must be numeric'),
        body('sickLeaveCount').optional().isNumeric().withMessage('Sick leave count must be numeric'),
        body('earnedLeaveCount').optional().isNumeric().withMessage('Earned leave count must be numeric'),
        body('maternityLeaveCount').optional().isNumeric().withMessage('Maternity leave count must be numeric'),
        body('leaveWithoutPayCount').optional().isNumeric().withMessage('LWP count must be numeric'),
    ],
    validate,
    teacherLeaveController.updateLeaveRule
);

export default router;

