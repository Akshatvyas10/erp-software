'use strict';

const rateLimit = require('express-rate-limit');

/** Strict limiter for auth endpoints */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please try again later.' },
    skipSuccessfulRequests: true, // only count failed attempts
});

/** General API limiter */
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 120,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests, please slow down.' },
});

module.exports = { authLimiter, apiLimiter };
