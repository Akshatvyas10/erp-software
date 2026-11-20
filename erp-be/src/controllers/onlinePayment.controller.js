'use strict';

import onlinePaymentService from '../services/onlinePayment.service.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';
import { assertStudentOwnership } from '../utils/studentOwnership.js';

/**
 * POST /api/fees/online/create-order
 * Creates a verified payment order against a student invoice.
 */
export const createPaymentOrder = async (req, res, next) => {
    try {
        const { invoiceId, studentId, amount, customerNotes } = req.body;
        
        // Scope guard: Students & parents can only create orders for their own ward's invoices
        await assertStudentOwnership(req.user, studentId, req.userRoles);

        const orderData = await onlinePaymentService.createOrder({
            invoiceId,
            studentId,
            amount,
            customerNotes: {
                ...customerNotes,
                studentName: req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() : 'Student',
            },
        });

        return success(res, orderData, 'Payment order created successfully', 201);
    } catch (err) {
        logger.error('[ONLINE PAYMENT] createPaymentOrder error:', err);
        const statusCode = err.statusCode || 400;
        return error(res, err.message, statusCode);
    }
};

/**
 * POST /api/fees/online/verify-payment
 * Verifies gateway cryptographic signature and books payment into the student ledger.
 */
export const verifyPayment = async (req, res, next) => {
    try {
        const { orderId, paymentId, signature, invoiceId, studentId, amount } = req.body;

        // Scope guard: Verify ownership before booking settlement
        await assertStudentOwnership(req.user, studentId, req.userRoles);

        const result = await onlinePaymentService.verifyAndSettlePayment({
            orderId,
            paymentId,
            signature,
            invoiceId,
            studentId,
            amount,
            userAccount: req.user,
        });

        return success(res, result, 'Payment verified and credited to student fee ledger successfully');
    } catch (err) {
        logger.error('[ONLINE PAYMENT] verifyPayment error:', err);
        const statusCode = err.statusCode || 400;
        return error(res, err.message, statusCode);
    }
};

/**
 * POST /api/fees/online/webhook
 * Receives server-to-server webhook notifications from Razorpay with signature verification.
 */
export const handleWebhook = async (req, res) => {
    try {
        const signature = req.headers['x-razorpay-signature'];
        if (!signature) {
            return res.status(400).json({ success: false, message: 'Missing x-razorpay-signature header' });
        }

        const rawBody = req.rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
        const payload = typeof req.body === 'object' ? req.body : JSON.parse(req.body);

        const result = await onlinePaymentService.handleWebhookEvent(payload, signature, rawBody);
        return res.status(200).json({ success: true, message: 'Webhook processed', data: result });
    } catch (err) {
        logger.error('[ONLINE PAYMENT] handleWebhook error:', err.message);
        return res.status(400).json({ success: false, message: err.message });
    }
};

