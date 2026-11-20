import { Op } from 'sequelize';
import db from '../models/index.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const {
    sequelize,
    FeeHead,
    FeeStructure,
    FeeStructureItem,
    FeeStructureDiscount,
    StudentInvoice,
    StudentInvoiceItem,
    StudentInvoiceInstallment,
    FeePayment,
    Student,
    Classroom,
    ClassroomStudent,
    AcademicClass,
    AcademicYear,
    User,
    FeeReminderLog,
    SchoolConfig,
    FeePaymentReversal,
    FeeRefund,
    TransportRoute,
} = db;
import { hasPermission } from './permissionService.js';
import { enqueueEmailJob } from '../queues/email.queue.js';
import { sendFeeReminderDirect } from './email.service.js';

/**
 * Service handling Fee Masters, Invoices, and Payment collections
 */
class FeeService {
    /**
     * Splits an invoice's total amount across N installments with exact paise math
     * ensuring the sum of all installments equals the total with zero rounding drift.
     * Supports custom explicit due dates (e.g. ['2026-06-15', '2026-09-15', '2026-12-15', '2027-03-15']).
     */
    _splitInstallments({ totalAmount, installmentsCount = 1, startDate, frequency = 'MONTHLY', titlePrefix = 'Installment', customDueDates = null }) {
        const n = Math.max(1, parseInt(installmentsCount, 10) || 1);
        const totalPaise = Math.round(Number(totalAmount || 0) * 100);
        const basePaise = Math.floor(totalPaise / n);
        const remainderPaise = totalPaise - (basePaise * n);

        const installments = [];
        const baseDate = new Date(startDate || new Date().toISOString().split('T')[0]);

        for (let i = 1; i <= n; i++) {
            const isLast = (i === n);
            const installmentPaise = isLast ? (basePaise + remainderPaise) : basePaise;
            const amount = Number((installmentPaise / 100).toFixed(2));

            // Compute due date per interval or pick custom explicit due date if provided
            let dueDateStr;
            if (Array.isArray(customDueDates) && customDueDates[i - 1]) {
                dueDateStr = customDueDates[i - 1];
            } else {
                const instDate = new Date(baseDate);
                if (frequency === 'MONTHLY') {
                    instDate.setMonth(instDate.getMonth() + (i - 1));
                } else if (frequency === 'QUARTERLY') {
                    instDate.setMonth(instDate.getMonth() + ((i - 1) * 3));
                } else if (frequency === 'TERM') {
                    instDate.setMonth(instDate.getMonth() + ((i - 1) * 4));
                } else if (frequency === 'ANNUAL' || frequency === 'ONE_TIME') {
                    // Same base date
                } else {
                    instDate.setMonth(instDate.getMonth() + (i - 1));
                }
                dueDateStr = instDate.toISOString().split('T')[0];
            }

            installments.push({
                installmentNumber: i,
                title: n > 1 ? `${titlePrefix} ${i} of ${n}` : `${titlePrefix}`,
                dueDate: dueDateStr,
                baseAmount: amount,
                lateFineAmount: 0,
                waivedFineAmount: 0,
                totalAmount: amount,
                paidAmount: 0,
                balanceAmount: amount,
                status: 'PENDING',
            });
        }

        return installments;
    }

    /**
     * Calculates and enriches dynamic late fees on installments.
     * Late fees accrue ONLY on installments that are past their dueDate and have balanceAmount > 0.
     * Future installments whose dueDate has not arrived NEVER accrue late fees.
     */
    _enrichInstallmentsWithLateFines(installments = [], lateFinePerDay = 0, gracePeriodDays = 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const todayDate = new Date(todayStr);

        return (installments || []).map((inst) => {
            const instObj = inst.toJSON ? inst.toJSON() : { ...inst };
            const dueDate = new Date(instObj.dueDate);
            const diffDays = Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24));
            const overdueDays = Math.max(0, diffDays - Number(gracePeriodDays || 0));
            const isOverdue = Number(instObj.balanceAmount || 0) > 0 && overdueDays > 0;

            let accruedFine = Number(instObj.lateFineAmount || 0);
            if (isOverdue && Number(lateFinePerDay || 0) > 0 && accruedFine === 0) {
                // Idempotent accrued fine calculation
                accruedFine = Number((overdueDays * Number(lateFinePerDay)).toFixed(2));
            }

            const waivedFine = Number(instObj.waivedFineAmount || 0);
            const netFine = Math.max(0, accruedFine - waivedFine);
            const effectivePayable = Number((Number(instObj.balanceAmount || 0) + netFine).toFixed(2));

            let status = instObj.status;
            if (Number(instObj.balanceAmount || 0) === 0) {
                status = 'PAID';
            } else if (Number(instObj.paidAmount || 0) > 0) {
                status = 'PARTIALLY_PAID';
            } else if (isOverdue) {
                status = 'OVERDUE';
            } else {
                status = 'PENDING';
            }

            return {
                ...instObj,
                isOverdue,
                overdueDays,
                accruedFine,
                netFine,
                effectivePayable,
                status,
            };
        });
    }
    // ══════════════════════════════════════════════════════════════════════════
    // FEE HEADS
    // ══════════════════════════════════════════════════════════════════════════

    async getFeeHeads({ isActive } = {}) {
        const where = {};
        if (typeof isActive === 'boolean') where.status = isActive ? 'ACTIVE' : 'INACTIVE';

        return await FeeHead.findAll({
            where,
            order: [['name', 'ASC']],
        });
    }

    async createFeeHead(data) {
        let finalCode = data.code;
        if (!finalCode) {
            // Auto-generate code from name: "Computer Lab Fee" -> "COMPUTER_LAB_FEE"
            finalCode = data.name
                .toUpperCase()
                .replace(/[^A-Z0-9\s]/g, '')
                .trim()
                .replace(/\s+/g, '_')
                .slice(0, 20);

            // If duplicate exists, append random suffix
            const existingCode = await FeeHead.findOne({ where: { code: finalCode } });
            if (existingCode) {
                finalCode = `${finalCode.slice(0, 15)}_${Math.floor(100 + Math.random() * 900)}`;
            }
        } else {
            finalCode = finalCode.toUpperCase().trim();
            const existing = await FeeHead.findOne({ where: { code: finalCode } });
            if (existing) {
                throw new ApiError(409, `Fee Head with code '${finalCode}' already exists`);
            }
        }

        return await FeeHead.create({
            ...data,
            code: finalCode,
        });
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

    async getFeeStructures({ academicYearId, academicClassId, status, isActive } = {}) {
        const where = {};
        if (academicYearId) where.academicYearId = academicYearId;
        if (academicClassId) where.academicClassId = academicClassId;
        if (status) where.status = status;
        if (typeof isActive === 'boolean') where.status = isActive ? 'ACTIVE' : 'INACTIVE';

        return await FeeStructure.findAll({
            where,
            include: [
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'isCurrent'],
                },
                {
                    model: AcademicClass,
                    as: 'academicClass',
                    attributes: ['id', 'name', 'code', 'orderIndex'],
                },
                {
                    model: FeeStructureItem,
                    as: 'items',
                    include: [
                        {
                            model: FeeHead,
                            as: 'feeHead',
                            attributes: ['id', 'code', 'name', 'description'],
                        },
                    ],
                },
                {
                    model: FeeStructureDiscount,
                    as: 'discounts',
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
                    attributes: ['id', 'name', 'isCurrent'],
                },
                {
                    model: AcademicClass,
                    as: 'academicClass',
                    attributes: ['id', 'name', 'code', 'orderIndex'],
                },
                {
                    model: FeeStructureItem,
                    as: 'items',
                    include: [
                        {
                            model: FeeHead,
                            as: 'feeHead',
                            attributes: ['id', 'code', 'name', 'description'],
                        },
                    ],
                },
                {
                    model: FeeStructureDiscount,
                    as: 'discounts',
                },
            ],
        });
        if (!structure) throw new ApiError(404, 'Fee Structure not found');
        return structure;
    }

    async createFeeStructure(data, userId) {
        return await sequelize.transaction(async (t) => {
            const { items = [], discounts = [], ...structureData } = data;

            const structure = await FeeStructure.create(
                {
                    ...structureData,
                    createdById: userId,
                },
                { transaction: t }
            );

            // Create frequency-wise structure items
            if (items.length > 0) {
                const structureItems = items.map((it) => ({
                    feeStructureId: structure.id,
                    feeHeadId: it.feeHeadId,
                    amount: it.amount || 0,
                    frequency: it.frequency || 'MONTHLY',
                    isEnabled: it.isEnabled ?? true,
                }));

                await FeeStructureItem.bulkCreate(structureItems, { transaction: t });
            }

            // Create quota discounts
            if (discounts.length > 0) {
                const discountItems = discounts.map((d) => ({
                    feeStructureId: structure.id,
                    quota: d.quota,
                    discountType: d.discountType || 'PERCENTAGE',
                    discountValue: d.discountValue || 0,
                    scope: d.scope || 'ALL_HEADS',
                    applicableFeeHeadIds: d.applicableFeeHeadIds || [],
                }));

                await FeeStructureDiscount.bulkCreate(discountItems, { transaction: t });
            }

            return await FeeStructure.findByPk(structure.id, {
                include: [
                    {
                        model: FeeStructureItem,
                        as: 'items',
                        include: [{ model: FeeHead, as: 'feeHead' }],
                    },
                    {
                        model: FeeStructureDiscount,
                        as: 'discounts',
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

            const { items, discounts, ...updates } = data;

            if (items && Array.isArray(items)) {
                await FeeStructureItem.destroy({
                    where: { feeStructureId: id },
                    force: true,
                    transaction: t,
                });

                const structureItems = items.map((it) => ({
                    feeStructureId: id,
                    feeHeadId: it.feeHeadId,
                    amount: it.amount || 0,
                    frequency: it.frequency || 'MONTHLY',
                    isEnabled: it.isEnabled ?? true,
                }));

                await FeeStructureItem.bulkCreate(structureItems, { transaction: t });
            }

            if (discounts && Array.isArray(discounts)) {
                await FeeStructureDiscount.destroy({
                    where: { feeStructureId: id },
                    force: true,
                    transaction: t,
                });

                const discountItems = discounts.map((d) => ({
                    feeStructureId: id,
                    quota: d.quota,
                    discountType: d.discountType || 'PERCENTAGE',
                    discountValue: d.discountValue || 0,
                    scope: d.scope || 'ALL_HEADS',
                    applicableFeeHeadIds: d.applicableFeeHeadIds || [],
                }));

                await FeeStructureDiscount.bulkCreate(discountItems, { transaction: t });
            }

            await structure.update(updates, { transaction: t });

            return await FeeStructure.findByPk(id, {
                include: [
                    {
                        model: FeeStructureItem,
                        as: 'items',
                        include: [{ model: FeeHead, as: 'feeHead' }],
                    },
                    {
                        model: FeeStructureDiscount,
                        as: 'discounts',
                    },
                ],
                transaction: t,
            });
        });
    }

    async updateFeeStructureStatus(id, status, userId) {
        if (!['ACTIVE', 'INACTIVE'].includes(status)) {
            throw new ApiError(400, 'Invalid status. Must be ACTIVE or INACTIVE.');
        }

        const structure = await FeeStructure.findByPk(id);
        if (!structure) throw new ApiError(404, 'Fee Structure not found');

        await structure.update({ status, updatedById: userId });
        logger.info(`[FeeStructure] Status updated for template "${structure.name}" (${id}) to ${status} by user ${userId}`);
        return structure;
    }

    async deleteFeeStructure(id, userId) {
        const structure = await FeeStructure.findByPk(id);
        if (!structure) throw new ApiError(404, 'Fee Structure not found');

        // Check if any invoices have been issued referencing this fee structure
        const invoiceCount = await StudentInvoice.count({
            where: { feeStructureId: id },
        });

        if (invoiceCount > 0) {
            throw new ApiError(
                400,
                `Cannot delete Fee Structure template because it is IN USE by ${invoiceCount} invoice(s). You can safely deactivate it instead.`
            );
        }

        logger.info(`[FeeStructure] Template "${structure.name}" (${id}) deleted by user ${userId}`);
        await structure.destroy();
        return { message: 'Fee structure deleted successfully' };
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
                include: [
                    {
                        model: ClassroomStudent,
                        as: 'classroomEnrollments',
                        include: [{ model: Classroom, as: 'classroom' }],
                    },
                ],
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

            const resolvedClassroomId = data.classroomId 
                || student.classroomId 
                || student.classroomEnrollments?.[0]?.classroomId 
                || null;

            const invoice = await StudentInvoice.create(
                {
                    invoiceNumber,
                    studentId: data.studentId,
                    classroomId: resolvedClassroomId,
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
                studentInvoiceId: invoice.id,
                feeHeadId: it.feeHeadId,
                headName: it.title || 'Fee Item',
                amount: it.amount,
            }));

            await StudentInvoiceItem.bulkCreate(invoiceItems, { transaction: t });

            // Generate scheduled installments with exact paise math
            const defaultInstallments = data.frequency === 'MONTHLY' ? 12 : data.frequency === 'QUARTERLY' ? 4 : (data.frequency === 'TERM' ? 3 : 1);
            const instCount = data.installmentsCount || defaultInstallments;
            const installmentRows = this._splitInstallments({
                totalAmount: netAmount,
                installmentsCount: instCount,
                startDate: data.dueDate,
                frequency: data.frequency || 'ONE_TIME',
                titlePrefix: `${data.title} - Inst.`,
            }).map((row) => ({
                ...row,
                studentInvoiceId: invoice.id,
            }));

            await StudentInvoiceInstallment.bulkCreate(installmentRows, { transaction: t });

            // ─── Advance Fee Carry-Forward Auto-Application for Single Invoice ───
            let studentAdvance = Number(student.feeAdvanceCredit || 0);
            if (studentAdvance > 0 && netAmount > 0) {
                const advanceToApply = Math.min(studentAdvance, netAmount);
                const newInvoiceBalance = Number((netAmount - advanceToApply).toFixed(2));
                const newInvoicePaid = advanceToApply;
                const newInvoiceStatus = newInvoiceBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

                await invoice.update(
                    {
                        paidAmount: newInvoicePaid,
                        balanceAmount: newInvoiceBalance,
                        status: newInvoiceStatus,
                    },
                    { transaction: t }
                );

                const createdInstRows = await StudentInvoiceInstallment.findAll({
                    where: { studentInvoiceId: invoice.id },
                    order: [['installmentNumber', 'ASC']],
                    transaction: t,
                });

                let remainingCreditToDistribute = advanceToApply;
                for (const inst of createdInstRows) {
                    if (remainingCreditToDistribute <= 0) break;
                    const instDue = Number(inst.balanceAmount || 0);
                    if (instDue <= 0) continue;

                    const applyToInst = Math.min(remainingCreditToDistribute, instDue);
                    const newInstBalance = Number((instDue - applyToInst).toFixed(2));
                    const newInstPaid = Number((Number(inst.paidAmount || 0) + applyToInst).toFixed(2));
                    const newInstStatus = newInstBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

                    await inst.update(
                        {
                            paidAmount: newInstPaid,
                            balanceAmount: newInstBalance,
                            status: newInstStatus,
                        },
                        { transaction: t }
                    );

                    remainingCreditToDistribute = Number((remainingCreditToDistribute - applyToInst).toFixed(2));
                }

                const updatedStudentAdvance = Number((studentAdvance - advanceToApply).toFixed(2));
                await student.update({ feeAdvanceCredit: updatedStudentAdvance }, { transaction: t });

                // Record official payment ledger voucher for advance credit consumption
                const advanceReceiptNo = await this._getNextReceiptNumber(t);
                await FeePayment.create(
                    {
                        receiptNumber: advanceReceiptNo,
                        studentInvoiceId: invoice.id,
                        studentId: student.id,
                        amountPaid: advanceToApply,
                        paymentMode: 'ADVANCE_CREDIT',
                        referenceNumber: `ADV-ADJUST-${invoice.invoiceNumber}`,
                        paymentDate: new Date().toISOString().split('T')[0],
                        collectedById: userId,
                        status: 'SUCCESS',
                        notes: `Automatic deduction of INR ${advanceToApply} from student advance credit balance`,
                    },
                    { transaction: t }
                );
            }

            return await StudentInvoice.findByPk(invoice.id, {
                include: [
                    { model: Student, as: 'student' },
                    { model: Classroom, as: 'classroom' },
                    { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                    { model: StudentInvoiceInstallment, as: 'installments' },
                ],
                transaction: t,
            });
        });
    }

    /**
     * Compute calculated items, gross, discount, and net for a student based on a Fee Structure and chosen frequency.
     * Automatically integrates transport route stop charges when student's transportationMode is SCHOOL_BUS.
     */
    _calculateStudentFee({ student, feeStructure, frequency = 'MONTHLY', transportFeeHead = null, transportRoute = null }) {
        // Filter structure items for the given frequency where amount > 0 and isEnabled
        const freqItems = (feeStructure.items || []).filter(
            (it) => it.frequency === frequency && it.isEnabled && Number(it.amount) > 0
        );

        let subtotal = freqItems.reduce((sum, it) => sum + Number(it.amount), 0);

        // Resolve matching quota discount rule (e.g. STAFF_CHILD, SCHOLARSHIP_HALF, etc.)
        const studentQuota = (student.feeQuota || 'REGULAR').toUpperCase();
        const discounts = feeStructure.discounts || [];
        const matchedDiscount = discounts.find(
            (d) => d.quota && d.quota.toUpperCase() === studentQuota
        );

        let totalDiscount = 0;
        const lineItems = freqItems.map((it) => {
            let itemDiscount = 0;
            if (matchedDiscount) {
                const isApplicable =
                    matchedDiscount.scope === 'ALL_HEADS' ||
                    (matchedDiscount.scope === 'SPECIFIC_HEADS' &&
                        (matchedDiscount.applicableFeeHeadIds || []).includes(it.feeHeadId));

                if (isApplicable) {
                    if (matchedDiscount.discountType === 'PERCENTAGE') {
                        itemDiscount = (Number(it.amount) * Number(matchedDiscount.discountValue)) / 100;
                    } else if (matchedDiscount.discountType === 'FIXED_AMOUNT') {
                        // Proportionate or direct discount (capped to item amount)
                        const totalApplicableBase = freqItems
                            .filter((item) =>
                                matchedDiscount.scope === 'ALL_HEADS'
                                    ? true
                                    : (matchedDiscount.applicableFeeHeadIds || []).includes(item.feeHeadId)
                            )
                            .reduce((s, item) => s + Number(item.amount), 0);

                        if (totalApplicableBase > 0) {
                            itemDiscount = (Number(it.amount) / totalApplicableBase) * Number(matchedDiscount.discountValue);
                        }
                    }
                }
            }

            itemDiscount = Math.min(Number(it.amount), Math.round(itemDiscount * 100) / 100);
            totalDiscount += itemDiscount;
            const netAmount = Math.max(0, Number(it.amount) - itemDiscount);

            return {
                feeHeadId: it.feeHeadId,
                headName: it.feeHead ? it.feeHead.name : 'Fee Item',
                amount: Number(it.amount),
                discountAmount: itemDiscount,
                netAmount,
            };
        });

        // ─── Transport Surcharge Engine ───────────────────────────────────────
        // If student uses SCHOOL_BUS, dynamically merge bus route surcharge
        const isBusUser = student.transportationMode === 'SCHOOL_BUS';
        let transportSurcharge = 0;
        let routeDetails = null;

        if (isBusUser) {
            let monthlyFare = 0;
            if (transportRoute && Number(transportRoute.monthlyFare) > 0) {
                monthlyFare = Number(transportRoute.monthlyFare);
                routeDetails = {
                    routeId: transportRoute.id,
                    routeName: transportRoute.routeName,
                    monthlyFare,
                };
            } else {
                // Default standard monthly bus fare if specific route not assigned
                monthlyFare = 1500.00;
                routeDetails = {
                    routeName: 'School Bus Transit Service',
                    monthlyFare,
                };
            }

            // Scale surcharge according to invoice frequency
            let multiplier = 1;
            if (frequency === 'QUARTERLY') multiplier = 3;
            else if (frequency === 'TERM') multiplier = 4;
            else if (frequency === 'ANNUAL' || frequency === 'ONE_TIME') multiplier = 12;

            transportSurcharge = Number((monthlyFare * multiplier).toFixed(2));
            subtotal += transportSurcharge;

            lineItems.push({
                feeHeadId: transportFeeHead?.id || null,
                headName: `Transport Fee (${routeDetails.routeName})`,
                amount: transportSurcharge,
                discountAmount: 0,
                netAmount: transportSurcharge,
                isTransportSurcharge: true,
            });
        }

        totalDiscount = Math.round(totalDiscount * 100) / 100;
        const netPayable = Math.max(0, subtotal - totalDiscount);

        return {
            subtotal,
            discountAmount: totalDiscount,
            netPayable,
            matchedQuota: matchedDiscount ? studentQuota : null,
            discountRule: matchedDiscount || null,
            lineItems,
            transportDetails: isBusUser ? { isBusUser: true, transportSurcharge, route: routeDetails } : null,
        };
    }

    async previewBulkClassInvoices(data) {
        const { classroomId, academicYearId, feeStructureId, frequency = 'MONTHLY', periodLabel } = data;

        const feeStructure = await FeeStructure.findByPk(feeStructureId, {
            include: [
                { model: FeeStructureItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                { model: FeeStructureDiscount, as: 'discounts' },
                { model: AcademicClass, as: 'academicClass' },
            ],
        });
        if (!feeStructure) throw new ApiError(404, 'Fee Structure not found');
        if (feeStructure.status === 'INACTIVE') {
            throw new ApiError(400, `Cannot generate invoices using inactive Fee Structure template "${feeStructure.name}". Please activate it first.`);
        }

        // Fetch Transport Fee Head if available
        const transportFeeHead = await FeeHead.findOne({
            where: {
                [Op.or]: [{ category: 'TRANSPORT' }, { code: 'TRANSPORT' }],
                isActive: true,
            },
        });

        // Check if classroom has enrolled students
        const classroom = await Classroom.findByPk(classroomId);
        if (!classroom) throw new ApiError(404, 'Classroom not found');

        // Fetch students enrolled in this classroom
        const classroomStudents = await ClassroomStudent.findAll({
            where: { classroomId },
            include: [
                {
                    model: Student,
                    as: 'student',
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName', 'email'] }],
                },
            ],
            order: [['rollNumber', 'ASC']],
        });

        // Also fetch any existing invoices for these students for the same academicYear, feeStructure, frequency/title/period
        const studentIds = classroomStudents.map((cs) => cs.studentId).filter(Boolean);
        const whereClause = {
            studentId: { [Op.in]: studentIds },
            academicYearId,
            classroomId,
            feeStructureId,
            status: { [Op.ne]: 'CANCELLED' },
        };
        if (periodLabel && periodLabel.trim()) {
            whereClause.title = { [Op.iLike]: `%(${periodLabel.trim()})%` };
        }

        const existingInvoices = await StudentInvoice.findAll({
            where: whereClause,
            attributes: ['id', 'studentId', 'invoiceNumber', 'title', 'totalAmount', 'createdAt'],
        });

        const invoiceByStudent = new Map();
        existingInvoices.forEach((inv) => {
            invoiceByStudent.set(inv.studentId, inv);
        });

        const previewRows = classroomStudents.map((cs) => {
            const student = cs.student;
            const isInactive = !student || (student.status && student.status.toUpperCase() !== 'ACTIVE');
            const existing = student ? invoiceByStudent.get(student.id) : null;

            if (!student) {
                return {
                    studentId: cs.studentId,
                    name: 'Unknown Student',
                    rollNumber: cs.rollNumber || '-',
                    admissionNumber: '-',
                    quota: 'REGULAR',
                    subtotal: 0,
                    discount: 0,
                    netPayable: 0,
                    eligible: false,
                    skipReason: 'Student record not found',
                };
            }

            const calculation = this._calculateStudentFee({
                student,
                feeStructure,
                frequency,
                transportFeeHead,
            });
            const fullName = student.account
                ? `${student.account.firstName || ''} ${student.account.lastName || ''}`.trim()
                : student.studentId;

            let eligible = true;
            let skipReason = null;

            if (isInactive) {
                eligible = false;
                skipReason = `Inactive / Status: ${student.status}`;
            } else if (existing) {
                eligible = false;
                skipReason = `Already invoiced (${existing.invoiceNumber})`;
            } else if (calculation.subtotal <= 0) {
                eligible = false;
                skipReason = 'Zero fee amount for chosen frequency';
            }

            return {
                studentId: student.id,
                name: fullName,
                admissionNumber: student.admissionNumber || student.studentId,
                rollNumber: cs.rollNumber || '-',
                quota: student.feeQuota || 'REGULAR',
                subtotal: calculation.subtotal,
                discount: calculation.discountAmount,
                netPayable: calculation.netPayable,
                eligible,
                skipReason,
                existingInvoice: existing ? { id: existing.id, number: existing.invoiceNumber } : null,
                lineItems: calculation.lineItems,
            };
        });

        const activeChargedHeads = (feeStructure.items || []).filter(
            (it) => it.frequency === frequency && it.isEnabled && Number(it.amount) > 0
        );

        return {
            structure: {
                id: feeStructure.id,
                name: feeStructure.name,
                frequency,
                periodLabel: periodLabel || frequency,
                activeFrequencies: feeStructure.activeFrequencies,
                chargedHeads: activeChargedHeads.map((it) => ({
                    feeHeadId: it.feeHeadId,
                    name: it.feeHead ? it.feeHead.name : 'Fee Head',
                    code: it.feeHead?.code,
                    amount: Number(it.amount),
                })),
                discounts: feeStructure.discounts,
            },
            students: previewRows,
            summary: {
                totalStudents: previewRows.length,
                eligibleCount: previewRows.filter((r) => r.eligible).length,
                skippedCount: previewRows.filter((r) => !r.eligible).length,
                totalGross: previewRows.filter((r) => r.eligible).reduce((s, r) => s + r.subtotal, 0),
                totalDiscount: previewRows.filter((r) => r.eligible).reduce((s, r) => s + r.discount, 0),
                totalNet: previewRows.filter((r) => r.eligible).reduce((s, r) => s + r.netPayable, 0),
            },
        };
    }

    async generateBulkClassInvoices(data, userId) {
        return await sequelize.transaction(async (t) => {
            const {
                classroomId,
                academicYearId,
                feeStructureId,
                frequency = 'MONTHLY',
                periodLabel,
                title,
                description,
                dueDate,
                notes,
                selectedStudentIds,
            } = data;

            // Load fee structure with items & discounts
            const feeStructure = await FeeStructure.findByPk(feeStructureId, {
                include: [
                    { model: FeeStructureItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                    { model: FeeStructureDiscount, as: 'discounts' },
                ],
                transaction: t,
            });
            if (!feeStructure) throw new ApiError(404, 'Fee Structure not found');
            if (feeStructure.status === 'INACTIVE') {
                throw new ApiError(400, `Cannot generate invoices using inactive Fee Structure template "${feeStructure.name}". Please activate it first.`);
            }

            // Fetch Transport Fee Head if available
            const transportFeeHead = await FeeHead.findOne({
                where: {
                    [Op.or]: [{ category: 'TRANSPORT' }, { code: 'TRANSPORT' }],
                    isActive: true,
                },
                transaction: t,
            });

            // Find enrolled students in this classroom
            const classroomStudents = await ClassroomStudent.findAll({
                where: { classroomId },
                include: [
                    {
                        model: Student,
                        as: 'student',
                    },
                ],
                transaction: t,
            });

            if (classroomStudents.length === 0) {
                throw new ApiError(400, 'No students enrolled in the selected classroom');
            }

            // Filter by selectedStudentIds if passed
            const selectedSet = selectedStudentIds && selectedStudentIds.length > 0 ? new Set(selectedStudentIds) : null;
            const targetStudents = classroomStudents
                .map((cs) => cs.student)
                .filter((s) => s && (!selectedSet || selectedSet.has(s.id)));

            // Fetch existing non-cancelled invoices to prevent duplicates for this exact period
            const commitWhereClause = {
                studentId: { [Op.in]: targetStudents.map((s) => s.id) },
                academicYearId,
                classroomId,
                feeStructureId,
                status: { [Op.ne]: 'CANCELLED' },
            };
            if (periodLabel && periodLabel.trim()) {
                commitWhereClause.title = { [Op.iLike]: `%(${periodLabel.trim()})%` };
            }

            const existingInvoices = await StudentInvoice.findAll({
                where: commitWhereClause,
                attributes: ['studentId', 'invoiceNumber'],
                transaction: t,
            });

            const alreadyInvoicedIds = new Set(existingInvoices.map((inv) => inv.studentId));

            const createdInvoices = [];
            const skippedStudents = [];

            for (const student of targetStudents) {
                if (!student || (student.status && student.status.toUpperCase() !== 'ACTIVE')) {
                    skippedStudents.push({ studentId: student?.id, reason: 'Student inactive / not active' });
                    continue;
                }

                if (alreadyInvoicedIds.has(student.id)) {
                    skippedStudents.push({ studentId: student.id, reason: 'Already invoiced for this structure period' });
                    continue;
                }

                const calculation = this._calculateStudentFee({
                student,
                feeStructure,
                frequency,
                transportFeeHead,
            });
                if (calculation.subtotal <= 0) {
                    skippedStudents.push({ studentId: student.id, reason: 'Zero fee amount for chosen frequency' });
                    continue;
                }

                const invoiceNumber = await this._getNextInvoiceNumber(t);
                const finalTitle = periodLabel ? `${title} (${periodLabel})` : title;

                const invoice = await StudentInvoice.create(
                    {
                        invoiceNumber,
                        studentId: student.id,
                        classroomId,
                        academicYearId,
                        feeStructureId,
                        title: finalTitle,
                        description: description || `Class invoice for ${feeStructure.name} (${frequency})`,
                        dueDate,
                        subtotal: calculation.subtotal,
                        discountAmount: calculation.discountAmount,
                        fineAmount: 0,
                        waivedFineAmount: 0,
                        totalAmount: calculation.netPayable,
                        paidAmount: 0,
                        balanceAmount: calculation.netPayable,
                        status: 'ISSUED',
                        remarks: notes || (calculation.matchedQuota ? `Quota concession applied: ${calculation.matchedQuota}` : null),
                        createdById: userId,
                    },
                    { transaction: t }
                );

                const invoiceItems = calculation.lineItems.map((it) => ({
                    studentInvoiceId: invoice.id,
                    feeHeadId: it.feeHeadId,
                    headName: it.headName,
                    amount: it.netAmount,
                }));

                await StudentInvoiceItem.bulkCreate(invoiceItems, { transaction: t });

                // Automatic Installment Split across N intervals with exact paise math
                const defaultInstallments = frequency === 'MONTHLY' ? 12 : frequency === 'QUARTERLY' ? 4 : (frequency === 'TERM' ? 3 : 1);
                const instCount = data.installmentsCount || defaultInstallments;
                const installmentRows = this._splitInstallments({
                    totalAmount: calculation.netPayable,
                    installmentsCount: instCount,
                    startDate: dueDate,
                    frequency,
                    titlePrefix: `${finalTitle} - Inst.`,
                    customDueDates: Array.isArray(data.customDueDates) ? data.customDueDates : null,
                }).map((row) => ({
                    ...row,
                    studentInvoiceId: invoice.id,
                }));

                await StudentInvoiceInstallment.bulkCreate(installmentRows, { transaction: t });

                // ─── Advance Fee Carry-Forward Auto-Application ────────────────
                // Automatically apply Student.feeAdvanceCredit against the invoice & its installments
                let studentAdvance = Number(student.feeAdvanceCredit || 0);
                if (studentAdvance > 0 && calculation.netPayable > 0) {
                    const advanceToApply = Math.min(studentAdvance, calculation.netPayable);
                    const newInvoiceBalance = Number((calculation.netPayable - advanceToApply).toFixed(2));
                    const newInvoicePaid = advanceToApply;
                    const newInvoiceStatus = newInvoiceBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

                    await invoice.update(
                        {
                            paidAmount: newInvoicePaid,
                            balanceAmount: newInvoiceBalance,
                            status: newInvoiceStatus,
                        },
                        { transaction: t }
                    );

                    // Distribute advance across installments in chronological order
                    const createdInstRows = await StudentInvoiceInstallment.findAll({
                        where: { studentInvoiceId: invoice.id },
                        order: [['installmentNumber', 'ASC']],
                        transaction: t,
                    });

                    let remainingCreditToDistribute = advanceToApply;
                    for (const inst of createdInstRows) {
                        if (remainingCreditToDistribute <= 0) break;
                        const instDue = Number(inst.balanceAmount || 0);
                        if (instDue <= 0) continue;

                        const applyToInst = Math.min(remainingCreditToDistribute, instDue);
                        const newInstBalance = Number((instDue - applyToInst).toFixed(2));
                        const newInstPaid = Number((Number(inst.paidAmount || 0) + applyToInst).toFixed(2));
                        const newInstStatus = newInstBalance === 0 ? 'PAID' : 'PARTIALLY_PAID';

                        await inst.update(
                            {
                                paidAmount: newInstPaid,
                                balanceAmount: newInstBalance,
                                status: newInstStatus,
                            },
                            { transaction: t }
                        );

                        remainingCreditToDistribute = Number((remainingCreditToDistribute - applyToInst).toFixed(2));
                    }

                    // Deduct applied credit from student's advance credit ledger
                    const updatedStudentAdvance = Number((studentAdvance - advanceToApply).toFixed(2));
                    await student.update({ feeAdvanceCredit: updatedStudentAdvance }, { transaction: t });

                    // Record official payment ledger voucher for advance credit consumption
                    const advanceReceiptNo = await this._getNextReceiptNumber(t);
                    await FeePayment.create(
                        {
                            receiptNumber: advanceReceiptNo,
                            studentInvoiceId: invoice.id,
                            studentId: student.id,
                            amountPaid: advanceToApply,
                            paymentMode: 'ADVANCE_CREDIT',
                            referenceNumber: `ADV-ADJUST-${invoice.invoiceNumber}`,
                            paymentDate: new Date().toISOString().split('T')[0],
                            collectedById: userId,
                            status: 'SUCCESS',
                            notes: `Automatic deduction of INR ${advanceToApply} from student advance credit balance`,
                        },
                        { transaction: t }
                    );

                    logger.info(
                        `[Fee Auto-Advance] Applied INR ${advanceToApply} advance credit to invoice ${invoiceNumber} for student ${student.id}. Remaining advance: INR ${updatedStudentAdvance}`
                    );
                }

                createdInvoices.push({ id: invoice.id, invoiceNumber, studentId: student.id, amount: calculation.netPayable });
            }

            return {
                message: `Successfully generated ${createdInvoices.length} student invoices (${skippedStudents.length} skipped)`,
                count: createdInvoices.length,
                skippedCount: skippedStudents.length,
                createdInvoices,
                skippedStudents,
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
        if (status && status !== 'ALL') where.status = status;

        if (search) {
            where[Op.or] = [
                { invoiceNumber: { [Op.iLike]: `%${search}%` } },
                { title: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const offset = (Number(page) - 1) * Number(limit);

        const [totalCount, rows] = await Promise.all([
            StudentInvoice.count({ where }),
            StudentInvoice.findAll({
                where,
                include: [
                    {
                        model: Student,
                        as: 'student',
                        attributes: ['id', 'admissionNumber', 'status', 'userId'],
                        include: [
                            {
                                model: User,
                                as: 'account',
                                attributes: ['id', 'firstName', 'lastName', 'email'],
                            },
                        ],
                    },
                    {
                        model: Classroom,
                        as: 'classroom',
                        attributes: ['id', 'name', 'section'],
                    },
                    {
                        model: AcademicYear,
                        as: 'academicYear',
                        attributes: ['id', 'name', 'isCurrent'],
                    },
                    {
                        model: StudentInvoiceItem,
                        as: 'items',
                        include: [{ model: FeeHead, as: 'feeHead', attributes: ['id', 'code', 'name', 'description'] }],
                    },
                    {
                        model: StudentInvoiceInstallment,
                        as: 'installments',
                    },
                    {
                        model: FeePayment,
                        as: 'payments',
                        attributes: ['id', 'receiptNumber', 'amountPaid', 'paymentMode', 'paymentDate'],
                    },
                ],
                order: [['createdAt', 'DESC']],
                limit: Number(limit),
                offset,
            }),
        ]);

        return {
            invoices: rows,
            pagination: {
                total: totalCount,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(totalCount / Number(limit)),
            },
        };
    }

    async getInvoiceById(id) {
        const invoice = await StudentInvoice.findByPk(id, {
            include: [
                {
                    model: Student,
                    as: 'student',
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName', 'email', 'phone'] }],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'section'],
                },
                {
                    model: AcademicYear,
                    as: 'academicYear',
                    attributes: ['id', 'name', 'isCurrent'],
                },
                {
                    model: FeeStructure,
                    as: 'feeStructure',
                    attributes: ['id', 'name', 'lateFinePerDay', 'dueDayOfMonth', 'minimumPaymentAmount', 'allowBelowMinimum'],
                },
                {
                    model: StudentInvoiceItem,
                    as: 'items',
                    include: [{ model: FeeHead, as: 'feeHead' }],
                },
                {
                    model: StudentInvoiceInstallment,
                    as: 'installments',
                    include: [{ model: User, as: 'fineWaivedBy', attributes: ['id', 'firstName', 'lastName'] }],
                },
                {
                    model: FeePayment,
                    as: 'payments',
                    include: [{ model: User, as: 'collectedBy', attributes: ['id', 'firstName', 'lastName'] }],
                },
            ],
            order: [[{ model: StudentInvoiceInstallment, as: 'installments' }, 'installmentNumber', 'ASC']],
        });

        if (!invoice) throw new ApiError(404, 'Invoice not found');

        // Dynamically enrich installments with strictly current/overdue installment late fees
        const lateFinePerDay = Number(invoice.feeStructure?.lateFinePerDay || 0);
        const enrichedInstallments = this._enrichInstallmentsWithLateFines(invoice.installments || [], lateFinePerDay, 0);

        return {
            ...invoice.toJSON(),
            installments: enrichedInstallments,
        };
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FEE COLLECTION & PAYMENTS (Supports Partial, FIFO & Minimum Rules)
    // ══════════════════════════════════════════════════════════════════════════

    async collectPayment(data, userId, userContext = null) {
        return await sequelize.transaction(async (t) => {
            const paymentAmount = Number(data.amount);
            if (paymentAmount <= 0) {
                throw new ApiError(400, 'Payment amount must be greater than zero');
            }

            const targetInvoice = await StudentInvoice.findByPk(data.invoiceId, {
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!targetInvoice) throw new ApiError(404, 'Invoice not found');
            const studentId = targetInvoice.studentId;

            // ─── WAIVE LATE FEE / DUE ADJUSTMENT GUARDS ───────────────────────
            const waiveLateFeeRequested = Boolean(data.waiveLateFee || (Number(data.waivedFineAmount || 0) > 0));
            const fineWaiverAmount = Number(data.waivedFineAmount || 0);
            const dueAdjustmentAmount = Number(data.adjustDueAmount || 0);

            if (waiveLateFeeRequested || fineWaiverAmount > 0) {
                if (!data.fineWaiveReason || data.fineWaiveReason.trim().length < 5) {
                    throw new ApiError(422, 'Mandatory reason (min 5 characters) is required when waiving/removing late fee.');
                }
            }

            if (dueAdjustmentAmount > 0) {
                if (!data.dueAdjustReason || data.dueAdjustReason.trim().length < 5) {
                    throw new ApiError(422, 'Mandatory reason (min 5 characters) is required when adjusting invoice dues.');
                }
                if (userId) {
                    const hasAdjust = await hasPermission(userId, 'fees', 'adjust');
                    const hasManage = await hasPermission(userId, 'fees', 'manage');
                    if (!hasAdjust && !hasManage) {
                        throw new ApiError(403, 'Insufficient privilege: Adjusting invoice due amount requires fees:adjust or fees:manage permission.');
                    }
                }
            }

            // Load Fee Structure policy if attached to check minimum payment requirements
            let minPayable = 0;
            let allowBelowMin = true;
            if (targetInvoice.feeStructureId) {
                const struct = await FeeStructure.findByPk(targetInvoice.feeStructureId, {
                    attributes: ['minimumPaymentAmount', 'allowBelowMinimum'],
                    transaction: t,
                });
                if (struct) {
                    minPayable = Number(struct.minimumPaymentAmount || 0);
                    allowBelowMin = struct.allowBelowMinimum !== false;
                }
            }

            // Check Minimum Payment Rules
            const isBelowMin = minPayable > 0 && paymentAmount < minPayable;
            if (isBelowMin) {
                if (!allowBelowMin) {
                    throw new ApiError(
                        400,
                        `Payment of ₹${paymentAmount} is below the required minimum installment of ₹${minPayable}. Below-minimum payments are disabled for this plan.`
                    );
                }
                if (!data.belowMinimumReasonCode) {
                    throw new ApiError(
                        422,
                        `Payment amount (₹${paymentAmount}) is below the required minimum of ₹${minPayable}. A valid concession reason code is mandatory.`
                    );
                }

                // Verify user authority for below-minimum concession override (requires fees:adjust or fees:manage)
                if (userId) {
                    const hasAdjust = await hasPermission(userId, 'fees', 'adjust');
                    const hasManage = await hasPermission(userId, 'fees', 'manage');
                    if (!hasAdjust && !hasManage) {
                        throw new ApiError(
                            403,
                            'Insufficient privilege: Granting below-minimum payment concession requires fees:adjust or fees:manage permission.'
                        );
                    }
                }
            }

            // Allocation Strategy: SELECTED_INVOICE or FIFO_AUTO across open dues
            const allocationStrategy = data.allocationStrategy || 'SELECTED_INVOICE';
            let invoicesToPay = [];

            if (allocationStrategy === 'FIFO_AUTO') {
                invoicesToPay = await StudentInvoice.findAll({
                    where: {
                        studentId,
                        status: { [Op.in]: ['ISSUED', 'PARTIALLY_PAID'] },
                    },
                    order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
            } else {
                invoicesToPay = [targetInvoice];
            }

            // Calculate total pending across selected invoices
            const totalOutstanding = invoicesToPay.reduce((sum, inv) => sum + Number(inv.balanceAmount), 0);
            let remainingFund = paymentAmount;
            let advanceCreditCreated = 0;

            if (paymentAmount > totalOutstanding) {
                advanceCreditCreated = paymentAmount - totalOutstanding;
            }

            // Allocate payment across invoices and child installments
            for (const inv of invoicesToPay) {
                if (remainingFund <= 0) break;
                let invBalance = Number(inv.balanceAmount);

                // Check if specific installment or waiver/adjustment applies to this invoice
                let invWaivedFine = 0;
                if (inv.id === targetInvoice.id) {
                    // 1. Process Due Adjustment if requested
                    if (dueAdjustmentAmount > 0) {
                        const adj = Math.min(dueAdjustmentAmount, invBalance);
                        invBalance = Math.max(0, invBalance - adj);
                        await inv.update({
                            totalAmount: Math.max(0, Number(inv.totalAmount || 0) - adj),
                            balanceAmount: invBalance,
                            remarks: inv.remarks ? `${inv.remarks} | Due Adjusted: -₹${adj} (${data.dueAdjustReason})` : `Due Adjusted: -₹${adj} (${data.dueAdjustReason})`,
                        }, { transaction: t });
                    }

                    // 2. Process Late Fine Waiver if requested
                    if (waiveLateFeeRequested || fineWaiverAmount > 0) {
                        const currentFine = Number(inv.fineAmount || 0);
                        invWaivedFine = fineWaiverAmount > 0 ? Math.min(fineWaiverAmount, currentFine) : currentFine;
                        if (invWaivedFine > 0) {
                            await inv.update({
                                fineAmount: Math.max(0, currentFine - invWaivedFine),
                                waivedFineAmount: Number(inv.waivedFineAmount || 0) + invWaivedFine,
                                remarks: inv.remarks ? `${inv.remarks} | Fine Waived: ₹${invWaivedFine} (${data.fineWaiveReason})` : `Fine Waived: ₹${invWaivedFine} (${data.fineWaiveReason})`,
                            }, { transaction: t });
                        }
                    }
                }

                // Allocate payment to child installments (if present)
                const targetInstallments = await StudentInvoiceInstallment.findAll({
                    where: {
                        studentInvoiceId: inv.id,
                        status: { [Op.in]: ['PENDING', 'PARTIALLY_PAID', 'OVERDUE'] },
                    },
                    order: [['dueDate', 'ASC'], ['installmentNumber', 'ASC']],
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });

                let invAllocatedPayment = 0;
                if (targetInstallments.length > 0) {
                    for (const inst of targetInstallments) {
                        if (remainingFund <= 0) break;

                        // If waiver requested on installment
                        if (inv.id === targetInvoice.id && (data.installmentId === inst.id || !data.installmentId) && invWaivedFine > 0) {
                            const instFine = Number(inst.lateFineAmount || 0);
                            const instWaive = Math.min(invWaivedFine, instFine);
                            if (instWaive > 0) {
                                await inst.update({
                                    lateFineAmount: Math.max(0, instFine - instWaive),
                                    waivedFineAmount: Number(inst.waivedFineAmount || 0) + instWaive,
                                    fineWaivedById: userId,
                                    fineWaivedAt: new Date(),
                                    fineWaiveReason: data.fineWaiveReason,
                                }, { transaction: t });
                            }
                        }

                        const instBal = Number(inst.balanceAmount);
                        const instAlloc = Math.min(remainingFund, instBal);
                        const newInstPaid = Number(inst.paidAmount) + instAlloc;
                        const newInstBal = Math.max(0, instBal - instAlloc);
                        const newInstStatus = newInstBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

                        await inst.update({
                            paidAmount: newInstPaid,
                            balanceAmount: newInstBal,
                            status: newInstStatus,
                        }, { transaction: t });

                        invAllocatedPayment += instAlloc;
                        remainingFund -= instAlloc;
                    }
                } else {
                    const alloc = Math.min(remainingFund, invBalance);
                    invAllocatedPayment += alloc;
                    remainingFund -= alloc;
                }

                const newPaid = Number(inv.paidAmount) + invAllocatedPayment;
                const newBal = Math.max(0, invBalance - invAllocatedPayment);
                const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

                await inv.update(
                    {
                        paidAmount: newPaid,
                        balanceAmount: newBal,
                        status: newStatus,
                    },
                    { transaction: t }
                );
            }

            // If any advance remains, update student credit
            if (advanceCreditCreated > 0) {
                const studentRec = await Student.findByPk(studentId, {
                    lock: t.LOCK.UPDATE,
                    transaction: t,
                });
                if (studentRec) {
                    const currentAdvance = Number(studentRec.feeAdvanceCredit || 0);
                    await studentRec.update(
                        { feeAdvanceCredit: currentAdvance + advanceCreditCreated },
                        { transaction: t }
                    );
                }
            }

            const receiptNumber = await this._getNextReceiptNumber(t);

            // Consolidate mode-specific details into JSON structure
            const modeDetails = {
                ...(data.paymentDetails || {}),
                paymentMode: data.paymentMode,
                upiId: data.upiId || null,
                payerName: data.payerName || null,
                transactionReference: data.transactionReference || data.referenceNumber || null,
                chequeNumber: data.chequeNumber || null,
                chequeDate: data.chequeDate || null,
                chequeBank: data.bankName || null,
                chequeStatus: data.chequeStatus || (data.paymentMode === 'CHEQUE' ? 'RECEIVED' : null),
                bankName: data.bankName || null,
                transferDate: data.transferDate || (['BANK_TRANSFER', 'DEMAND_DRAFT'].includes(data.paymentMode) ? data.paymentDate : null),
                cardRef: data.cardRef || null,
                cardLast4: data.cardLast4 || null,
                authCode: data.authCode || null,
                notes: data.notes || null,
                allocationStrategy,
                advanceCreditCreated,
                isBelowMinimum: isBelowMin,
                belowMinimumReasonCode: data.belowMinimumReasonCode || null,
                belowMinimumReasonText: data.belowMinimumReasonText || null,
            };

            const payment = await FeePayment.create(
                {
                    receiptNumber,
                    studentInvoiceId: targetInvoice.id,
                    studentId,
                    amountPaid: paymentAmount,
                    paymentMode: data.paymentMode,
                    paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                    referenceNumber: data.transactionReference || data.referenceNumber || data.chequeNumber || null,
                    notes: data.notes || (data.bankName ? `Bank: ${data.bankName}` : null),
                    paymentDetails: modeDetails,
                    isBelowMinimum: isBelowMin,
                    belowMinimumReasonCode: data.belowMinimumReasonCode || null,
                    belowMinimumReasonText: data.belowMinimumReasonText || null,
                    advanceCreditAmount: advanceCreditCreated,
                    collectedById: userId,
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
                                include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName', 'email'] }],
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
                            include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName', 'email', 'phone'] }],
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

    async getStudentFeeLedger(studentId, { academicYearId } = {}) {
        if (!studentId) throw new ApiError(400, 'Student ID is required');

        const student = await Student.findByPk(studentId, {
            include: [
                { model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
                {
                    model: ClassroomStudent,
                    as: 'classroomEnrollments',
                    include: [{ model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'classId'] }],
                },
            ],
        });
        if (!student) throw new ApiError(404, 'Student not found');

        const invoiceWhere = {
            studentId,
            status: { [Op.notIn]: ['CANCELLED', 'VOID', 'DRAFT'] },
        };
        if (academicYearId && academicYearId !== 'ALL') {
            invoiceWhere.academicYearId = academicYearId;
        }

        const invoices = await StudentInvoice.findAll({
            where: invoiceWhere,
            include: [
                { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                { model: StudentInvoiceInstallment, as: 'installments' },
                { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'startDate', 'endDate', 'isCurrent'] },
                { model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] },
                { model: FeeStructure, as: 'feeStructure', attributes: ['id', 'name', 'lateFinePerDay', 'dueDayOfMonth', 'minimumPaymentAmount', 'allowBelowMinimum'] },
            ],
            order: [['dueDate', 'ASC'], ['createdAt', 'DESC']],
        });

        // Collect payment IDs associated with this student
        const invoiceIds = invoices.map((inv) => inv.id);
        const paymentWhere = { studentId };
        if (academicYearId && academicYearId !== 'ALL') {
            paymentWhere.studentInvoiceId = { [Op.in]: invoiceIds };
        }

        const payments = await FeePayment.findAll({
            where: paymentWhere,
            include: [
                { model: User, as: 'collectedBy', attributes: ['id', 'firstName', 'lastName'] },
                { model: StudentInvoice, as: 'invoice', attributes: ['id', 'invoiceNumber', 'title', 'dueDate', 'academicYearId'] },
                { model: FeePaymentReversal, as: 'reversal', attributes: ['id', 'reversalReceiptNumber', 'reversedAmount', 'reason', 'bouncePenaltyAmount', 'createdAt'] },
            ],
            order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']],
        });

        // Compute dynamic late fee fines & days overdue on invoices
        const todayStr = new Date().toISOString().split('T')[0];
        const enrichedInvoices = invoices.map((inv) => {
            const dueDate = new Date(inv.dueDate);
            const todayDate = new Date(todayStr);
            const balance = Number(inv.balanceAmount || 0);
            const isOverdue = balance > 0 && todayDate > dueDate;
            const overdueDays = isOverdue ? Math.max(0, Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24))) : 0;

            // Daily fine policy if configured on the fee structure and not already explicitly recorded
            let recordedFine = Number(inv.fineAmount || 0);
            const lateFinePerDay = Number(inv.feeStructure?.lateFinePerDay || 0);
            if (isOverdue && lateFinePerDay > 0 && recordedFine === 0) {
                recordedFine = Number((overdueDays * lateFinePerDay).toFixed(2));
            }

            const waivedFine = Number(inv.waivedFineAmount || 0);
            const netFine = Math.max(0, recordedFine - waivedFine);

            // Enrich installments with current-installment-only late fine rules
            const enrichedInstallments = this._enrichInstallmentsWithLateFines(inv.installments || [], lateFinePerDay, 0);

            return {
                ...inv.toJSON(),
                isOverdue,
                overdueDays,
                fineAmount: recordedFine,
                netFineAmount: netFine,
                waivedFineAmount: waivedFine,
                installments: enrichedInstallments,
            };
        });

        // Safe decimal arithmetic
        const totalBilled = enrichedInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        const totalDiscount = enrichedInvoices.reduce((sum, inv) => sum + Number(inv.discountAmount || 0), 0);
        const totalLateFine = enrichedInvoices.reduce((sum, inv) => sum + Number(inv.fineAmount || 0), 0);

        // Filter valid cleared payments (exclude bounced/reversed)
        const validPayments = payments.filter((p) => !p.reversal);
        const totalPaid = validPayments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        const totalReversed = payments.filter((p) => Boolean(p.reversal)).reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);

        const outstandingBalance = Math.max(0, totalBilled - totalPaid);
        const advanceCredit = Number(student.feeAdvanceCredit || 0);

        // Safe ratio calculation guarding against division by zero
        const paymentRatio = totalBilled > 0
            ? Number(Math.min(100, Math.max(0, (totalPaid / totalBilled) * 100)).toFixed(1))
            : (totalPaid > 0 ? 100 : 0);

        // Query available academic sessions for historical switching
        const allSessions = await AcademicYear.findAll({
            attributes: ['id', 'name', 'startDate', 'endDate', 'isCurrent', 'status'],
            order: [['startDate', 'DESC']],
        });

        // Fetch active reminders for student
        const activeReminders = await FeeReminderLog.findAll({
            where: {
                studentId,
                status: 'SENT',
            },
            order: [['createdAt', 'DESC']],
            limit: 5,
        });

        // Resolve assigned class fee structure for projection / transparency
        let assignedStructure = null;
        let availableCycles = [];

        const activeEnrollment = student.classroomEnrollments?.find((e) => !e.leftAt) || student.classroomEnrollments?.[0];
        const studentClassId = activeEnrollment?.classroom?.classId;
        if (studentClassId) {
            const structure = await FeeStructure.findOne({
                where: { academicClassId: studentClassId, status: 'ACTIVE' },
                include: [
                    { model: FeeStructureItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                    { model: FeeStructureDiscount, as: 'discounts' },
                    { model: AcademicYear, as: 'academicYear' },
                ],
            });
            if (structure) {
                const monthlyCalc = this._calculateStudentFee({ student, feeStructure: structure, frequency: 'MONTHLY' });
                const quarterlyCalc = this._calculateStudentFee({ student, feeStructure: structure, frequency: 'QUARTERLY' });
                const annualCalc = this._calculateStudentFee({ student, feeStructure: structure, frequency: 'ANNUAL' });
                assignedStructure = {
                    id: structure.id,
                    name: structure.name,
                    className: activeEnrollment?.classroom?.name,
                    minimumPaymentAmount: Number(structure.minimumPaymentAmount || 0),
                    allowBelowMinimum: structure.allowBelowMinimum !== false,
                    monthlyDues: monthlyCalc.netPayable,
                    quarterlyDues: quarterlyCalc.netPayable,
                    annualDues: annualCalc.netPayable,
                    headsCount: (structure.items || []).filter(i => Number(i.amount) > 0 && i.isEnabled).length,
                };

                if (structure.academicYear?.startDate && structure.academicYear?.endDate) {
                    const startYear = new Date(structure.academicYear.startDate).getFullYear();
                    const endYear = new Date(structure.academicYear.endDate).getFullYear();
                    availableCycles = [
                        { frequency: 'MONTHLY', label: '12 Monthly Installments', cycleCount: 12 },
                        { frequency: 'QUARTERLY', label: '4 Quarterly Terms (Q1-Q4)', cycleCount: 4 },
                        { frequency: 'ANNUAL', label: `Annual Session (${startYear}-${endYear})`, cycleCount: 1 },
                    ];
                }
            }
        }

        return {
            student: {
                ...student.toJSON(),
                feeAdvanceCredit: advanceCredit,
            },
            assignedStructure,
            billingCycles: availableCycles,
            academicSessions: allSessions,
            activeReminders,
            selectedAcademicYearId: academicYearId || null,
            summary: {
                totalBilled,
                totalPaid,
                totalDiscount,
                totalLateFine,
                totalReversed,
                outstandingBalance,
                advanceCredit,
                paymentRatio,
                invoicesCount: enrichedInvoices.length,
                paymentsCount: validPayments.length,
            },
            invoices: enrichedInvoices,
            payments,
        };
    }

    async getFeeSummaryStats({ academicYearId } = {}) {
        const todayStr = new Date().toISOString().split('T')[0];
        const replacements = { todayStr };

        let yearFilterInvoices = '';
        let yearFilterPayments = '';
        if (academicYearId) {
            yearFilterInvoices = ' AND academic_year_id = :academicYearId';
            replacements.academicYearId = academicYearId;
        }

        // Total Billed, Total Collected, Total Balance
        const [totals] = await sequelize.query(
            `
            SELECT 
                COALESCE(SUM(total_amount), 0) AS "totalBilled",
                COALESCE(SUM(paid_amount), 0) AS "totalCollected",
                COALESCE(SUM(balance_amount), 0) AS "totalPending"
            FROM student_invoices
            WHERE status != 'CANCELLED' AND deleted_at IS NULL ${yearFilterInvoices}
        `,
            { replacements }
        );

        // Today's Collection
        const [todayCollections] = await sequelize.query(
            `
            SELECT 
                COALESCE(SUM(amount_paid), 0) AS "todayTotal",
                COALESCE(SUM(CASE WHEN payment_mode = 'CASH' THEN amount_paid ELSE 0 END), 0) AS "todayCash",
                COALESCE(SUM(CASE WHEN payment_mode = 'UPI' THEN amount_paid ELSE 0 END), 0) AS "todayUpi",
                COALESCE(SUM(CASE WHEN payment_mode = 'BANK_TRANSFER' THEN amount_paid ELSE 0 END), 0) AS "todayBankTransfer"
            FROM fee_payments
            WHERE payment_date = :todayStr AND deleted_at IS NULL
        `,
            { replacements: { todayStr } }
        );

        // Status counts
        const [statusCounts] = await sequelize.query(
            `
            SELECT status, COUNT(*) AS count
            FROM student_invoices
            WHERE deleted_at IS NULL ${yearFilterInvoices}
            GROUP BY status
        `,
            { replacements }
        );

        return {
            totals: {
                totalBilled: Number(totals[0]?.totalBilled || 0),
                totalCollected: Number(totals[0]?.totalCollected || 0),
                totalPending: Number(totals[0]?.totalPending || 0),
            },
            today: {
                todayTotal: Number(todayCollections[0]?.todayTotal || 0),
                todayCash: Number(todayCollections[0]?.todayCash || 0),
                todayUpi: Number(todayCollections[0]?.todayUpi || 0),
                todayBankTransfer: Number(todayCollections[0]?.todayBankTransfer || 0),
            },
            statusBreakdown: statusCounts,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FEE REMINDER WORKFLOW ENGINE
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Resolves installment-wise dues with arrears carry-forward for students
     * and evaluates eligibility for reminders with strict skip reasoning.
     */
    async getEligibleReminderStudents({ classroomId, periodKey, asOfDate, academicYearId, installmentNumber } = {}) {
        const targetDate = asOfDate || new Date().toISOString().split('T')[0];
        const instNumFilter = installmentNumber ? parseInt(installmentNumber, 10) : null;

        // 1. Fetch Students with active classroom enrollment
        const studentWhere = {};
        const enrollmentWhere = {};
        if (classroomId) {
            enrollmentWhere.classroomId = classroomId;
        }

        const students = await Student.findAll({
            where: studentWhere,
            include: [
                {
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName', 'email', 'phone'],
                },
                {
                    model: ClassroomStudent,
                    as: 'classroomEnrollments',
                    where: enrollmentWhere,
                    required: !!classroomId,
                    include: [
                        {
                            model: Classroom,
                            as: 'classroom',
                            include: [{ model: AcademicClass, as: 'academicClass' }],
                        },
                    ],
                },
            ],
            order: [['createdAt', 'ASC']],
        });

        // 2. Fetch all non-cancelled invoices for these students
        const studentIds = students.map((s) => s.id);
        if (studentIds.length === 0) {
            return [];
        }

        const invoiceWhere = {
            studentId: { [Op.in]: studentIds },
            status: { [Op.ne]: 'CANCELLED' },
        };
        if (academicYearId) {
            invoiceWhere.academicYearId = academicYearId;
        }

        const allInvoices = await StudentInvoice.findAll({
            where: invoiceWhere,
            include: [
                {
                    model: StudentInvoiceInstallment,
                    as: 'installments',
                },
            ],
            order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
        });

        // Map invoices by studentId
        const invoicesByStudent = new Map();
        for (const inv of allInvoices) {
            if (!invoicesByStudent.has(inv.studentId)) {
                invoicesByStudent.set(inv.studentId, []);
            }
            invoicesByStudent.get(inv.studentId).push(inv);
        }

        // 3. Check reminders dispatched today to prevent spam
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const reminderWhere = {
            studentId: { [Op.in]: studentIds },
            createdAt: { [Op.gte]: todayStart },
            status: { [Op.in]: ['SENT', 'QUEUED'] },
        };
        if (periodKey) reminderWhere.periodKey = periodKey;
        if (instNumFilter) reminderWhere.installmentNumber = instNumFilter;

        const todayReminders = await FeeReminderLog.findAll({
            where: reminderWhere,
        });
        const remindedTodayStudentIds = new Set(todayReminders.map((r) => r.studentId));

        // 4. Calculate installment dues & arrears for each student
        const result = [];

        for (const student of students) {
            const studentInvoices = invoicesByStudent.get(student.id) || [];
            const enrollment = student.classroomEnrollments?.[0];
            const classroom = enrollment?.classroom;
            const parentEmail = student.guardianEmail || student.account?.email;
            const studentFullName = student.account
                ? `${student.account.firstName} ${student.account.lastName || ''}`.trim()
                : `Student (${student.admissionNumber || student.id.slice(0, 8)})`;

            // Arrears vs Target Period Due / Target Installment Due
            let targetInvoice = null;
            let targetInstallment = null;
            let installmentDue = 0;
            let arrears = 0;
            let totalOutstanding = 0;

            for (const inv of studentInvoices) {
                const balance = Number(inv.balanceAmount || 0);
                totalOutstanding += balance;

                const invInstallments = inv.installments || [];

                if (instNumFilter) {
                    const matchingInst = invInstallments.find((inst) => inst.installmentNumber === instNumFilter);
                    if (matchingInst) {
                        targetInvoice = inv;
                        targetInstallment = matchingInst;
                        const instBal = Number(matchingInst.balanceAmount || 0);
                        const instFine = Math.max(0, Number(matchingInst.lateFineAmount || 0) - Number(matchingInst.waivedFineAmount || 0));
                        installmentDue += (instBal + instFine);
                    } else if (balance > 0) {
                        arrears += balance;
                    }
                } else if (periodKey && inv.periodKey === periodKey) {
                    targetInvoice = inv;
                    installmentDue += balance;
                } else if (!periodKey && inv.dueDate && inv.dueDate <= targetDate && !targetInvoice) {
                    targetInvoice = inv;
                    installmentDue += balance;
                } else {
                    if (balance > 0) {
                        arrears += balance;
                    }
                }
            }

            const advanceCredit = Number(student.feeAdvanceCredit || 0);
            const netPayable = Math.max(0, installmentDue + arrears - advanceCredit);

            // Determine eligibility and skip reason
            let isEligible = true;
            let skipReason = null;

            if (student.status !== 'ACTIVE') {
                isEligible = false;
                skipReason = 'INACTIVE';
            } else if (instNumFilter && targetInstallment && Number(targetInstallment.balanceAmount || 0) <= 0) {
                isEligible = false;
                skipReason = 'CURRENT_PAID';
            } else if (totalOutstanding <= 0) {
                isEligible = false;
                skipReason = 'FULLY_PAID';
            } else if (periodKey && targetInvoice && Number(targetInvoice.balanceAmount || 0) <= 0) {
                isEligible = false;
                skipReason = 'CURRENT_PAID';
            } else if (netPayable <= 0) {
                isEligible = false;
                skipReason = 'NO_DUE';
            } else if (!parentEmail) {
                isEligible = false;
                skipReason = 'NO_EMAIL';
            } else if (remindedTodayStudentIds.has(student.id)) {
                isEligible = false;
                skipReason = 'ALREADY_REMINDED_TODAY';
            }

            result.push({
                studentId: student.id,
                admissionNumber: student.admissionNumber,
                studentName: studentFullName,
                parentName: student.guardianName || 'Parent / Guardian',
                parentEmail: parentEmail || null,
                parentPhone: student.guardianPhone || student.account?.phone || null,
                classroomId: classroom?.id || null,
                classroomName: classroom?.name || 'Unassigned',
                academicClassName: classroom?.academicClass?.name || '',
                feeQuota: student.feeQuota || 'REGULAR',
                periodKey: periodKey || (targetInstallment ? `Inst #${targetInstallment.installmentNumber}` : (targetInvoice?.periodKey || 'OVERDUE')),
                installmentNumber: targetInstallment?.installmentNumber || instNumFilter || null,
                installmentId: targetInstallment?.id || null,
                targetInvoiceId: targetInvoice?.id || null,
                targetInvoiceNumber: targetInvoice?.invoiceNumber || null,
                dueDate: targetInstallment?.dueDate || targetInvoice?.dueDate || targetDate,
                installmentDue,
                arrears,
                advanceCredit,
                totalPayable: netPayable,
                totalOutstanding,
                isEligible,
                skipReason,
                lastRemindedToday: remindedTodayStudentIds.has(student.id),
            });
        }

        return result;
    }

    /**
     * Dispatches bulk fee reminders via BullMQ queue (with dev fallback)
     * and logs audit history into fee_reminder_logs.
     */
    async sendBulkFeeReminders({ studentIds, periodKey, dueDate, customNote, administrativeNote }, userId = null) {
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            throw new ApiError(400, 'Please select at least one student to send fee reminders.');
        }

        const effectiveNote = administrativeNote || customNote || null;

        // Fetch eligible records for target students
        const eligibleList = await this.getEligibleReminderStudents({ periodKey, asOfDate: dueDate });
        const targetMap = new Map(eligibleList.map((item) => [item.studentId, item]));

        const results = {
            totalSelected: studentIds.length,
            sentCount: 0,
            skippedCount: 0,
            failedCount: 0,
            details: [],
        };

        const config = await SchoolConfig.findOne();
        const schoolName = config?.schoolName || 'Project Buddy School ERP';

        for (const studentId of studentIds) {
            const studentInfo = targetMap.get(studentId);

            if (!studentInfo) {
                results.skippedCount++;
                results.details.push({
                    studentId,
                    status: 'SKIPPED',
                    skipReason: 'NO_DUE',
                    message: 'No billing or enrollment records found for student.',
                });
                continue;
            }

            // Verify skip criteria
            if (!studentInfo.isEligible && studentInfo.skipReason !== 'ALREADY_REMINDED_TODAY') {
                // If user is attempting to send to an already cleared / inactive student
                await FeeReminderLog.create({
                    studentId,
                    classroomId: studentInfo.classroomId,
                    periodKey: periodKey || studentInfo.periodKey,
                    dueDate: dueDate || studentInfo.dueDate,
                    installmentDue: studentInfo.installmentDue,
                    arrears: studentInfo.arrears,
                    advanceCredit: studentInfo.advanceCredit,
                    payableAmount: studentInfo.totalPayable,
                    channel: 'EMAIL',
                    recipientEmail: studentInfo.parentEmail,
                    status: 'SKIPPED',
                    skipReason: studentInfo.skipReason,
                    sentById: userId,
                    sentAt: null,
                    metadata: { note: customNote, autoSkipped: true },
                });

                results.skippedCount++;
                results.details.push({
                    studentId,
                    studentName: studentInfo.studentName,
                    status: 'SKIPPED',
                    skipReason: studentInfo.skipReason,
                });
                continue;
            }

            if (!studentInfo.parentEmail) {
                results.skippedCount++;
                results.details.push({
                    studentId,
                    studentName: studentInfo.studentName,
                    status: 'SKIPPED',
                    skipReason: 'NO_EMAIL',
                });
                continue;
            }

            // Create Queued Reminder Log
            const reminderLog = await FeeReminderLog.create({
                studentId,
                classroomId: studentInfo.classroomId,
                periodKey: periodKey || studentInfo.periodKey,
                installmentNumber: studentInfo.installmentNumber || null,
                installmentId: studentInfo.installmentId || null,
                dueDate: dueDate || studentInfo.dueDate,
                installmentDue: studentInfo.installmentDue,
                arrears: studentInfo.arrears,
                advanceCredit: studentInfo.advanceCredit,
                payableAmount: studentInfo.totalPayable,
                channel: 'EMAIL',
                recipientEmail: studentInfo.parentEmail,
                status: 'QUEUED',
                sentById: userId,
                sentAt: null,
                metadata: {
                    note: effectiveNote,
                    administrativeNote: effectiveNote,
                    installmentNumber: studentInfo.installmentNumber || null,
                    installmentId: studentInfo.installmentId || null,
                },
            });

            // Enqueue Job into BullMQ Email Queue
            try {
                const payload = {
                    recipientEmail: studentInfo.parentEmail,
                    studentName: studentInfo.studentName,
                    admissionNumber: studentInfo.admissionNumber,
                    classroomName: studentInfo.classroomName,
                    periodKey: periodKey || studentInfo.periodKey,
                    installmentNumber: studentInfo.installmentNumber || null,
                    dueDate: dueDate || studentInfo.dueDate,
                    installmentDue: studentInfo.installmentDue,
                    arrears: studentInfo.arrears,
                    advanceCredit: studentInfo.advanceCredit,
                    payableAmount: studentInfo.totalPayable,
                    administrativeNote: effectiveNote,
                    schoolNameOverride: schoolName,
                };

                await enqueueEmailJob('FEE_REMINDER', payload, async (p) => {
                    await sendFeeReminderDirect(p);
                    await reminderLog.update({
                        status: 'SENT',
                        sentAt: new Date(),
                    });
                });

                await reminderLog.update({
                    status: 'SENT',
                    sentAt: new Date(),
                });

                results.sentCount++;
                results.details.push({
                    studentId,
                    studentName: studentInfo.studentName,
                    status: 'SENT',
                    payableAmount: studentInfo.totalPayable,
                });
            } catch (dispatchErr) {
                logger.error(`[Fee Reminder Dispatcher] Failed for student ${studentId}: ${dispatchErr.message}`);
                await reminderLog.update({
                    status: 'FAILED',
                    errorMessage: dispatchErr.message,
                });
                results.failedCount++;
                results.details.push({
                    studentId,
                    studentName: studentInfo.studentName,
                    status: 'FAILED',
                    errorMessage: dispatchErr.message,
                });
            }
        }

        return results;
    }

    /**
     * Retrieve Paginated / Filtered Fee Reminder Audit Logs
     */
    async getFeeReminderLogs({ studentId, periodKey, status, limit = 50, offset = 0 } = {}) {
        const where = {};
        if (studentId) where.studentId = studentId;
        if (periodKey) where.periodKey = periodKey;
        if (status && status !== 'ALL') where.status = status;

        const { count, rows } = await FeeReminderLog.findAndCountAll({
            where,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber', 'guardianPhone', 'guardianEmail'],
                    include: [
                        {
                            model: User,
                            as: 'account',
                            attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
                        },
                    ],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name'],
                },
                {
                    model: User,
                    as: 'sentBy',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        return {
            total: count,
            items: rows,
            limit: Number(limit),
            offset: Number(offset),
        };
    }

    /**
     * Get School Fee Reminder Automation Policy / Settings
     */
    async getFeeReminderSettings() {
        const config = await SchoolConfig.findOne();
        return (
            config?.feeReminderSettings || {
                enabled: false,
                daysBeforeDue: [7, 3, 1],
                remindBeforeExam: false,
                maxRemindersPerDay: 1,
            }
        );
    }

    /**
     * Update School Fee Reminder Automation Policy / Settings
     */
    async updateFeeReminderSettings(settings) {
        let config = await SchoolConfig.findOne();
        if (!config) {
            config = await SchoolConfig.create({ feeReminderSettings: settings });
        } else {
            await config.update({ feeReminderSettings: settings });
        }
        return config.feeReminderSettings;
    }

    /**
     * Scheduled / Automated Fee Reminder Runner
     * Intended to be triggered daily via scheduler/cron or manual run
     */
    async runScheduledFeeReminders() {
        const settings = await this.getFeeReminderSettings();
        if (!settings || !settings.enabled) {
            logger.info('[Scheduled Fee Reminder] Automated fee reminders are disabled in settings.');
            return { executed: false, reason: 'DISABLED' };
        }

        const daysBeforeDue = Array.isArray(settings.daysBeforeDue) ? settings.daysBeforeDue : [7, 3, 1];
        const today = new Date();
        const targetDates = daysBeforeDue.map((days) => {
            const d = new Date(today);
            d.setDate(d.getDate() + days);
            return d.toISOString().split('T')[0];
        });

        // Also check if today is due date
        targetDates.push(today.toISOString().split('T')[0]);

        logger.info(`[Scheduled Fee Reminder] Checking due dates matching: ${targetDates.join(', ')}`);

        // Find matching unpaid invoices on these target due dates
        const matchingInvoices = await StudentInvoice.findAll({
            where: {
                dueDate: { [Op.in]: targetDates },
                status: { [Op.in]: ['ISSUED', 'PARTIAL', 'OVERDUE'] },
                balanceAmount: { [Op.gt]: 0 },
            },
            attributes: ['studentId', 'periodKey', 'dueDate'],
        });

        const targetStudentIds = [...new Set(matchingInvoices.map((inv) => inv.studentId))];
        if (targetStudentIds.length === 0) {
            logger.info('[Scheduled Fee Reminder] No students have dues matching configured schedule windows today.');
            return { executed: true, targetCount: 0, sentCount: 0, skippedCount: 0 };
        }

        logger.info(`[Scheduled Fee Reminder] Running automated dispatch for ${targetStudentIds.length} candidate students.`);
        const defaultNote = settings.defaultAdministrativeNote || 'Scheduled automated reminder as per school fee calendar policy.';
        const dispatchResult = await this.sendBulkFeeReminders(
            {
                studentIds: targetStudentIds,
                customNote: defaultNote,
                administrativeNote: defaultNote,
            },
            null // system automated
        );

        return { executed: true, ...dispatchResult };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // DEFAULTERS MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Lists students with overdue outstanding balances, categorized by aging bracket.
     */
    async getDefaulters({ classroomId, agingBracket, minAmount, maxAmount, search, limit = 50, offset = 0 } = {}) {
        const today = new Date().toISOString().split('T')[0];

        // 1. Fetch overdue invoices
        const invoiceWhere = {
            dueDate: { [Op.lt]: today },
            balanceAmount: { [Op.gt]: 0 },
            status: { [Op.ne]: 'CANCELLED' },
        };
        if (classroomId && classroomId !== 'ALL') {
            invoiceWhere.classroomId = classroomId;
        }

        const overdueInvoices = await StudentInvoice.findAll({
            where: invoiceWhere,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber', 'guardianPhone', 'guardianEmail', 'feeQuota', 'feeAdvanceCredit'],
                    include: [
                        { model: User, as: 'account', attributes: ['firstName', 'lastName', 'email', 'phone'] },
                    ],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name', 'section'],
                },
            ],
            order: [['dueDate', 'ASC']],
        });

        // 2. Aggregate per student
        const studentMap = new Map();
        for (const inv of overdueInvoices) {
            if (!inv.student) continue;

            const studentId = inv.studentId;
            const dueDate = new Date(inv.dueDate);
            const todayDate = new Date(today);
            const daysOverdue = Math.max(0, Math.floor((todayDate - dueDate) / (1000 * 60 * 60 * 24)));

            if (!studentMap.has(studentId)) {
                const s = inv.student;
                const studentName = s.account
                    ? `${s.account.firstName} ${s.account.lastName || ''}`.trim()
                    : `Student (${s.admissionNumber || s.id.slice(0, 8)})`;

                studentMap.set(studentId, {
                    studentId,
                    admissionNumber: s.admissionNumber,
                    studentName,
                    guardianPhone: s.guardianPhone || s.account?.phone || null,
                    guardianEmail: s.guardianEmail || s.account?.email || null,
                    classroomId: inv.classroomId,
                    classroomName: inv.classroom ? `${inv.classroom.name} (${inv.classroom.section})` : 'Unassigned',
                    feeQuota: s.feeQuota || 'REGULAR',
                    overdueInvoicesCount: 0,
                    oldestDueDate: inv.dueDate,
                    maxDaysOverdue: daysOverdue,
                    arrearsAmount: 0,
                    currentDueAmount: 0,
                    totalOutstanding: 0,
                    advanceCredit: Number(s.feeAdvanceCredit || 0),
                    lastPaymentDate: null,
                });
            }

            const record = studentMap.get(studentId);
            const balance = Number(inv.balanceAmount || 0);

            record.overdueInvoicesCount += 1;
            record.totalOutstanding += balance;
            if (daysOverdue > 30) {
                record.arrearsAmount += balance;
            } else {
                record.currentDueAmount += balance;
            }

            if (daysOverdue > record.maxDaysOverdue) {
                record.maxDaysOverdue = daysOverdue;
                record.oldestDueDate = inv.dueDate;
            }
        }

        let defaulters = Array.from(studentMap.values());

        // 3. Filter by Aging Bracket (0-30, 31-60, 61-90, 90+)
        if (agingBracket && agingBracket !== 'ALL') {
            defaulters = defaulters.filter((d) => {
                if (agingBracket === '1-30') return d.maxDaysOverdue <= 30;
                if (agingBracket === '31-60') return d.maxDaysOverdue > 30 && d.maxDaysOverdue <= 60;
                if (agingBracket === '61-90') return d.maxDaysOverdue > 60 && d.maxDaysOverdue <= 90;
                if (agingBracket === '90+') return d.maxDaysOverdue > 90;
                return true;
            });
        }

        // 4. Filter by Amount Range
        if (minAmount) {
            defaulters = defaulters.filter((d) => d.totalOutstanding >= Number(minAmount));
        }
        if (maxAmount) {
            defaulters = defaulters.filter((d) => d.totalOutstanding <= Number(maxAmount));
        }

        // 5. Filter by Search Query
        if (search) {
            const q = search.toLowerCase();
            defaulters = defaulters.filter(
                (d) =>
                    d.studentName.toLowerCase().includes(q) ||
                    (d.admissionNumber || '').toLowerCase().includes(q) ||
                    (d.guardianEmail || '').toLowerCase().includes(q)
            );
        }

        // Sort by highest overdue days and total amount
        defaulters.sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue || b.totalOutstanding - a.totalOutstanding);

        const safeLimit = Math.min(Math.max(1, Number(limit) || 50), 200);
        const safeOffset = Math.max(0, Number(offset) || 0);
        const totalCount = defaulters.length;
        const pagedDefaulters = defaulters.slice(safeOffset, safeOffset + safeLimit);

        return {
            total: totalCount,
            items: pagedDefaulters,
            limit: safeLimit,
            offset: safeOffset,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PAYMENT REVERSALS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Reverses a fee payment safely inside a database transaction.
     * Restores invoice balance and creates an audit record.
     */
    async reversePayment({ paymentId, reason, bouncePenaltyAmount = 0 }, authorizedUserId) {
        if (!paymentId) throw new ApiError(400, 'Payment ID is required for reversal');
        if (!reason) throw new ApiError(400, 'A reason is mandatory for reversing a payment');

        return await sequelize.transaction(async (t) => {
            const payment = await FeePayment.findByPk(paymentId, {
                include: [{ model: StudentInvoice, as: 'invoice' }],
                transaction: t,
            });

            if (!payment) throw new ApiError(404, 'Payment record not found');
            if (payment.isReversed) throw new ApiError(400, 'This payment has already been reversed');

            const invoice = payment.invoice;
            if (!invoice) throw new ApiError(404, 'Linked invoice for this payment not found');

            const reversedAmount = Number(payment.amountPaid || 0);

            // Generate unique reversal receipt number
            const reversalReceiptNumber = `REV-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

            // 1. Create Reversal Audit Record
            const reversal = await FeePaymentReversal.create(
                {
                    paymentId: payment.id,
                    reversalReceiptNumber,
                    reversedAmount,
                    bouncePenaltyAmount: Number(bouncePenaltyAmount || 0),
                    reason,
                    authorizedById: authorizedUserId,
                },
                { transaction: t }
            );

            // 2. Mark Payment as Reversed (No hard delete)
            await payment.update(
                {
                    isReversed: true,
                    reversedAt: new Date(),
                    reversedById: authorizedUserId,
                    reversalReason: reason,
                },
                { transaction: t }
            );

            // 3. Rollback Invoice Financials
            const newPaid = Math.max(0, Number(invoice.paidAmount || 0) - reversedAmount);
            const penalty = Number(bouncePenaltyAmount || 0);
            const newFine = Number(invoice.fineAmount || 0) + penalty;
            const newBalance = Math.max(0, Number(invoice.balanceAmount || 0) + reversedAmount + penalty);

            let newStatus = 'PARTIAL';
            if (newPaid === 0) newStatus = 'ISSUED';
            if (new Date(invoice.dueDate) < new Date() && newBalance > 0) newStatus = 'OVERDUE';

            await invoice.update(
                {
                    paidAmount: newPaid,
                    fineAmount: newFine,
                    balanceAmount: newBalance,
                    status: newStatus,
                },
                { transaction: t }
            );

            logger.info(`[Payment Reversal] Payment ${payment.id} reversed by user ${authorizedUserId}. Invoice ${invoice.id} restored by ₹${reversedAmount}`);

            return {
                reversal,
                updatedInvoice: invoice,
            };
        });
    }

    /**
     * Retrieves paginated list of reversed payments audit logs.
     */
    async getReversedPaymentsLog({ limit = 50, offset = 0 } = {}) {
        const { count, rows } = await FeePaymentReversal.findAndCountAll({
            include: [
                {
                    model: FeePayment,
                    as: 'payment',
                    include: [
                        {
                            model: Student,
                            as: 'student',
                            attributes: ['id', 'admissionNumber'],
                            include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }],
                        },
                        {
                            model: StudentInvoice,
                            as: 'invoice',
                            attributes: ['id', 'invoiceNumber', 'title'],
                        },
                    ],
                },
                {
                    model: User,
                    as: 'authorizedBy',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        return {
            total: count,
            items: rows,
            limit: Number(limit),
            offset: Number(offset),
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // LATE FINE & WAIVERS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Waives late fine on an invoice with authorization.
     */
    async waiveLateFine({ invoiceId, waiveAmount, reason }, authorizedUserId) {
        if (!invoiceId) throw new ApiError(400, 'Invoice ID is required');
        const amountToWaive = Number(waiveAmount || 0);
        if (amountToWaive <= 0) throw new ApiError(400, 'Waiver amount must be greater than 0');
        if (!reason) throw new ApiError(400, 'Waiver justification reason is required');

        return await sequelize.transaction(async (t) => {
            const invoice = await StudentInvoice.findByPk(invoiceId, { transaction: t });
            if (!invoice) throw new ApiError(404, 'Invoice not found');

            const currentFine = Number(invoice.fineAmount || 0);
            if (amountToWaive > currentFine) {
                throw new ApiError(400, `Cannot waive ₹${amountToWaive}. Maximum fine applied is ₹${currentFine}`);
            }

            const updatedFine = Math.max(0, currentFine - amountToWaive);
            const updatedWaived = Number(invoice.lateFineWaived || 0) + amountToWaive;
            const updatedTotal = Math.max(0, Number(invoice.totalAmount || 0) - amountToWaive);
            const updatedBalance = Math.max(0, Number(invoice.balanceAmount || 0) - amountToWaive);

            let newStatus = invoice.status;
            if (updatedBalance <= 0) newStatus = 'PAID';

            await invoice.update(
                {
                    fineAmount: updatedFine,
                    lateFineWaived: updatedWaived,
                    fineWaiverReason: reason,
                    fineWaivedById: authorizedUserId,
                    totalAmount: updatedTotal,
                    balanceAmount: updatedBalance,
                    status: newStatus,
                },
                { transaction: t }
            );

            logger.info(`[Fine Waiver] User ${authorizedUserId} waived ₹${amountToWaive} on invoice ${invoice.id}. Reason: ${reason}`);
            return invoice;
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // REFUND MANAGEMENT
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Creates a new fee refund request.
     */
    async requestRefund(data, requestedUserId) {
        const student = await Student.findByPk(data.studentId);
        if (!student) throw new ApiError(404, 'Student not found');

        const voucherNumber = `REF-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

        const refund = await FeeRefund.create({
            refundVoucherNumber: voucherNumber,
            studentId: data.studentId,
            paymentId: data.paymentId || null,
            refundType: data.refundType || 'OTHER',
            amount: Number(data.amount),
            status: 'REQUESTED',
            paymentMode: data.paymentMode || 'BANK_TRANSFER',
            transactionReference: data.transactionReference || null,
            reason: data.reason,
            requestedById: requestedUserId,
            notes: data.notes || null,
        });

        logger.info(`[Refund Request] Voucher ${voucherNumber} requested for student ${student.id} for ₹${data.amount}`);
        return refund;
    }

    /**
     * Updates refund status (APPROVE / PAY / REJECT).
     */
    async updateRefundStatus({ refundId, status, paymentMode, transactionReference, notes }, authorizedUserId) {
        const refund = await FeeRefund.findByPk(refundId);
        if (!refund) throw new ApiError(404, 'Refund voucher not found');

        // Anti-fraud separation of duties: cannot approve or disburse your own refund request
        if ((status === 'APPROVED' || status === 'PAID') && refund.requestedById && refund.requestedById === authorizedUserId) {
            throw new ApiError(403, 'Separation of duties violation: You cannot approve or disburse a refund request that you created.');
        }

        const updates = { status };
        if (status === 'APPROVED' || status === 'PAID') {
            updates.approvedById = authorizedUserId;
        }
        if (status === 'PAID') {
            updates.disbursedAt = new Date().toISOString().split('T')[0];
            if (paymentMode) updates.paymentMode = paymentMode;
            if (transactionReference) updates.transactionReference = transactionReference;
        }
        if (notes) updates.notes = notes;

        await refund.update(updates);
        logger.info(`[Refund Status] Voucher ${refund.refundVoucherNumber} marked as ${status} by user ${authorizedUserId}`);
        return refund;
    }

    /**
     * Lists paginated refund requests.
     */
    async getRefunds({ status, studentId, limit = 50, offset = 0 } = {}) {
        const where = {};
        if (status && status !== 'ALL') where.status = status;
        if (studentId) where.studentId = studentId;

        const { count, rows } = await FeeRefund.findAndCountAll({
            where,
            subQuery: false,
            distinct: true,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber', 'userId'],
                    include: [{ model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] }],
                },
                {
                    model: User,
                    as: 'requestedBy',
                    attributes: ['id', 'firstName', 'lastName'],
                },
                {
                    model: User,
                    as: 'approvedBy',
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        return {
            total: count,
            items: rows,
            limit: Number(limit),
            offset: Number(offset),
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // FINANCIAL REPORTS & ANALYTICS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Generates executive collection intelligence across date ranges, modes, and classes.
     */
    async getFinancialReports({ startDate, endDate, classroomId } = {}) {
        const dateWhere = {};
        if (startDate && endDate) {
            dateWhere.paymentDate = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            dateWhere.paymentDate = { [Op.gte]: startDate };
        } else if (endDate) {
            dateWhere.paymentDate = { [Op.lte]: endDate };
        }

        // 1. Payment mode breakup
        const modeBreakup = await FeePayment.findAll({
            where: {
                ...dateWhere,
                isReversed: false,
                status: 'SUCCESS',
            },
            attributes: [
                'paymentMode',
                [sequelize.fn('COUNT', sequelize.col('id')), 'transactionCount'],
                [sequelize.fn('SUM', sequelize.col('amount_paid')), 'totalAmount'],
            ],
            group: ['paymentMode'],
            raw: true,
        });

        // 2. Daily collection register (recent records)
        const dailyRegister = await FeePayment.findAll({
            where: {
                ...dateWhere,
                isReversed: false,
            },
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber'],
                    include: [{ model: User, as: 'account', attributes: ['firstName', 'lastName'] }],
                },
                {
                    model: StudentInvoice,
                    as: 'invoice',
                    attributes: ['id', 'invoiceNumber', 'title'],
                },
                {
                    model: User,
                    as: 'collectedBy',
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
            order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']],
            limit: 100,
        });

        // 3. Class-wise collection efficiency
        const [classEfficiency] = await sequelize.query(`
            SELECT 
                c.id AS "classroomId",
                c.name AS "classroomName",
                c.section AS "section",
                COALESCE(SUM(inv.total_amount), 0) AS "totalBilled",
                COALESCE(SUM(inv.paid_amount), 0) AS "totalCollected",
                COALESCE(SUM(inv.balance_amount), 0) AS "totalPending"
            FROM classrooms c
            LEFT JOIN student_invoices inv ON inv.classroom_id = c.id AND inv.status != 'CANCELLED' AND inv.deleted_at IS NULL
            WHERE c.deleted_at IS NULL
            GROUP BY c.id, c.name, c.section
            ORDER BY "totalBilled" DESC
        `);

        return {
            modeBreakup,
            dailyRegister,
            classEfficiency,
        };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // COUNTER HISTORY & CASHIER COLLECTION VIEW
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Retrieves cashier counter collections with aggregates, cashier filters, and mode breakdowns.
     */
    async getCounterHistory({
        startDate,
        endDate,
        collectedById,
        paymentMode,
        classroomId,
        search,
        includeReversed = false,
        limit = 50,
        offset = 0,
    } = {}, currentUser = null) {
        const where = {};

        // Scope check: Cashier only sees own collection unless user has 'fees:manage' or admin role
        const isAdminOrAccountant = currentUser?.roles?.some((r) =>
            ['admin', 'super_admin', 'accountant', 'principal'].includes(r.name?.toLowerCase())
        );
        if (!isAdminOrAccountant && currentUser?.id) {
            where.collectedById = currentUser.id;
        } else if (collectedById && collectedById !== 'ALL') {
            where.collectedById = collectedById;
        }

        // Date range
        if (startDate && endDate) {
            where.paymentDate = { [Op.between]: [startDate, endDate] };
        } else if (startDate) {
            where.paymentDate = { [Op.gte]: startDate };
        } else if (endDate) {
            where.paymentDate = { [Op.lte]: endDate };
        }

        // Payment mode
        if (paymentMode && paymentMode !== 'ALL') {
            where.paymentMode = paymentMode;
        }

        // Exclude reversed payments by default
        if (String(includeReversed) !== 'true') {
            where.isReversed = false;
        }

        // Student and classroom association filters
        const studentWhere = {};
        const classroomEnrollmentWhere = {};
        if (classroomId && classroomId !== 'ALL') {
            classroomEnrollmentWhere.classroomId = classroomId;
        }

        const invoiceWhere = {};
        if (search) {
            const q = search.trim();
            where[Op.or] = [
                { receiptNumber: { [Op.iLike]: `%${q}%` } },
                { referenceNumber: { [Op.iLike]: `%${q}%` } },
                { '$student.admission_number$': { [Op.iLike]: `%${q}%` } },
                { '$student.account.first_name$': { [Op.iLike]: `%${q}%` } },
                { '$student.account.last_name$': { [Op.iLike]: `%${q}%` } },
            ];
        }

        const { count, rows } = await FeePayment.findAndCountAll({
            where,
            subQuery: false,
            distinct: true,
            include: [
                {
                    model: Student,
                    as: 'student',
                    attributes: ['id', 'admissionNumber', 'userId'],
                    include: [
                        { model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
                        {
                            model: ClassroomStudent,
                            as: 'classroomEnrollments',
                            where: classroomEnrollmentWhere,
                            required: Boolean(classroomId && classroomId !== 'ALL'),
                            include: [{ model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section'] }],
                        },
                    ],
                },
                {
                    model: StudentInvoice,
                    as: 'invoice',
                    attributes: ['id', 'invoiceNumber', 'title', 'periodKey', 'dueDate'],
                },
                {
                    model: User,
                    as: 'collectedBy',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                },
            ],
            order: [['paymentDate', 'DESC'], ['createdAt', 'DESC']],
            limit: Number(limit),
            offset: Number(offset),
        });

        // Calculate summary aggregates for the same filtered set (excluding reversed)
        const summaryWhere = { ...where, isReversed: false };
        const summaryQuery = await FeePayment.findAll({
            where: summaryWhere,
            attributes: [
                'paymentMode',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('amount_paid')), 'totalAmount'],
            ],
            group: ['paymentMode'],
            raw: true,
        });

        let totalCollected = 0;
        let cashTotal = 0;
        let upiTotal = 0;
        let chequeTotal = 0;
        let cardTotal = 0;
        let receiptsCount = 0;

        for (const s of summaryQuery) {
            const amt = Number(s.totalAmount || 0);
            const cnt = Number(s.count || 0);
            totalCollected += amt;
            receiptsCount += cnt;

            if (s.paymentMode === 'CASH') cashTotal += amt;
            else if (s.paymentMode === 'UPI' || s.paymentMode === 'ONLINE') upiTotal += amt;
            else if (s.paymentMode === 'CHEQUE') chequeTotal += amt;
            else if (s.paymentMode === 'CARD') cardTotal += amt;
        }

        // Top collectors breakdown
        const collectorsSummary = await FeePayment.findAll({
            where: summaryWhere,
            attributes: [
                'collectedById',
                [sequelize.fn('COUNT', sequelize.col('FeePayment.id')), 'txCount'],
                [sequelize.fn('SUM', sequelize.col('FeePayment.amount_paid')), 'totalCollected'],
            ],
            include: [
                {
                    model: User,
                    as: 'collectedBy',
                    attributes: ['id', 'firstName', 'lastName'],
                },
            ],
            group: ['collectedById', 'collectedBy.id', 'collectedBy.first_name', 'collectedBy.last_name'],
            raw: true,
            nest: true,
        });

        return {
            total: count,
            items: rows,
            summary: {
                totalCollected,
                cashTotal,
                upiTotal,
                chequeTotal,
                cardTotal,
                receiptsCount,
                collectors: collectorsSummary,
            },
            limit: Number(limit),
            offset: Number(offset),
        };
    }

    /**
     * Aggregates interval-wise collection targets and actual collections.
     * Groups StudentInvoiceInstallment by academicYear, class, and installmentNumber.
     */
    async getInstallmentCollectionTargets({ academicYearId, classroomId, academicClassId } = {}) {
        const invoiceWhere = {
            status: { [Op.ne]: 'CANCELLED' },
        };
        if (academicYearId) {
            invoiceWhere.academicYearId = academicYearId;
        }
        if (classroomId) {
            invoiceWhere.classroomId = classroomId;
        }

        // Include invoices linked to target academicClass if requested
        const classroomInclude = {
            model: Classroom,
            as: 'classroom',
            attributes: ['id', 'name', 'section', 'classId'],
            include: [
                {
                    model: AcademicClass,
                    as: 'academicClass',
                    attributes: ['id', 'name'],
                },
            ],
        };
        if (academicClassId) {
            classroomInclude.where = { classId: academicClassId };
        }

        const installmentRows = await StudentInvoiceInstallment.findAll({
            include: [
                {
                    model: StudentInvoice,
                    as: 'invoice',
                    where: invoiceWhere,
                    attributes: ['id', 'academicYearId', 'classroomId', 'status', 'studentId'],
                    include: [classroomInclude],
                },
            ],
            order: [['installmentNumber', 'ASC'], ['dueDate', 'ASC']],
        });

        // Group rows by installmentNumber
        const targetMap = new Map();

        for (const inst of installmentRows) {
            const instNum = inst.installmentNumber || 1;
            if (!targetMap.has(instNum)) {
                targetMap.set(instNum, {
                    installmentNumber: instNum,
                    title: inst.title || `Installment ${instNum}`,
                    dueDate: inst.dueDate,
                    targetAmount: 0,
                    collectedAmount: 0,
                    pendingAmount: 0,
                    waivedFineAmount: 0,
                    totalStudents: 0,
                    paidStudentsCount: 0,
                    pendingStudentsCount: 0,
                    overdueStudentsCount: 0,
                    studentIds: new Set(),
                });
            }

            const item = targetMap.get(instNum);
            const base = Number(inst.baseAmount || 0);
            const lateFine = Number(inst.lateFineAmount || 0);
            const waived = Number(inst.waivedFineAmount || 0);
            const paid = Number(inst.paidAmount || 0);
            const balance = Number(inst.balanceAmount || 0);

            // Target Amount = base + (lateFine - waived)
            const effectiveTarget = base + Math.max(0, lateFine - waived);
            item.targetAmount += effectiveTarget;
            item.collectedAmount += paid;
            item.pendingAmount += balance;
            item.waivedFineAmount += waived;

            if (inst.invoice?.studentId) {
                item.studentIds.add(inst.invoice.studentId);
            }

            if (inst.status === 'PAID' || balance <= 0) {
                item.paidStudentsCount++;
            } else {
                item.pendingStudentsCount++;
                if (inst.status === 'OVERDUE' || (inst.dueDate && new Date(inst.dueDate) < new Date())) {
                    item.overdueStudentsCount++;
                }
            }
        }

        // ── Fallback for Legacy/Existing Invoices without StudentInvoiceInstallment rows ──
        if (targetMap.size === 0) {
            const rawInvoices = await StudentInvoice.findAll({
                where: invoiceWhere,
                include: [classroomInclude],
                attributes: [
                    'id',
                    'studentId',
                    'invoiceNumber',
                    'title',
                    'dueDate',
                    'totalAmount',
                    'paidAmount',
                    'balanceAmount',
                    'status',
                    'createdAt',
                ],
                order: [['dueDate', 'ASC'], ['createdAt', 'ASC']],
            });

            if (rawInvoices.length > 0) {
                // Group invoices by dueDate (or default to 1 schedule per due date)
                const dateGroupMap = new Map();
                for (const inv of rawInvoices) {
                    const dKey = inv.dueDate || (inv.createdAt ? new Date(inv.createdAt).toISOString().split('T')[0] : '2026-11-28');
                    if (!dateGroupMap.has(dKey)) {
                        dateGroupMap.set(dKey, []);
                    }
                    dateGroupMap.get(dKey).push(inv);
                }

                let fallbackIdx = 1;
                for (const [dueDateVal, invList] of dateGroupMap.entries()) {
                    const fallbackTarget = {
                        installmentNumber: fallbackIdx,
                        title: `Term ${fallbackIdx} Schedule`,
                        dueDate: dueDateVal,
                        targetAmount: 0,
                        collectedAmount: 0,
                        pendingAmount: 0,
                        waivedFineAmount: 0,
                        totalStudents: 0,
                        paidStudentsCount: 0,
                        pendingStudentsCount: 0,
                        overdueStudentsCount: 0,
                        studentIds: new Set(),
                    };

                    for (const inv of invList) {
                        const tot = Number(inv.totalAmount || 0);
                        const pd = Number(inv.paidAmount || 0);
                        const bal = Number(inv.balanceAmount || 0);

                        fallbackTarget.targetAmount += tot;
                        fallbackTarget.collectedAmount += pd;
                        fallbackTarget.pendingAmount += bal;
                        if (inv.studentId) fallbackTarget.studentIds.add(inv.studentId);

                        if (inv.status === 'PAID' || bal <= 0) {
                            fallbackTarget.paidStudentsCount++;
                        } else {
                            fallbackTarget.pendingStudentsCount++;
                            if (inv.status === 'OVERDUE' || (inv.dueDate && new Date(inv.dueDate) < new Date())) {
                                fallbackTarget.overdueStudentsCount++;
                            }
                        }
                    }

                    targetMap.set(fallbackIdx, fallbackTarget);
                    fallbackIdx++;
                }
            }
        }

        const intervals = Array.from(targetMap.values()).map((t) => {
            const totalCount = t.studentIds.size || (t.paidStudentsCount + t.pendingStudentsCount);
            const pct = t.targetAmount > 0
                ? Math.min(100, Math.round((t.collectedAmount / t.targetAmount) * 10000) / 100)
                : 0;

            return {
                installmentNumber: t.installmentNumber,
                title: t.title,
                dueDate: t.dueDate,
                targetAmount: Number(t.targetAmount.toFixed(2)),
                collectedAmount: Number(t.collectedAmount.toFixed(2)),
                pendingAmount: Number(t.pendingAmount.toFixed(2)),
                waivedFineAmount: Number(t.waivedFineAmount.toFixed(2)),
                collectionPercentage: pct,
                totalStudents: totalCount,
                paidStudentsCount: t.paidStudentsCount,
                pendingStudentsCount: t.pendingStudentsCount,
                overdueStudentsCount: t.overdueStudentsCount,
            };
        });

        // Compute session-wide totals
        const sessionTotals = intervals.reduce(
            (acc, curr) => {
                acc.targetAmount += curr.targetAmount;
                acc.collectedAmount += curr.collectedAmount;
                acc.pendingAmount += curr.pendingAmount;
                acc.waivedFineAmount += curr.waivedFineAmount;
                return acc;
            },
            { targetAmount: 0, collectedAmount: 0, pendingAmount: 0, waivedFineAmount: 0 }
        );

        const overallPct = sessionTotals.targetAmount > 0
            ? Math.min(100, Math.round((sessionTotals.collectedAmount / sessionTotals.targetAmount) * 10000) / 100)
            : 0;

        return {
            academicYearId: academicYearId || null,
            classroomId: classroomId || null,
            academicClassId: academicClassId || null,
            intervals,
            sessionSummary: {
                totalTarget: Number(sessionTotals.targetAmount.toFixed(2)),
                totalCollected: Number(sessionTotals.collectedAmount.toFixed(2)),
                totalPending: Number(sessionTotals.pendingAmount.toFixed(2)),
                totalWaivedFine: Number(sessionTotals.waivedFineAmount.toFixed(2)),
                overallPercentage: overallPct,
            },
        };
    }

    /**
     * Streams collection targets report as CSV to avoid memory spikes with large datasets.
     */
    async streamCollectionTargetsCsv({ academicYearId, classroomId, academicClassId, outputStream }) {
        const report = await this.getInstallmentCollectionTargets({
            academicYearId,
            classroomId,
            academicClassId,
        });

        // Write CSV Header
        outputStream.write(
            'Installment Number,Interval Title,Due Date,Target Amount (INR),Collected Amount (INR),Pending Amount (INR),Waived Fine (INR),Completion Rate (%),Total Students,Paid Count,Pending Count,Overdue Count\r\n'
        );

        for (const interval of report.intervals) {
            const row = [
                interval.installmentNumber,
                `"${(interval.title || '').replace(/"/g, '""')}"`,
                interval.dueDate || 'N/A',
                interval.targetAmount,
                interval.collectedAmount,
                interval.pendingAmount,
                interval.waivedFineAmount,
                `${interval.collectionPercentage}%`,
                interval.totalStudents,
                interval.paidStudentsCount,
                interval.pendingStudentsCount,
                interval.overdueStudentsCount,
            ].join(',');
            outputStream.write(`${row}\r\n`);
        }

        // Summary row
        outputStream.write('\r\n');
        outputStream.write(
            `"SESSION TOTAL","All Intervals","-",${report.sessionSummary.totalTarget},${report.sessionSummary.totalCollected},${report.sessionSummary.totalPending},${report.sessionSummary.totalWaivedFine},"${report.sessionSummary.overallPercentage}%","-","-","-","-"\r\n`
        );
        outputStream.end();
    }
}

export default new FeeService();

