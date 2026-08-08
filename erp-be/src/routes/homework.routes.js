import express from 'express';
import {
    getHomeworks,
    getHomeworkDetails,
    createHomework,
    updateHomework,
    deleteHomework,
    getHomeworkSubmissions,
    updateSubmission
} from '../controllers/homework.controller.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';

const router = express.Router();

router.use(authenticate);

// Homework CRUD
router.get('/', requirePermission('homework', 'read'), getHomeworks);
router.post('/', requirePermission('homework', 'create'), createHomework);
router.get('/:id', requirePermission('homework', 'read'), getHomeworkDetails);
router.put('/:id', requirePermission('homework', 'update'), updateHomework);
router.delete('/:id', requirePermission('homework', 'delete'), deleteHomework);

// Submissions
router.get('/:id/submissions', requirePermission('homework', 'read'), getHomeworkSubmissions);
router.put('/submissions/:id', requirePermission('homework', 'read'), updateSubmission);

export default router;
