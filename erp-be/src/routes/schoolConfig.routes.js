import express from 'express';
import { 
    getSchoolConfig, 
    updateSchoolConfig, 
    updateSmtpConfig, 
    testEmailConnection, 
    updateTheme 
} from '../controllers/schoolConfig.controller.js';
import authenticate from '../middlewares/authenticate.js';
import { requireRole } from '../middlewares/authorize.js';
import { uploadSchoolImages, compressAndSaveSchoolImages } from '../middlewares/fileUpload.middleware.js';

const router = express.Router();

// Get school config (Publicly accessible, used for login page, email templates, theme bootstrap, etc)
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

// Save / Update Email Server (SMTP) Settings (Admin only)
router.put(
    '/smtp',
    authenticate,
    requireRole('admin', 'super_admin'),
    updateSmtpConfig
);

// Test Email Connection (Admin only)
router.post(
    '/test-email',
    authenticate,
    requireRole('admin', 'super_admin'),
    testEmailConnection
);

// Update Active Theme (Admin only)
router.put(
    '/theme',
    authenticate,
    requireRole('admin', 'super_admin'),
    updateTheme
);

export default router;
