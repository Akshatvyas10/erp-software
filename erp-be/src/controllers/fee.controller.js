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
        const payment = await feeService.collectPayment(req.body, req.user.id);
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

        // IDOR protection
        if (req.user?.roles?.some((r) => r.name === 'student') && req.user?.studentProfile?.id) {
            studentId = req.user.studentProfile.id;
        }

        const ledger = await feeService.getStudentFeeLedger(studentId);
        return success(res, ledger, 'Student fee ledger retrieved successfully');
    } catch (err) {
        next(err);
    }
};

export const getFeeSummaryStats = async (req, res, next) => {
    try {
        const stats = await feeService.getFeeSummaryStats();
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


