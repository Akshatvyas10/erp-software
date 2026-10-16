'use strict';

import express from 'express';
import { getSchoolConfig, updateSchoolConfig } from '../controllers/schoolConfig.controller.js';
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { uploadSchoolImages, compressAndSaveSchoolImages } from '../middlewares/fileUpload.middleware.js';

const router = express.Router();

// Get school config (Publicly accessible, used for login page, email templates, etc)
router.get('/', getSchoolConfig);

// Create or update school config (Admin only)
router.post(
    '/',
    authenticate,
    requireRole('admin', 'super_admin'),
    uploadSchoolImages,
    compressAndSaveSchoolImages,
    updateSchoolConfig
);

export default router;
