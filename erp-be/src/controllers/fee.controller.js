import feeService from '../services/fee.service.js';
import { success } from '../utils/apiResponse.js';

// ─── Fee Heads ─────────────────────────────────────────────────────────────────
export const getFeeHeads = async (req, res, next) => {
    try {
        const { isActive, category } = req.query;
        const heads = await feeService.getFeeHeads({
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
            category,
        });
        return success(res, heads, 'Fee heads fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const createFeeHead = async (req, res, next) => {
    try {
        const head = await feeService.createFeeHead(req.body);
        return success(res, head, 'Fee head created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const updateFeeHead = async (req, res, next) => {
    try {
        const head = await feeService.updateFeeHead(req.params.id, req.body);
        return success(res, head, 'Fee head updated successfully');
    } catch (err) {
        next(err);
    }
};

export const deleteFeeHead = async (req, res, next) => {
    try {
        const result = await feeService.deleteFeeHead(req.params.id);
        return success(res, result, result.message);
    } catch (err) {
        next(err);
    }
};

// ─── Fee Structures ────────────────────────────────────────────────────────────
export const getFeeStructures = async (req, res, next) => {
    try {
        const { academicYearId, classroomId, quota, isActive } = req.query;
        const structures = await feeService.getFeeStructures({
            academicYearId,
            classroomId,
            quota,
            isActive: isActive !== undefined ? isActive === 'true' : undefined,
        });
        return success(res, structures, 'Fee structures fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const getFeeStructureById = async (req, res, next) => {
    try {
        const structure = await feeService.getFeeStructureById(req.params.id);
        return success(res, structure, 'Fee structure retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const createFeeStructure = async (req, res, next) => {
    try {
        const structure = await feeService.createFeeStructure(req.body, req.user.id);
        return success(res, structure, 'Fee structure created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const updateFeeStructure = async (req, res, next) => {
    try {
        const structure = await feeService.updateFeeStructure(req.params.id, req.body);
        return success(res, structure, 'Fee structure updated successfully');
    } catch (err) {
        next(err);
    }
};

export const updateFeeStructureStatus = async (req, res, next) => {
    try {
        const { status } = req.body;
        const structure = await feeService.updateFeeStructureStatus(req.params.id, status, req.user?.id);
        return success(res, structure, `Fee structure marked as ${status}`);
    } catch (err) {
        next(err);
    }
};

export const deleteFeeStructure = async (req, res, next) => {
    try {
        const result = await feeService.deleteFeeStructure(req.params.id, req.user?.id);
        return success(res, result, 'Fee structure deleted successfully');
    } catch (err) {
        next(err);
    }
};

// ─── Student Invoices ─────────────────────────────────────────────────────────
export const getInvoices = async (req, res, next) => {
    try {
        const { studentId, classroomId, academicYearId, status, search, page, limit } = req.query;

        // Zero-IDOR guard: If user is a student, restrict to their own student profile ID
        let finalStudentId = studentId;
        if (req.user?.roles?.some((r) => r.name === 'student') && req.user?.studentProfile?.id) {
            finalStudentId = req.user.studentProfile.id;
        }

        const data = await feeService.getInvoices({
            studentId: finalStudentId,
            classroomId,
            academicYearId,
            status,
            search,
            page,
            limit,
        });
        return res.status(200).json({
            success: true,
            message: 'Invoices fetched successfully',
            data: data.invoices,
            pagination: data.pagination,
        });
    } catch (err) {
        next(err);
    }
};

export const getInvoiceById = async (req, res, next) => {
    try {
        const invoice = await feeService.getInvoiceById(req.params.id);

        // IDOR check for student
        if (
            req.user?.roles?.some((r) => r.name === 'student') &&
            req.user?.studentProfile?.id &&
            invoice.studentId !== req.user.studentProfile.id
        ) {
            return res.status(403).json({ success: false, message: 'Forbidden: You cannot access other students invoices' });
        }

        return success(res, invoice, 'Invoice retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const generateSingleInvoice = async (req, res, next) => {
    try {
        const invoice = await feeService.generateSingleInvoice(req.body, req.user.id);
        return success(res, invoice, 'Invoice generated successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const previewBulkClassInvoices = async (req, res, next) => {
    try {
        const preview = await feeService.previewBulkClassInvoices(req.body);
        return success(res, preview, 'Bulk class invoices preview generated successfully');
    } catch (err) {
        next(err);
    }
};

export const generateBulkClassInvoices = async (req, res, next) => {
    try {
        const result = await feeService.generateBulkClassInvoices(req.body, req.user.id);
        return success(res, result, result.message, 201);
    } catch (err) {
        next(err);
    }
};

// ─── Fee Payments & Receipts ──────────────────────────────────────────────────
export const collectPayment = async (req, res, next) => {
    try {
        const payment = await feeService.collectPayment(req.body, req.user.id, req.user);
        return success(res, payment, 'Payment recorded successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const getReceiptById = async (req, res, next) => {
    try {
        const receipt = await feeService.getReceiptById(req.params.id);

        // IDOR check for student
        if (
            req.user?.roles?.some((r) => r.name === 'student') &&
            req.user?.studentProfile?.id &&
            receipt.studentId !== req.user.studentProfile.id
        ) {
            return res.status(403).json({ success: false, message: 'Forbidden: You cannot access this receipt' });
        }

        return success(res, receipt, 'Receipt retrieved successfully');
    } catch (err) {
        next(err);
    }
};

// ─── Student Ledger & Summary ─────────────────────────────────────────────────
export const getStudentFeeLedger = async (req, res, next) => {
    try {
        let studentId = req.params.studentId;

        // IDOR protection: only override if the user exclusively has the student role
        const roleNames = (req.user?.roles || []).map((r) => (typeof r === 'string' ? r : r.name || '').toLowerCase());
        const isStudentOnly = roleNames.includes('student') && !roleNames.some((r) => ['admin', 'super_admin', 'superadmin', 'accountant', 'faculty'].includes(r));
        if (isStudentOnly && req.user?.studentProfile?.id) {
            studentId = req.user.studentProfile.id;
        }

        const ledger = await feeService.getStudentFeeLedger(studentId);
        return success(res, ledger, 'Student fee ledger retrieved successfully');
    } catch (err) {
        console.error("getStudentFeeLedger failed:", {
            message: err.message,
            pgCode: err.original?.code,
            pgDetail: err.original?.detail,
            sql: err.sql,
        });
        next(err);
    }
};

export const getFeeSummaryStats = async (req, res, next) => {
    try {
        const { academicYearId } = req.query;
        const stats = await feeService.getFeeSummaryStats({ academicYearId });
        return success(res, stats, 'Fee summary statistics retrieved successfully');
    } catch (err) {
        next(err);
    }
};

// ─── Fee Reminders Workflow ───────────────────────────────────────────────────
export const getEligibleReminderStudents = async (req, res, next) => {
    try {
        const { classroomId, periodKey, asOfDate, academicYearId } = req.query;
        const students = await feeService.getEligibleReminderStudents({
            classroomId,
            periodKey,
            asOfDate,
            academicYearId,
        });
        return success(res, students, 'Eligible fee reminder students retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const sendBulkFeeReminders = async (req, res, next) => {
    try {
        const { studentIds, periodKey, dueDate, customNote } = req.body;
        const result = await feeService.sendBulkFeeReminders(
            { studentIds, periodKey, dueDate, customNote },
            req.user?.id
        );
        return success(res, result, 'Fee reminders dispatched successfully');
    } catch (err) {
        next(err);
    }
};

export const getFeeReminderLogs = async (req, res, next) => {
    try {
        const { studentId, periodKey, status, limit, offset } = req.query;
        const logs = await feeService.getFeeReminderLogs({
            studentId,
            periodKey,
            status,
            limit,
            offset,
        });
        return success(res, logs, 'Fee reminder logs retrieved successfully');
    } catch (err) {
        console.error("getFeeReminderLogs failed:", {
            message: err.message,
            pgCode: err.original?.code,
            pgDetail: err.original?.detail,
            sql: err.sql,
        });
        next(err);
    }
};

export const getFeeReminderSettings = async (req, res, next) => {
    try {
        const settings = await feeService.getFeeReminderSettings();
        return success(res, settings, 'Fee reminder settings retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const updateFeeReminderSettings = async (req, res, next) => {
    try {
        const settings = await feeService.updateFeeReminderSettings(req.body);
        return success(res, settings, 'Fee reminder settings updated successfully');
    } catch (err) {
        next(err);
    }
};

export const triggerScheduledReminders = async (req, res, next) => {
    try {
        const result = await feeService.runScheduledFeeReminders();
        return success(res, result, 'Automated fee reminder run completed');
    } catch (err) {
        next(err);
    }
};

// ─── Phase 1: Defaulters, Reversals, Refunds, and Reports ────────────────────

export const getDefaulters = async (req, res, next) => {
    try {
        const { classroomId, agingBracket, minAmount, maxAmount, search, limit, offset } = req.query;
        const defaulters = await feeService.getDefaulters({
            classroomId,
            agingBracket,
            minAmount,
            maxAmount,
            search,
            limit,
            offset,
        });

        logger.info(`[Defaulters Access] User ${req.user?.id || 'unknown'} queried fee defaulters (count: ${defaulters.items?.length || 0}/${defaulters.total || 0})`);

        return success(res, defaulters, 'Fee defaulters retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const reversePayment = async (req, res, next) => {
    try {
        const paymentId = req.params.id;
        const { reason, bouncePenaltyAmount } = req.body;
        const result = await feeService.reversePayment(
            { paymentId, reason, bouncePenaltyAmount },
            req.user.id
        );
        return success(res, result, 'Payment reversed and invoice balance restored successfully');
    } catch (err) {
        next(err);
    }
};

export const getReversedPaymentsLog = async (req, res, next) => {
    try {
        const { limit, offset } = req.query;
        const logs = await feeService.getReversedPaymentsLog({ limit, offset });
        return success(res, logs, 'Reversed payments log retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const waiveLateFine = async (req, res, next) => {
    try {
        const invoiceId = req.params.id;
        const { waiveAmount, reason } = req.body;
        const result = await feeService.waiveLateFine(
            { invoiceId, waiveAmount, reason },
            req.user.id
        );
        return success(res, result, 'Late fine waived successfully');
    } catch (err) {
        next(err);
    }
};

export const requestRefund = async (req, res, next) => {
    try {
        const refund = await feeService.requestRefund(req.body, req.user.id);
        return success(res, refund, 'Fee refund voucher requested successfully');
    } catch (err) {
        next(err);
    }
};

export const updateRefundStatus = async (req, res, next) => {
    try {
        const refundId = req.params.id;
        const refund = await feeService.updateRefundStatus(
            { refundId, ...req.body },
            req.user.id
        );
        return success(res, refund, 'Fee refund status updated successfully');
    } catch (err) {
        next(err);
    }
};

export const getRefunds = async (req, res, next) => {
    try {
        const { status, studentId, limit, offset } = req.query;
        const refunds = await feeService.getRefunds({ status, studentId, limit, offset });
        return success(res, refunds, 'Fee refunds retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const getFinancialReports = async (req, res, next) => {
    try {
        const { startDate, endDate, classroomId } = req.query;
        const reports = await feeService.getFinancialReports({ startDate, endDate, classroomId });
        return success(res, reports, 'Fee financial reports generated successfully');
    } catch (err) {
        next(err);
    }
};

export const getCounterHistory = async (req, res, next) => {
    try {
        const {
            startDate,
            endDate,
            collectedById,
            paymentMode,
            classroomId,
            search,
            includeReversed,
            limit,
            offset,
        } = req.query;

        const history = await feeService.getCounterHistory(
            {
                startDate,
                endDate,
                collectedById,
                paymentMode,
                classroomId,
                search,
                includeReversed,
                limit,
                offset,
            },
            req.user
        );

        return success(res, history, 'Counter collection history retrieved successfully');
    } catch (err) {
        next(err);
    }
};




