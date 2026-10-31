'use strict';

import logger from '../utils/logger.js';

/**
 * Validates mandatory environment variables before boot.
 * Enforces fail-fast behavior in production environments.
 */
export const validateEnv = () => {
    const isProduction = process.env.NODE_ENV === 'production';
    const errors = [];
    const warnings = [];

    // Core application secrets
    if (!process.env.JWT_SECRET) {
        errors.push('JWT_SECRET is required');
    } else if (process.env.JWT_SECRET.length < 32 && isProduction) {
        errors.push('JWT_SECRET must be at least 32 characters long in production');
    }

    if (!process.env.JWT_REFRESH_SECRET) {
        errors.push('JWT_REFRESH_SECRET is required');
    } else if (process.env.JWT_REFRESH_SECRET.length < 32 && isProduction) {
        errors.push('JWT_REFRESH_SECRET must be at least 32 characters long in production');
    }

    // Database configuration
    const hasDbUrl = Boolean(process.env.DATABASE_URL);
    const hasDbVars = Boolean(process.env.DB_NAME && process.env.DB_USER && process.env.DB_PASSWORD);
    if (!hasDbUrl && !hasDbVars) {
        errors.push('Database configuration missing. Set DATABASE_URL or DB_NAME, DB_USER, and DB_PASSWORD');
    }

    // Production-specific strict requirements
    if (isProduction) {
        if (!process.env.REDIS_URL) {
            errors.push('REDIS_URL is strictly required in production to ensure distributed session and token revocation consistency');
        }
        if (!process.env.ALLOWED_ORIGINS) {
            warnings.push('ALLOWED_ORIGINS is not set in production; defaulting to restricted localhost origin');
        }
    } else {
        if (!process.env.REDIS_URL) {
            warnings.push('REDIS_URL not set. Running in local mode with memory fallback (allowed for development only)');
        }
    }

    // Log warnings
    warnings.forEach((warn) => logger.warn(`[Env Warning] ${warn}`));

    // Halt if critical errors exist
    if (errors.length > 0) {
        logger.error('================================================================');
        logger.error('FATAL: Environment configuration validation failed:');
        errors.forEach((err, idx) => logger.error(`  ${idx + 1}. ${err}`));
        logger.error('================================================================');
        throw new Error('Environment validation failed. Server boot aborted.');
    }

    logger.info(`Environment configuration validated successfully [${process.env.NODE_ENV || 'development'}].`);
};
