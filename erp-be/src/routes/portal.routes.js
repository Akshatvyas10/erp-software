'use strict';

import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import * as portalController from '../controllers/studentPortalController.js';

router.use(authenticate);

// Student/Guardian Portal Endpoints
router.get('/student/me', portalController.getMyPortalProfile);
router.get('/student/timetable', portalController.getMyTimetable);
router.get('/student/attendance', portalController.getMyAttendance);
router.get('/student/homework', portalController.getMyHomework);
router.post('/student/homework/:id/submit', portalController.submitMyHomework);
router.get('/student/exam-results', portalController.getMyExamResults);
router.get('/student/leaves', portalController.getMyLeaves);
router.post('/student/leaves', portalController.applyMyLeave);
router.get('/student/remarks', portalController.getMyClassroomRemarks);
router.get('/student/updates', portalController.getMyUpdatesFeed);

export default router;
