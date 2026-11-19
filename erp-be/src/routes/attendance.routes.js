'use strict';

import express from 'express';
const router = express.Router();
import { body, param } from 'express-validator';
import * as attendanceController from '../controllers/attendanceController.js';
const { getTeacherAttendance, markAttendance, biometricEntry, getTodayAttendance, } = attendanceController;
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validate from '../middlewares/validate.js';
import validateZod from '../middlewares/zodValidator.js';
import { biometricLimiter } from '../middlewares/rateLimiter.js';
import verifyBiometricDeviceKey from '../middlewares/biometricAuth.js';
import { biometricEntrySchema } from '../schemas/biometric.schema.js';

// Biometric device webhook — Authenticated strictly via Device API Key and rate-limited
router.post(
    '/biometric',
    biometricLimiter,
    verifyBiometricDeviceKey,
    validateZod({ body: biometricEntrySchema }),
    biometricEntry
);

router.use(authenticate);

router.get('/teacher/:teacherId',
    [param('teacherId').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTeacherAttendance
);

router.get('/teacher/:teacherId/today',
    [param('teacherId').isUUID()], validate,
    requirePermission('teachers', 'read'),
    getTodayAttendance
);

router.post('/teacher',
    [
        body('teacherId').isUUID(),
        body('date').isDate(),
        body('status').isIn(['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday']),
    ],
    validate,
    requirePermission('teachers', 'update'),
    markAttendance
);

export default router;
