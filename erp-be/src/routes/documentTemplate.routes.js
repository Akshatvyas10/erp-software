'use strict';

import express from 'express';
const router = express.Router();
import authenticate from '../middlewares/authenticate.js';
import { requirePermission, requireRole } from '../middlewares/authorize.js';
import * as documentTemplateController from '../controllers/documentTemplate.controller.js';

router.use(authenticate);

router.get(
    '/',
    requireRole('admin', 'super_admin', 'teacher', 'principal'),
    documentTemplateController.getTemplates
);

router.get(
    '/:id',
    requireRole('admin', 'super_admin', 'teacher', 'principal'),
    documentTemplateController.getTemplateById
);

router.post(
    '/',
    requireRole('admin', 'super_admin', 'principal'),
    documentTemplateController.createTemplate
);

router.put(
    '/:id',
    requireRole('admin', 'super_admin', 'principal'),
    documentTemplateController.updateTemplate
);

router.post(
    '/:id/duplicate',
    requireRole('admin', 'super_admin', 'principal'),
    documentTemplateController.duplicateTemplate
);

router.patch(
    '/:id/set-default',
    requireRole('admin', 'super_admin', 'principal'),
    documentTemplateController.setDefaultTemplate
);

router.delete(
    '/:id',
    requireRole('admin', 'super_admin', 'principal'),
    documentTemplateController.deleteTemplate
);

export default router;
