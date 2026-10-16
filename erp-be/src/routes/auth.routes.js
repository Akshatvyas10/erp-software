import express from 'express';
import { z } from 'zod';
import * as authController from '../controllers/authController.js';
const { login, refresh, logout, logoutAll, me } = authController;
import authenticate from '../middlewares/authenticate.js';
import validateZod from '../middlewares/zodValidator.js';
import { authLimiter } from '../middlewares/rateLimiter.js';

const router = express.Router();

const loginSchema = {
    body: z.object({
        userId: z.string().trim().min(1, 'userId is required'),
        password: z.string().min(6, 'Password must be at least 6 characters'),
        remember: z.boolean().optional(),
    }),
};

// Public routes
router.post('/login', authLimiter, validateZod(loginSchema), login);
router.post('/refresh', refresh);
router.post(
    '/forgot-password',
    authLimiter,
    validateZod({ body: z.object({ email: z.string().email() }) }),
    authController.forgotPassword
);
router.post(
    '/reset-password',
    authLimiter,
    validateZod({
        body: z.object({
            token: z.string().min(1, 'Token is required'),
            newPassword: z.string().min(6, 'Password must be at least 6 characters'),
        }),
    }),
    authController.resetPassword
);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.get('/me', me);

export default router;
