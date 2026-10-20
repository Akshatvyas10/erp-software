'use strict';
import express from 'express';
import { body, param, query } from 'express-validator';
import * as C from '../controllers/classroomConfig.controller.js';
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';

const router = express.Router();

router.use(authenticate);

// ── Blocks ──────────────────────────────────────────────────────────
router.get('/blocks', C.getBlocks);
router.post(
    '/blocks',
    requireRole('admin', 'super_admin'),
    [
        body('name').trim().notEmpty().withMessage('Block name is required'),
        body('code').trim().notEmpty().withMessage('Block code is required'),
    ],
    validate,
    C.createBlock
);
router.put(
    '/blocks/:id',
    requireRole('admin', 'super_admin'),
    [param('id').isUUID()],
    validate,
    C.updateBlock
);
router.delete(
    '/blocks/:id',
    requireRole('admin', 'super_admin'),
    [param('id').isUUID()],
    validate,
    C.deleteBlock
);

// ── Rooms ───────────────────────────────────────────────────────────
router.get('/rooms', C.getRooms);
router.post(
    '/rooms',
    requireRole('admin', 'super_admin'),
    [
        body('blockId').isUUID().withMessage('Valid blockId is required'),
        body('roomNumber').trim().notEmpty().withMessage('Room number is required'),
    ],
    validate,
    C.createRoom
);
router.put(
    '/rooms/:id',
    requireRole('admin', 'super_admin'),
    [param('id').isUUID()],
    validate,
    C.updateRoom
);
router.delete(
    '/rooms/:id',
    requireRole('admin', 'super_admin'),
    [param('id').isUUID()],
    validate,
    C.deleteRoom
);

// ── Test & Exam Rules ───────────────────────────────────────────────
router.get('/rules', C.getTestExamRules);
router.post(
    '/rules',
    requireRole('admin', 'super_admin'),
    [
        body('departmentId').isUUID().withMessage('Valid departmentId is required'),
        body('totalTestsPerYear').optional().isInt({ min: 0, max: 24 }),
        body('totalExamsPerYear').optional().isInt({ min: 0, max: 12 }),
    ],
    validate,
    C.upsertTestExamRule
);

// ── Configure Classroom with Targeted Calendar Integration ───────────
router.post(
    '/classrooms',
    requireRole('admin', 'super_admin'),
    [
        body('name').trim().notEmpty().withMessage('Classroom name is required'),
        body('section').trim().toUpperCase().isIn(['A', 'B', 'C', 'D', 'E', 'F', 'G']).withMessage('Section must be between A and G'),
        body('academicYear').trim().notEmpty().withMessage('Academic year is required'),
    ],
    validate,
    C.configureClassroom
);

export default router;
