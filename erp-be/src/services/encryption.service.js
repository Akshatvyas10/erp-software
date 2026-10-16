import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
// 32-byte key generated from ENCRYPTION_SECRET
const SECRET = process.env.ENCRYPTION_SECRET || 'erp-system-default-secret-key-32b-length!!';
const KEY = crypto.scryptSync(SECRET, 'erp_salt', 32);

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
