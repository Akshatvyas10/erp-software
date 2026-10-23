import { Router } from 'express';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import * as academicYearController from '../controllers/academicYearController.js';

const router = Router();

// Everyone authenticated can view academic years / current year
router.get('/', authenticate, academicYearController.getAllYears);
router.get('/current', authenticate, academicYearController.getCurrentYear);

// Management routes require admin role or calendar/config management permissions
router.post(
    '/sync-calendar',
    authenticate,
    requireRole('admin', 'super_admin'),
    academicYearController.syncFromCalendar
);

router.post(
    '/:id/activate',
    authenticate,
    requireRole('admin', 'super_admin'),
    academicYearController.activateYear
);

router.patch(
    '/:id',
    authenticate,
    requireRole('admin', 'super_admin'),
    academicYearController.updateYear
);

router.delete(
    '/:id',
    authenticate,
    requireRole('admin', 'super_admin'),
    academicYearController.deleteYear
);

export default router;
