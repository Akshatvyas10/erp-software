import { test, describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

describe('Biometric Webhook Security Authentication Tests', () => {
    it('should reject request missing x-device-key header with 401', async () => {
        // Verification of middleware logic
        const mockReq = {
            headers: {},
            body: {
                deviceId: 'BIO-FRONT-01',
                employeeCode: 'TCH-001',
                timestamp: new Date().toISOString(),
                type: 'in',
            },
            ip: '127.0.0.1',
        };

        let statusCode = null;
        let responseJson = null;

        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    },
                };
            },
        };

        // Import the middleware dynamically
        const { verifyBiometricDeviceKey } = await import('../src/middlewares/biometricAuth.js');
        process.env.BIOMETRIC_DEVICE_KEY = 'test_secret_device_key_1234567890';

        await verifyBiometricDeviceKey(mockReq, mockRes, () => {
            assert.fail('Middleware should not have called next() when key is missing');
        });

        assert.equal(statusCode, 401);
        assert.equal(responseJson.success, false);
        assert.match(responseJson.message, /Missing x-device-key/);
    });

    it('should reject request with invalid x-device-key header with 401', async () => {
        const mockReq = {
            headers: {
                'x-device-key': 'wrong_device_key',
            },
            body: {
                deviceId: 'BIO-FRONT-01',
                employeeCode: 'TCH-001',
                timestamp: new Date().toISOString(),
                type: 'in',
            },
            ip: '127.0.0.1',
        };

        let statusCode = null;
        let responseJson = null;

        const mockRes = {
            status: (code) => {
                statusCode = code;
                return {
                    json: (data) => {
                        responseJson = data;
                    },
                };
            },
        };

        const { verifyBiometricDeviceKey } = await import('../src/middlewares/biometricAuth.js');
        process.env.BIOMETRIC_DEVICE_KEY = 'test_secret_device_key_1234567890';

        await verifyBiometricDeviceKey(mockReq, mockRes, () => {
            assert.fail('Middleware should not have called next() when key is invalid');
        });

        assert.equal(statusCode, 401);
        assert.equal(responseJson.success, false);
        assert.match(responseJson.message, /Invalid device key/);
    });

    it('should allow request with matching x-device-key header', async () => {
        const secretKey = 'test_secret_device_key_1234567890';
        process.env.BIOMETRIC_DEVICE_KEY = secretKey;

        const mockReq = {
            headers: {
                'x-device-key': secretKey,
            },
            body: {
                deviceId: 'BIO-FRONT-01',
                employeeCode: 'TCH-001',
                timestamp: new Date().toISOString(),
                type: 'in',
            },
            ip: '127.0.0.1',
        };

        let nextCalled = false;
        const mockRes = {};

        const { verifyBiometricDeviceKey } = await import('../src/middlewares/biometricAuth.js');

        await verifyBiometricDeviceKey(mockReq, mockRes, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, true);
    });
});

