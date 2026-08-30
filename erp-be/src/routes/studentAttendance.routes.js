import express from 'express';
const router = express.Router();
import * as attendanceController from '../controllers/studentAttendanceController.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import { enforceAttendanceScope } from '../middlewares/attendanceScope.js';
import { validateAttendance, validateAttendanceUpdate } from '../validators/attendance.validator.js';

router.use(authenticate);

// 1. Get Authorized Classrooms (Dashboard)
// Any authenticated teacher can check their classrooms, so basic 'read' permission is enough
router.get('/my-classrooms', 
    requirePermission('attendance', 'read'), 
    attendanceController.getMyClassrooms
);

// 2. Get specific classroom attendance for a date
router.get('/classroom/:classroomId', 
    requirePermission('attendance', 'read'),
    enforceAttendanceScope,
    attendanceController.getClassroomAttendance
);

// 3. Bulk Create/Update Attendance
router.post('/', 
    requirePermission('attendance', 'create'),
    validateAttendance,
    enforceAttendanceScope,
    attendanceController.bulkCreateAttendance
);

// 4. Update Single Attendance Record
router.patch('/:id', 
    requirePermission('attendance', 'update'),
    validateAttendanceUpdate,
    attendanceController.updateAttendance
);

export default router;
