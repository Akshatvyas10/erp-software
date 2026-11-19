import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { biometricEntrySchema } from '../src/schemas/biometric.schema.js';

describe('Biometric Ingestion Payload Validation Tests (Zod)', () => {
    it('should validate valid check-in payload', () => {
        const payload = {
            deviceId: 'BIO-FRONT-GATE',
            employeeCode: 'EMP-0012',
            timestamp: new Date().toISOString(),
            type: 'in',
        };

        const result = biometricEntrySchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.type, 'in');
    });

    it('should validate valid check-out payload', () => {
        const payload = {
            deviceId: 'BIO-FRONT-GATE',
            employeeCode: 'EMP-0012',
            timestamp: new Date().toISOString(),
            type: 'out',
        };

        const result = biometricEntrySchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.type, 'out');
    });

    it('should reject invalid punch type', () => {
        const payload = {
            deviceId: 'BIO-FRONT-GATE',
            employeeCode: 'EMP-0012',
            timestamp: new Date().toISOString(),
            type: 'break',
        };

        const result = biometricEntrySchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it('should reject missing employee code', () => {
        const payload = {
            deviceId: 'BIO-FRONT-GATE',
            timestamp: new Date().toISOString(),
            type: 'in',
        };

        const result = biometricEntrySchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it('should reject invalid timestamp format', () => {
        const payload = {
            deviceId: 'BIO-FRONT-GATE',
            employeeCode: 'EMP-0012',
            timestamp: 'not-a-timestamp',
            type: 'in',
        };

        const result = biometricEntrySchema.safeParse(payload);
        assert.equal(result.success, false);
    });
});

