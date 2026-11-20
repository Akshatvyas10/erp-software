import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateReceiptPdfStream } from '../src/utils/receiptPdf.js';
import { Writable } from 'node:stream';

describe('Fee Receipts PDF & CSV Formatting Unit Tests', () => {
    const mockReceipt = {
        id: '11111111-2222-3333-4444-555555555555',
        receiptNumber: 'REC-2026-TEST01',
        paymentDate: '2026-11-21',
        amountPaid: 4500.00,
        paymentMode: 'ADVANCE_CREDIT',
        referenceNumber: 'ADV-ADJUST-INV-TEST01',
        collectedBy: { firstName: 'Accountant', lastName: 'Admin' },
        invoice: {
            invoiceNumber: 'INV-2026-TEST01',
            totalAmount: 12000.00,
            balanceAmount: 7500.00,
            discountAmount: 500.00,
            fineAmount: 0.00,
            student: {
                studentId: 'STU-001',
                admissionNumber: 'ADM-2026-001',
                account: { firstName: 'Aarav', lastName: 'Sharma' },
                guardianName: 'Rajesh Sharma',
                guardianPhone: '9876543210',
            },
            classroom: { name: 'Grade 10', section: 'A' },
            academicYear: { name: '2026-2027' },
            items: [
                { headName: 'Tuition Fee', amount: 10000.00, feeHead: { category: 'TUITION' } },
                { headName: 'Transport Fee (Route 1)', amount: 2500.00, feeHead: { category: 'TRANSPORT' } },
            ],
        },
    };

    it('should generate valid A4 PDF stream chunks without throwing', async () => {
        const stream = generateReceiptPdfStream({
            receipt: mockReceipt,
            schoolConfig: { schoolName: 'Delhi Public Test School' },
            format: 'A4',
        });

        assert.ok(stream, 'Stream should be initialized');

        const chunks = [];
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        const totalBuffer = Buffer.concat(chunks);
        assert.ok(totalBuffer.length > 500, 'PDF buffer should be larger than 500 bytes');
        assert.equal(totalBuffer.subarray(0, 4).toString(), '%PDF', 'Buffer should begin with %PDF magic header');
    });

    it('should generate valid 80mm thermal POS PDF stream without throwing', async () => {
        const stream = generateReceiptPdfStream({
            receipt: mockReceipt,
            schoolConfig: { schoolName: 'Delhi Public Test School' },
            format: '80mm',
        });

        assert.ok(stream, 'Stream should be initialized');

        const chunks = [];
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', resolve);
            stream.on('error', reject);
        });

        const totalBuffer = Buffer.concat(chunks);
        assert.ok(totalBuffer.length > 300, '80mm thermal buffer should be generated');
        assert.equal(totalBuffer.subarray(0, 4).toString(), '%PDF', 'Buffer should begin with %PDF magic header');
    });
});
