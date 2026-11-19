'use strict';

import crypto from 'crypto';
import logger from '../utils/logger.js';
import redisClient, { getRedisStatus } from '../config/redis.js';

/**
 * Middleware: verifyBiometricDeviceKey
 * Authenticates physical or network biometric devices sending attendance punches.
 * Validates:
 * 1. x-device-key header matching BIOMETRIC_DEVICE_KEY or a registered device key.
 * 2. Replay attack prevention via x-device-nonce & timestamp cache.
 */
export const verifyBiometricDeviceKey = async (req, res, next) => {
    try {
        const deviceKey = req.headers['x-device-key'];
        const masterKey = process.env.BIOMETRIC_DEVICE_KEY;

        if (!masterKey) {
            logger.error('[BIOMETRIC] BIOMETRIC_DEVICE_KEY environment variable is not configured on server.');
            return res.status(503).json({
                success: false,
                message: 'Biometric device ingestion is temporarily disabled on server.',
            });
        }

        if (!deviceKey) {
            logger.warn(`[BIOMETRIC] Ingestion rejected: missing x-device-key header from IP ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: Missing x-device-key header.',
            });
        }

        // Timing-safe comparison to prevent side-channel timing attacks
        const providedBuffer = Buffer.from(String(deviceKey));
        const expectedBuffer = Buffer.from(String(masterKey));

        if (providedBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
            logger.warn(`[BIOMETRIC] Ingestion rejected: Invalid x-device-key from IP ${req.ip}`);
            return res.status(401).json({
                success: false,
                message: 'Authentication failed: Invalid device key.',
            });
        }

        // Optional Replay Attack Prevention via Nonce
        const nonce = req.headers['x-device-nonce'] || req.body?.nonce;
        if (nonce && getRedisStatus()) {
            const nonceKey = `biometric:nonce:${nonce}`;
            const exists = await redisClient.get(nonceKey);
            if (exists) {
                logger.warn(`[BIOMETRIC] Replay attack detected for nonce ${nonce}`);
                return res.status(409).json({
                    success: false,
                    message: 'Duplicate punch transmission: Nonce already processed.',
                });
            }
            // Nonce expires after 10 minutes
            await redisClient.set(nonceKey, '1', 'EX', 600);
        }

        next();
    } catch (err) {
        logger.error('[BIOMETRIC] Error verifying device key:', err);
        return res.status(500).json({ success: false, message: 'Internal security evaluation error.' });
    }
};

export default verifyBiometricDeviceKey;

