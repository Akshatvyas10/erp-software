import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
    bulkFeeReminderSchema, 
    feeReminderSettingsSchema,
    reversePaymentSchema,
    waiveFineSchema,
    requestRefundSchema
} from '../src/schemas/fee.schema.js';

describe('Fee Management Schema Validation Tests (Zod)', () => {
    it('should validate valid bulk fee reminder payload with administrative note', () => {
        const payload = {
            studentIds: ['d3b07384-d113-44d5-8f7b-689b6574f260', 'b78a9c33-6625-4c07-bf3f-7e9b25134789'],
            customNote: 'Exam hall tickets will be withheld if dues are not settled before Monday.',
            administrativeNote: 'Urgent notice from accounts office.',
        };

        const result = bulkFeeReminderSchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.studentIds.length, 2);
        assert.equal(result.data.customNote, payload.customNote);
        assert.equal(result.data.administrativeNote, payload.administrativeNote);
    });

    it('should reject bulk fee reminder payload with empty studentIds', () => {
        const payload = {
            studentIds: [],
            customNote: 'Please pay dues.',
        };

        const result = bulkFeeReminderSchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it('should validate valid fee reminder settings', () => {
        const payload = {
            enabled: true,
            daysBeforeDue: [7, 3, 1],
            remindBeforeExam: true,
            maxRemindersPerDay: 2,
            defaultAdministrativeNote: 'Please clear pending dues.',
        };

        const result = feeReminderSettingsSchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.enabled, true);
        assert.equal(result.data.maxRemindersPerDay, 2);
    });

    it('should validate payment reversal schema', () => {
        const payload = {
            reason: 'Cheque bounced due to signature mismatch',
            bouncePenaltyAmount: 250,
        };

        const result = reversePaymentSchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.bouncePenaltyAmount, 250);
    });

    it('should reject payment reversal with missing reason', () => {
        const payload = {
            reason: 'a', // too short (< 3)
        };

        const result = reversePaymentSchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it('should validate fine waiver schema with positive amount', () => {
        const payload = {
            waiveAmount: 150.50,
            reason: 'Principal approved medical exception',
        };

        const result = waiveFineSchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.waiveAmount, 150.50);
    });

    it('should reject non-positive waiver amount', () => {
        const payload = {
            waiveAmount: 0,
            reason: 'Invalid zero waiver',
        };

        const result = waiveFineSchema.safeParse(payload);
        assert.equal(result.success, false);
    });

    it('should validate refund voucher request schema', () => {
        const payload = {
            studentId: 'd3b07384-d113-44d5-8f7b-689b6574f260',
            refundType: 'SECURITY_DEPOSIT',
            amount: 5000,
            paymentMode: 'BANK_TRANSFER',
            reason: 'Student graduated and completed clearance',
        };

        const result = requestRefundSchema.safeParse(payload);
        assert.equal(result.success, true);
        assert.equal(result.data.refundType, 'SECURITY_DEPOSIT');
        assert.equal(result.data.amount, 5000);
    });
});
