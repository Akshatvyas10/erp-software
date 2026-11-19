import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import * as examController from '../controllers/examController.js';

const router = express.Router();

router.use(authenticate);

// Viewing exams, schedules, and published results
router.get('/', requirePermission('exams', 'read'), examController.listExams);
router.get('/schedules', requirePermission('exams', 'read'), examController.listSchedules);
router.get('/schedules/:id/results-matrix', requirePermission('exams', 'read'), examController.getScheduleMatrix);
router.get('/:id/results', requirePermission('exams', 'read'), examController.getResults);

// Exam schedule management & automation
router.get('/schedules/preview', requirePermission('exams', 'manage'), examController.previewAutoSchedule);
router.post('/schedules/auto-generate', requirePermission('exams', 'manage'), examController.autoGenerateSchedules);
router.post('/schedules/:id/publish', requirePermission('exams', 'manage'), examController.publishSchedule);

router.post('/schedules', requirePermission('exams', 'create'), examController.createSchedule);
router.put('/schedules/:id', requirePermission('exams', 'update'), examController.updateSchedule);
router.delete('/schedules/:id', requirePermission('exams', 'manage'), examController.deleteSchedule);

// Exam catalog & marks entry
router.post('/', requirePermission('exams', 'create'), examController.createExam);
router.put('/:id', requirePermission('exams', 'update'), examController.updateExam);
router.delete('/:id', requirePermission('exams', 'manage'), examController.deleteExam);
router.post('/:id/results', requirePermission('exams', 'update'), examController.upsertResults);
router.post('/:id/publish', requirePermission('exams', 'manage'), examController.publishResults);

export default router;
