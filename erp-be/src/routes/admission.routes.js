'use strict';

import express from 'express';
const router = express.Router();

import * as admissionController from '../controllers/admission.controller.js';
const { generateForm, getPublicForm, submitApplication, listApplications, updateApplicationStatus, getFormByClassroom, listForms } = admissionController;

import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';

// ─── Public Routes ─────────────────────────────────────────────────────────────
// Rate limited for security
router.get('/public/:token', apiLimiter, getPublicForm);
router.post('/public/:token', apiLimiter, submitApplication);
router.get('/public/application/:id/status', apiLimiter, admissionController.getApplicationStatusPublic);

// ─── Protected Routes ────────────────────────────────────────────────────────
router.use(authenticate);

// Only Admins and specific staff should manage admissions
router.post('/generate', requireRole('admin', 'super_admin'), generateForm);
router.get('/', requireRole('admin', 'super_admin', 'teacher', 'staff'), listApplications);
router.get('/forms', requireRole('admin', 'super_admin', 'teacher', 'staff'), listForms);
router.patch('/:id/status', requireRole('admin', 'super_admin'), updateApplicationStatus);
router.get('/forms/classroom/:classroomId', requireRole('admin', 'super_admin', 'teacher', 'staff'), getFormByClassroom);
router.patch('/forms/bulk-toggle-status', requireRole('admin', 'super_admin'), admissionController.bulkToggleFormStatus);
router.patch('/forms/:id/toggle-status', requireRole('admin', 'super_admin'), admissionController.toggleFormStatus);

export default router;
