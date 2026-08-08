import CryptoJS from 'crypto-js';

const getKey = () => {
    const key = process.env.PERMISSION_ENCRYPT_KEY;
    if (!key || key.length < 16) {
        throw new Error('PERMISSION_ENCRYPT_KEY must be at least 16 characters');
    }
    return key;
};

/**
 * Encrypt a JS object → opaque base64 string.
 * Uses AES-256 (CBC) with a random IV embedded in the cipher output.
 */
export const encryptPayload = (data) => {
    const json = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(json, getKey());
    return encrypted.toString(); // base64 ciphertext with embedded IV+salt
};

/**
 * Decrypt a base64 cipher string back to a JS object.
 * Only used server-side if you ever need to verify — the frontend decrypts normally.
 */
export const decryptPayload = (cipherText) => {
    const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
    const json = bytes.toString(CryptoJS.enc.Utf8);
    return JSON.parse(json);
};
