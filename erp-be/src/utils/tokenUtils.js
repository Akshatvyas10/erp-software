import jwt from 'jsonwebtoken';

/**
 * Sign an access token (short-lived)
 */
export const signAccessToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
        issuer: 'erp-system',
        audience: 'erp-client',
    });
};

/**
 * Sign a refresh token (long-lived)
 */
export const signRefreshToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
        issuer: 'erp-system',
        audience: 'erp-client',
    });
};

/**
 * Verify access token
 */
export const verifyAccessToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'erp-system',
        audience: 'erp-client',
    });
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'erp-system',
        audience: 'erp-client',
    });
};

/**
 * Sign a password reset token (15 mins expiry)
 */
export const signResetToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m',
        issuer: 'erp-system',
        audience: 'erp-reset',
    });
};

/**
 * Verify a password reset token
 */
export const verifyResetToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET, {
        issuer: 'erp-system',
        audience: 'erp-reset',
    });
};

