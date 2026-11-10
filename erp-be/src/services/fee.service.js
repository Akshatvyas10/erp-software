import { Op } from 'sequelize';
import db from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const {
    sequelize,
    FeeHead,
    FeeStructure,
    FeeStructureItem,
    StudentInvoice,
    StudentInvoiceItem,
    FeePayment,
    Student,
    Classroom,
    AcademicYear,
    User,
} = db;

/**
 * Service handling Fee Masters, Invoices, and Payment collections
 */
class FeeService {
    // ══════════════════════════════════════════════════════════════════════════
    // FEE HEADS
    // ══════════════════════════════════════════════════════════════════════════

    async getFeeHeads({ isActive, category } = {}) {
        const where = {};
        if (typeof isActive === 'boolean') where.isActive = isActive;
        if (category) where.category = category;

        return await FeeHead.findAll({
            where,
            order: [['category', 'ASC'], ['name', 'ASC']],
        });
    }

    async createFeeHead(data) {
        const existing = await FeeHead.findOne({ where: { code: data.code.toUpperCase() } });
        if (existing) {
            throw new ApiError(409, `Fee Head with code '${data.code}' already exists`);
        }
        return await FeeHead.create(data);
    }

    async updateFeeHead(id, data) {
        const feeHead = await FeeHead.findByPk(id);
        if (!feeHead) throw new ApiError(404, 'Fee Head not found');

        if (data.code && data.code.toUpperCase() !== feeHead.code) {
            const duplicate = await FeeHead.findOne({ where: { code: data.code.toUpperCase() } });
            if (duplicate) throw new ApiError(409, `Fee Head with code '${data.code}' already exists`);
        }

        return await feeHead.update(data);
    }

    async deleteFeeHead(id) {
        const feeHead = await FeeHead.findByPk(id);
        if (!feeHead) throw new ApiError(404, 'Fee Head not found');

        // Check if head is linked to active structure items or invoice items
        const linkedStructures = await FeeStructureItem.count({ where: { feeHeadId: id } });
        if (linkedStructures > 0) {
            throw new ApiError(400, 'Cannot delete Fee Head linked to one or more Fee Structures. Deactivate it instead.');
        }

        const linkedInvoices = await StudentInvoiceItem.count({ where: { feeHeadId: id } });
        if (linkedInvoices > 0) {
            throw new ApiError(400, 'Cannot delete Fee Head associated with historical invoices. Deactivate it instead.');
        }

        await feeHead.destroy();
        return { message: 'Fee Head removed successfully' };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FEE STRUCTURES
    // ══════════════════════════════════════════════════════════════════════════

    async getFeeStructures({ academicYearId, classroomId, quota, isActive } = {}) {
        const where = {};
        if (academicYearId) where.academicYearId = academicYearId;
        if (classroomId) where.classroomId = classroomId;
        if (quota) where.quota = quota;
        if (typeof isActive === 'boolean') where.isActive = isActive;

        return await FeeStructure.findAll({
            where,
            include: [
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'code', 'isCurrent'],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'grade', 'section'],
                },
                {
                    model: FeeStructureItem,
                    as: 'items',
                    include: [
                        {
                            model: FeeHead,
                            as: 'feeHead',
                            attributes: ['id', 'code', 'name', 'category'],
                        },
                    ],
                },
            ],
            order: [['createdAt', 'DESC']],
        });
    }

    async getFeeStructureById(id) {
        const structure = await FeeStructure.findByPk(id, {
            include: [
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'code', 'isCurrent'],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'grade', 'section'],
                },
                {
                    model: FeeStructureItem,
                    as: 'items',
                    include: [
                        {
                            model: FeeHead,
                            as: 'feeHead',
                            attributes: ['id', 'code', 'name', 'category'],
                        },
                    ],
                },
            ],
        });
        if (!structure) throw new ApiError(404, 'Fee Structure not found');
        return structure;
    }

    async createFeeStructure(data, userId) {
        return await sequelize.transaction(async (t) => {
            const { items, ...structureData } = data;

            // Compute total amount from items
            const totalAmount = items.reduce((sum, it) => sum + Number(it.amount), 0);

            const structure = await FeeStructure.create(
                {
                    ...structureData,
                    totalAmount,
                    createdById: userId,
                },
                { transaction: t }
            );

            const structureItems = items.map((it) => ({
                feeStructureId: structure.id,
                feeHeadId: it.feeHeadId,
                amount: it.amount,
                isMandatory: it.isMandatory ?? true,
                notes: it.notes || null,
            }));

            await FeeStructureItem.bulkCreate(structureItems, { transaction: t });

            return await FeeStructure.findByPk(structure.id, {
                include: [
                    {
                        model: FeeStructureItem,
                        as: 'items',
                        include: [{ model: FeeHead, as: 'feeHead' }],
                    },
                ],
                transaction: t,
            });
        });
    }

    async updateFeeStructure(id, data) {
        return await sequelize.transaction(async (t) => {
            const structure = await FeeStructure.findByPk(id, { transaction: t });
            if (!structure) throw new ApiError(404, 'Fee Structure not found');

            const { items, ...updates } = data;

            if (items && Array.isArray(items)) {
                // Delete existing items and recreate
                await FeeStructureItem.destroy({
                    where: { feeStructureId: id },
                    transaction: t,
                });

                const totalAmount = items.reduce((sum, it) => sum + Number(it.amount), 0);
                updates.totalAmount = totalAmount;

                const structureItems = items.map((it) => ({
                    feeStructureId: id,
                    feeHeadId: it.feeHeadId,
                    amount: it.amount,
                    isMandatory: it.isMandatory ?? true,
                    notes: it.notes || null,
                }));

                await FeeStructureItem.bulkCreate(structureItems, { transaction: t });
            }

            await structure.update(updates, { transaction: t });

            return await FeeStructure.findByPk(id, {
                include: [
                    {
                        model: FeeStructureItem,
                        as: 'items',
                        include: [{ model: FeeHead, as: 'feeHead' }],
                    },
                ],
                transaction: t,
            });
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STUDENT INVOICES
    // ══════════════════════════════════════════════════════════════════════════

    async _getNextInvoiceNumber(transaction) {
        const [result] = await sequelize.query("SELECT nextval('student_invoice_seq') as seq", {
            transaction,
        });
        const currentYear = new Date().getFullYear();
        const seqVal = String(result[0].seq).padStart(5, '0');
        return `INV-${currentYear}-${seqVal}`;
    }

    async _getNextReceiptNumber(transaction) {
        const [result] = await sequelize.query("SELECT nextval('fee_receipt_seq') as seq", {
            transaction,
        });
        const currentYear = new Date().getFullYear();
        const seqVal = String(result[0].seq).padStart(5, '0');
        return `REC-${currentYear}-${seqVal}`;
    }

    async generateSingleInvoice(data, userId) {
        return await sequelize.transaction(async (t) => {
            const student = await Student.findByPk(data.studentId, {
                include: [{ model: Classroom, as: 'classroom' }],
                transaction: t,
            });
            if (!student) throw new ApiError(404, 'Student not found');

            const invoiceNumber = await this._getNextInvoiceNumber(t);

            const itemsTotal = data.items.reduce(
                (sum, it) => sum + (Number(it.amount) - (Number(it.discountAmount) || 0)),
                0
            );

            const discountAmount = Number(data.discountAmount) || 0;
            const fineAmount = Number(data.fineAmount) || 0;
            const netAmount = Math.max(0, itemsTotal - discountAmount + fineAmount);

            const invoice = await StudentInvoice.create(
                {
                    invoiceNumber,
                    studentId: data.studentId,
                    classroomId: student.classroomId || null,
                    academicYearId: data.academicYearId,
                    feeStructureId: data.feeStructureId || null,
                    title: data.title,
                    description: data.description || null,
                    dueDate: data.dueDate,
                    subtotalAmount: itemsTotal,
                    discountAmount,
                    fineAmount,
                    totalAmount: netAmount,
                    paidAmount: 0,
                    balanceAmount: netAmount,
                    status: 'ISSUED',
                    issuedDate: new Date().toISOString().split('T')[0],
                    notes: data.notes || null,
                    createdById: userId,
                },
                { transaction: t }
            );

            const invoiceItems = data.items.map((it) => ({
                invoiceId: invoice.id,
                feeHeadId: it.feeHeadId,
                title: it.title,
                amount: it.amount,
                discountAmount: it.discountAmount || 0,
                netAmount: Math.max(0, Number(it.amount) - (Number(it.discountAmount) || 0)),
                notes: it.notes || null,
            }));

            await StudentInvoiceItem.bulkCreate(invoiceItems, { transaction: t });

            return await StudentInvoice.findByPk(invoice.id, {
                include: [
                    { model: Student, as: 'student' },
                    { model: Classroom, as: 'classroom' },
                    { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                ],
                transaction: t,
            });
        });
    }

    async generateBulkClassInvoices(data, userId) {
        return await sequelize.transaction(async (t) => {
            const { classroomId, academicYearId, feeStructureId, title, description, dueDate, notes } = data;

            // Load fee structure with items
            const feeStructure = await FeeStructure.findByPk(feeStructureId, {
                include: [{ model: FeeStructureItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] }],
                transaction: t,
            });
            if (!feeStructure) throw new ApiError(404, 'Fee Structure not found');
            if (!feeStructure.items || feeStructure.items.length === 0) {
                throw new ApiError(400, 'Selected Fee Structure has no line items');
            }

            // Find all active enrolled students in this classroom
            const students = await Student.findAll({
                where: {
                    classroomId,
                    status: 'active',
                },
                transaction: t,
            });

            if (students.length === 0) {
                throw new ApiError(400, 'No active students found in the selected classroom');
            }

            const itemsTotal = feeStructure.items.reduce((sum, it) => sum + Number(it.amount), 0);
            const createdInvoices = [];

            for (const student of students) {
                const invoiceNumber = await this._getNextInvoiceNumber(t);

                const invoice = await StudentInvoice.create(
                    {
                        invoiceNumber,
                        studentId: student.id,
                        classroomId,
                        academicYearId,
                        feeStructureId,
                        title,
                        description: description || `Class invoice for ${feeStructure.name}`,
                        dueDate,
                        subtotalAmount: itemsTotal,
                        discountAmount: 0,
                        fineAmount: 0,
                        totalAmount: itemsTotal,
                        paidAmount: 0,
                        balanceAmount: itemsTotal,
                        status: 'ISSUED',
                        issuedDate: new Date().toISOString().split('T')[0],
                        notes: notes || null,
                        createdById: userId,
                    },
                    { transaction: t }
                );

                const invoiceItems = feeStructure.items.map((it) => ({
                    invoiceId: invoice.id,
                    feeHeadId: it.feeHeadId,
                    title: it.feeHead ? it.feeHead.name : 'Fee Item',
                    amount: it.amount,
                    discountAmount: 0,
                    netAmount: it.amount,
                    notes: it.notes || null,
                }));

                await StudentInvoiceItem.bulkCreate(invoiceItems, { transaction: t });
                createdInvoices.push(invoice.id);
            }

            return {
                message: `Successfully generated ${createdInvoices.length} student invoices for class`,
                count: createdInvoices.length,
                invoiceIds: createdInvoices,
            };
        });
    }

    async getInvoices({
        studentId,
        classroomId,
        academicYearId,
        status,
        search,
        page = 1,
        limit = 20,
    } = {}) {
        const where = {};
        if (studentId) where.studentId = studentId;
        if (classroomId) where.classroomId = classroomId;
        if (academicYearId) where.academicYearId = academicYearId;
        if (status) where.status = status;

        const studentWhere = {};
        if (search) {
            where[Op.or] = [
                { invoiceNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const offset = (Number(page) - 1) * Number(limit);

        const { count, rows } = await StudentInvoice.findAndCountAll({
            where,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber', 'rollNumber', 'status'],
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'firstName', 'lastName', 'email', 'avatar'],
                        },
                    ],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'grade', 'section'],
                },
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'code', 'isCurrent'],
                },
                {
                    model: StudentInvoiceItem,
                    as: 'items',
                    include: [{ model: FeeHead, as: 'feeHead', attributes: ['id', 'code', 'name', 'category'] }],
                },
                {
                    model: FeePayment,
                    as: 'payments',
                    attributes: ['id', 'receiptNumber', 'amount', 'paymentMode', 'paymentDate'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset,
            distinct: true,
        });

        return {
            invoices: rows,
            pagination: {
                total: count,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(count / Number(limit)),
            },
        };
    }

    async getInvoiceById(id) {
        const invoice = await StudentInvoice.findByPk(id, {
            include: [
                {
                    model: Student,
                    as: 'student',
                    include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone', 'avatar'] }],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'grade', 'section'],
                },
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'code', 'isCurrent'],
                },
                {
                    model: StudentInvoiceItem,
                    as: 'items',
                    include: [{ model: FeeHead, as: 'feeHead' }],
                },
                {
                    model: FeePayment,
                    as: 'payments',
                    include: [{ model: User, as: 'collectedBy', attributes: ['id', 'firstName', 'lastName'] }],
                },
            ],
        });

        if (!invoice) throw new ApiError(404, 'Invoice not found');
        return invoice;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FEE COLLECTION & PAYMENTS
    // ══════════════════════════════════════════════════════════════════════════

    async collectPayment(data, userId) {
        return await sequelize.transaction(async (t) => {
            const invoice = await StudentInvoice.findByPk(data.invoiceId, {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!invoice) throw new ApiError(404, 'Invoice not found');

            if (invoice.status === 'PAID') {
                throw new ApiError(400, 'Invoice has already been paid in full');
            }
            if (invoice.status === 'CANCELLED') {
                throw new ApiError(400, 'Cannot record payment for a cancelled invoice');
            }

            const paymentAmount = Number(data.amount);
            const currentBalance = Number(invoice.balanceAmount);

            if (paymentAmount <= 0) {
                throw new ApiError(400, 'Payment amount must be greater than zero');
            }
            if (paymentAmount > currentBalance) {
                throw new ApiError(
                    400,
                    `Payment amount (₹${paymentAmount}) exceeds outstanding balance (₹${currentBalance})`
                );
            }

            const receiptNumber = await this._getNextReceiptNumber(t);
            const newPaidAmount = Number(invoice.paidAmount) + paymentAmount;
            const newBalanceAmount = Math.max(0, currentBalance - paymentAmount);
            const newStatus = newBalanceAmount === 0 ? 'PAID' : 'PARTIALLY_PAID';

            const payment = await FeePayment.create(
                {
                    receiptNumber,
                    invoiceId: invoice.id,
                    studentId: invoice.studentId,
                    amount: paymentAmount,
                    paymentMode: data.paymentMode,
                    paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                    transactionReference: data.transactionReference || null,
                    chequeNumber: data.chequeNumber || null,
                    chequeDate: data.chequeDate || null,
                    bankName: data.bankName || null,
                    notes: data.notes || null,
                    collectedById: userId,
                },
                { transaction: t }
            );

            await invoice.update(
                {
                    paidAmount: newPaidAmount,
                    balanceAmount: newBalanceAmount,
                    status: newStatus,
                },
                { transaction: t }
            );

            return await FeePayment.findByPk(payment.id, {
                include: [
                    {
                        model: StudentInvoice,
                        as: 'invoice',
                        include: [
                            {
                                model: Student,
                                as: 'student',
                                include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email'] }],
                            },
                            { model: Classroom, as: 'classroom' },
                        ],
                    },
                    {
                        model: User,
                        as: 'collectedBy',
                        attributes: ['id', 'firstName', 'lastName'],
                    },
                ],
                transaction: t,
            });
        });
    }

    async getReceiptById(receiptId) {
        const receipt = await FeePayment.findByPk(receiptId, {
            include: [
                {
                    model: StudentInvoice,
                    as: 'invoice',
                    include: [
                        {
                            model: Student,
                            as: 'student',
                            include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone'] }],
                        },
                        { model: Classroom, as: 'classroom' },
                        { model: AcademicYear, as: 'academicYear' },
                        { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                    ],
                },
                {
                    model: User,
                    as: 'collectedBy',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
        });
        if (!receipt) throw new ApiError(404, 'Receipt not found');
        return receipt;
    }

    // ══════════════════════════════════════════════════════════════════════════
    // STUDENT FEE LEDGER & FINANCIAL SUMMARY
    // ══════════════════════════════════════════════════════════════════════════

    async getStudentFeeLedger(studentId) {
        const student = await Student.findByPk(studentId, {
            include: [
                { model: User, as: 'user', attributes: ['firstName', 'lastName', 'email', 'phone', 'avatar'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'grade', 'section'] },
            ],
        });
        if (!student) throw new ApiError(404, 'Student not found');

        const invoices = await StudentInvoice.findAll({
            where: { studentId },
            include: [
                { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'code'] },
            ],
            order: [['createdAt', 'DESC']],
        });

        const payments = await FeePayment.findAll({
            where: { studentId },
            include: [
                { model: User, as: 'collectedBy', attributes: ['id', 'firstName', 'lastName'] },
                { model: StudentInvoice, as: 'invoice', attributes: ['invoiceNumber', 'title'] },
            ],
            order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']],
        });

        const totalBilled = invoices
            .filter((inv) => inv.status !== 'CANCELLED')
            .reduce((sum, inv) => sum + Number(inv.totalAmount), 0);

        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const outstandingBalance = Math.max(0, totalBilled - totalPaid);

        return {
            student,
            summary: {
                totalBilled,
                totalPaid,
                outstandingBalance,
                invoicesCount: invoices.length,
                paymentsCount: payments.length,
            },
            invoices,
            payments,
        };
    }

    async getFeeSummaryStats() {
        const todayStr = new Date().toISOString().split('T')[0];

        // Total Billed, Total Collected, Total Balance
        const [totals] = await sequelize.query(`
            SELECT 
                COALESCE(SUM(total_amount), 0) AS "totalBilled",
                COALESCE(SUM(paid_amount), 0) AS "totalCollected",
                COALESCE(SUM(balance_amount), 0) AS "totalPending"
            FROM student_invoices
            WHERE status != 'CANCELLED' AND deleted_at IS NULL
        `);

        // Today's Collection
        const [todayCollections] = await sequelize.query(
            `
            SELECT 
                COALESCE(SUM(amount), 0) AS "todayTotal",
                COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount ELSE 0 END), 0) AS "todayCash",
                COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount ELSE 0 END), 0) AS "todayUpi",
                COALESCE(SUM(CASE WHEN payment_mode = 'BANK_TRANSFER' THEN amount ELSE 0 END), 0) AS "todayBankTransfer"
            FROM fee_payments
            WHERE payment_date = :todayStr AND deleted_at IS NULL
        `,
            { replacements: { todayStr } }
        );

        // Status counts
        const [statusCounts] = await sequelize.query(`
            SELECT status, COUNT(*) AS count
            FROM student_invoices
            WHERE deleted_at IS NULL
            GROUP BY status
        `);

        return {
            totals: totals[0],
            today: todayCollections[0],
            statusBreakdown: statusCounts,
        };
    }
}

export default new FeeService();

