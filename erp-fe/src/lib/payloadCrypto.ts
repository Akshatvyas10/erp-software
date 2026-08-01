import CryptoJS from "crypto-js";

const getKey = (): string => {
    const key = import.meta.env.VITE_PERMISSION_ENCRYPT_KEY as string;
    if (!key) throw new Error("VITE_PERMISSION_ENCRYPT_KEY is not set");
    return key;
};

/**
 * Decrypt an AES-encrypted permission payload from the backend.
 * The backend uses CryptoJS.AES.encrypt(json, key) which uses
 * EVP_BytesToKey-derived key + embedded random IV/salt.
 */
export const decryptPayload = <T = unknown>(cipherText: string): T => {
    const bytes = CryptoJS.AES.decrypt(cipherText, getKey());
    const json = bytes.toString(CryptoJS.enc.Utf8);
    if (!json) throw new Error("Decryption failed — empty result");
    return JSON.parse(json) as T;
};

export const encryptPayload = (data: unknown): string => {
    const json = JSON.stringify(data);
    return CryptoJS.AES.encrypt(json, getKey()).toString();
};
