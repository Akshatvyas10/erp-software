'use strict';

import onlinePaymentService from '../services/onlinePayment.service.js';
import { success, error } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

/**
 * POST /api/fees/online/create-order
 * Creates a verified payment order against a student invoice.
 */
export const createPaymentOrder = async (req, res, next) => {
    try {
        const { invoiceId, studentId, amount, customerNotes } = req.body;
        
        // Scope guard: Students can only create orders for their own invoices
        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        if (isStudent && req.user.studentProfile?.id && req.user.studentProfile.id !== studentId) {
            return error(res, 'Access denied: You can only pay your own invoices.', 403);
        }

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
        return error(res, err.message, 400);
    }
};

/**
 * POST /api/fees/online/verify-payment
 * Verifies gateway cryptographic signature and books payment into the student ledger.
 */
export const verifyPayment = async (req, res, next) => {
    try {
        const { orderId, paymentId, signature, invoiceId, studentId, amount } = req.body;

        const isStudent = req.userRoles?.some(r => r.toUpperCase() === 'STUDENT');
        if (isStudent && req.user.studentProfile?.id && req.user.studentProfile.id !== studentId) {
            return error(res, 'Access denied: You cannot verify payments for another student.', 403);
        }

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
        return error(res, err.message, 400);
    }
};

