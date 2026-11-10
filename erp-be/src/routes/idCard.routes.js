'use strict';

import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import * as idCardController from '../controllers/idCard.controller.js';

router.use(authenticate);

// Student self-service: View own ID card
router.get(
    '/my-card',
    requireRole('student'),
    idCardController.getMyIdCard
);

// Generate Student ID Cards (Single / Bulk): Class Teacher, Department Incharge, Principal, Admin
router.post(
    '/students/generate',
    requireRole('admin', 'super_admin', 'principal', 'teacher'),
    idCardController.generateStudentIdCards
);

// Generate Teacher ID Cards: Principal, Admin
router.post(
    '/teachers/generate',
    requireRole('admin', 'super_admin', 'principal'),
    idCardController.generateTeacherIdCards
);

// Document issuance audit logs
router.get(
    '/audit-logs',
    requireRole('admin', 'super_admin', 'principal'),
    idCardController.getIssuanceAuditLogs
);

export default router;
