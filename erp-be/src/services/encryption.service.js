import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

// In production, ENCRYPTION_SECRET must be set explicitly (validated by envValidator on boot).
// A hardcoded fallback is intentionally kept for development ONLY. It must NEVER reach production.
const SECRET = process.env.ENCRYPTION_SECRET;
if (!SECRET) {
    if (process.env.NODE_ENV === 'production') {
        // envValidator should have already aborted boot — this is a last-resort guard.
        throw new Error('FATAL: ENCRYPTION_SECRET is not set. Aborting to prevent data corruption.');
    }
    // Development fallback: warn loudly so it is never overlooked.
    console.warn('[SECURITY WARNING] ENCRYPTION_SECRET is not set. Using insecure development fallback. Set this variable before deploying to production.');
}
const EFFECTIVE_SECRET = SECRET || 'erp-system-default-secret-key-32b-length!!';
const KEY = crypto.scryptSync(EFFECTIVE_SECRET, 'erp_salt', 32);

export const encrypt = (text) => {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
};

export const decrypt = (hash) => {
    if (!hash || typeof hash !== 'string' || !hash.includes(':')) return null;
    try {
        const [ivHex, authTagHex, encryptedText] = hash.split(':');
        if (!ivHex || !authTagHex || !encryptedText) return null;
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        return null;
    }
};

export default { encrypt, decrypt };
