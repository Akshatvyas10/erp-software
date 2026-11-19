process.env.ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET || 'test_encryption_secret_must_be_at_least_32_characters_long';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import onlinePaymentService from '../src/services/onlinePayment.service.js';

describe('Online Payment Gateway Signature & Verification Tests', () => {
    it('should generate valid HMAC-SHA256 signature and verify successfully', () => {
        const orderId = 'order_test_123456789';
        const paymentId = 'pay_test_987654321';
        const { keySecret } = onlinePaymentService.getCredentials();

        // Calculate legitimate gateway signature
        const legitimateSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const isValid = onlinePaymentService.verifySignature({
            orderId,
            paymentId,
            signature: legitimateSignature,
        });

        assert.equal(isValid, true);
    });

    it('should reject forged or tampered signature', () => {
        const orderId = 'order_test_123456789';
        const paymentId = 'pay_test_987654321';
        const forgedSignature = 'forged_hex_signature_not_matching_hmac_secret_sha256_000000000000';

        const isValid = onlinePaymentService.verifySignature({
            orderId,
            paymentId,
            signature: forgedSignature,
        });

        assert.equal(isValid, false);
    });

    it('should reject signature when orderId or paymentId is tampered', () => {
        const orderId = 'order_test_123456789';
        const paymentId = 'pay_test_987654321';
        const { keySecret } = onlinePaymentService.getCredentials();

        const signature = crypto
            .createHmac('sha256', keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        // Tamper with orderId
        const isTamperedOrderValid = onlinePaymentService.verifySignature({
            orderId: 'order_test_tampered_999',
            paymentId,
            signature,
        });

        assert.equal(isTamperedOrderValid, false);
    });
});
