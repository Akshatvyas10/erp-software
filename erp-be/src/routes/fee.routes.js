import express from 'express';
import * as feeController from '../controllers/fee.controller.js';
import authenticate from '../middlewares/authenticate.js';
import { requirePermission } from '../middlewares/authorize.js';
import validateZod from '../middlewares/zodValidator.js';
import {
    bulkClassInvoiceSchema,
    collectPaymentSchema,
    feeHeadSchema,
    feeHeadUpdateSchema,
    feeStructureSchema,
    feeStructureUpdateSchema,
    singleInvoiceSchema,
} from '../schemas/fee.schema.js';

const router = express.Router();

router.use(authenticate);

// ─── Financial Summary Stats ──────────────────────────────────────────────────
router.get(
    '/summary',
    requirePermission('fees', 'read'),
    feeController.getFeeSummaryStats
);

// ─── Fee Heads ────────────────────────────────────────────────────────────────
router.get(
    '/heads',
    requirePermission('fees', 'read'),
    feeController.getFeeHeads
);

router.post(
    '/heads',
    requirePermission('fees', 'manage'),
    validateZod({ body: feeHeadSchema }),
    feeController.createFeeHead
);

router.put(
    '/heads/:id',
    requirePermission('fees', 'manage'),
    validateZod({ body: feeHeadUpdateSchema }),
    feeController.updateFeeHead
);

router.delete(
    '/heads/:id',
    requirePermission('fees', 'delete'),
    feeController.deleteFeeHead
);

// ─── Fee Structures ───────────────────────────────────────────────────────────
router.get(
    '/structures',
    requirePermission('fees', 'read'),
    feeController.getFeeStructures
);

router.get(
    '/structures/:id',
    requirePermission('fees', 'read'),
    feeController.getFeeStructureById
);

router.post(
    '/structures',
    requirePermission('fees', 'manage'),
    validateZod({ body: feeStructureSchema }),
    feeController.createFeeStructure
);

router.put(
    '/structures/:id',
    requirePermission('fees', 'manage'),
    validateZod({ body: feeStructureUpdateSchema }),
    feeController.updateFeeStructure
);

// ─── Student Invoices ─────────────────────────────────────────────────────────
router.get(
    '/invoices',
    requirePermission('fees', 'read'),
    feeController.getInvoices
);

router.get(
    '/invoices/:id',
    requirePermission('fees', 'read'),
    feeController.getInvoiceById
);

router.post(
    '/invoices/single',
    requirePermission('fees', 'create'),
    validateZod({ body: singleInvoiceSchema }),
    feeController.generateSingleInvoice
);

router.post(
    '/invoices/bulk-class',
    requirePermission('fees', 'create'),
    validateZod({ body: bulkClassInvoiceSchema }),
    feeController.generateBulkClassInvoices
);

// ─── Fee Payments & Receipts ──────────────────────────────────────────────────
router.post(
    '/payments/collect',
    requirePermission('fees', 'collect'),
    validateZod({ body: collectPaymentSchema }),
    feeController.collectPayment
);

router.get(
    '/receipts/:id',
    requirePermission('fees', 'read'),
    feeController.getReceiptById
);

// ─── Student Fee Ledger ───────────────────────────────────────────────────────
router.get(
    '/ledger/:studentId',
    requirePermission('fees', 'read'),
    feeController.getStudentFeeLedger
);

export default router;

