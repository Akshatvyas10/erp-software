import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import * as controller from '../controllers/studentLeaveController.js';

const router = express.Router();

router.use(authenticate);

// Faculty & Admin: Review list & Approve/Reject
router.get(
    '/',
    requirePermission('student_leaves', 'read'),
    controller.getReviewableLeaves
);

router.post(
    '/:id/action',
    requirePermission('student_leaves', 'update'),
    controller.actionLeave
);

// Student / Parent: My history & Apply
router.get(
    '/my',
    requirePermission('student_leaves', 'read'),
    controller.getMyLeaves
);

router.post(
    '/apply',
    requirePermission('student_leaves', 'create'),
    controller.applyLeave
);

export default router;
