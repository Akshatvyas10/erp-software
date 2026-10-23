import express from 'express';
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import * as examController from '../controllers/examController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', examController.listExams);
router.get('/schedules', examController.listSchedules);
router.get('/:id/results', examController.getResults);

// Only admins and teachers can manage exams and results
const manageExamRoles = requireRole('admin', 'super_admin', 'teacher');

router.get('/schedules/preview', manageExamRoles, examController.previewAutoSchedule);
router.post('/schedules/auto-generate', manageExamRoles, examController.autoGenerateSchedules);
router.post('/schedules/:id/publish', manageExamRoles, examController.publishSchedule);

router.post('/schedules', manageExamRoles, examController.createSchedule);
router.put('/schedules/:id', manageExamRoles, examController.updateSchedule);
router.delete('/schedules/:id', manageExamRoles, examController.deleteSchedule);

router.post('/', manageExamRoles, examController.createExam);
router.put('/:id', manageExamRoles, examController.updateExam);
router.delete('/:id', manageExamRoles, examController.deleteExam);
router.post('/:id/results', manageExamRoles, examController.upsertResults);
router.post('/:id/publish', manageExamRoles, examController.publishResults);

export default router;
