'use strict';

const router = require('express').Router();
const { body } = require('express-validator');
const { login, refresh, logout, logoutAll, me } = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const validate = require('../middlewares/validate');
const { authLimiter } = require('../middlewares/rateLimiter');

const loginValidation = [
    body('userId').trim().notEmpty().withMessage('userId is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];

// Public routes
router.post('/login', authLimiter, loginValidation, validate, login);
router.post('/refresh', refresh);

// Protected routes
router.use(authenticate);
router.post('/logout', logout);
router.post('/logout-all', logoutAll);
router.get('/me', me);

module.exports = router;
