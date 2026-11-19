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
    FeePayment,
    Student,
    Classroom,
    ClassroomStudent,
    AcademicClass,
    AcademicYear,
    User,
    FeeReminderLog,
    SchoolConfig,
} = db;
import { enqueueEmailJob } from '../queues/email.queue.js';
import { sendFeeReminderDirect } from './email.service.js';

/**
 * Service handling Fee Masters, Invoices, and Payment collections
 */
class FeeService {
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

    /**
     * Compute calculated items, gross, discount, and net for a student based on a Fee Structure and chosen frequency
     */
    _calculateStudentFee({ student, feeStructure, frequency = 'MONTHLY' }) {
        // Filter structure items for the given frequency where amount > 0 and isEnabled
        const freqItems = (feeStructure.items || []).filter(
            (it) => it.frequency === frequency && it.isEnabled && Number(it.amount) > 0
        );

        const subtotal = freqItems.reduce((sum, it) => sum + Number(it.amount), 0);

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

        totalDiscount = Math.round(totalDiscount * 100) / 100;
        const netPayable = Math.max(0, subtotal - totalDiscount);

        return {
            subtotal,
            discountAmount: totalDiscount,
            netPayable,
            matchedQuota: matchedDiscount ? studentQuota : null,
            discountRule: matchedDiscount || null,
            lineItems,
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

            const calculation = this._calculateStudentFee({ student, feeStructure, frequency });
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

                const calculation = this._calculateStudentFee({ student, feeStructure, frequency });
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
                    attributes: ['id', 'admissionNumber', 'status'],
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
                    model: FeePayment,
                    as: 'payments',
                    attributes: ['id', 'receiptNumber', 'amountPaid', 'paymentMode', 'paymentDate'],
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
    // FEE COLLECTION & PAYMENTS (Supports Partial, FIFO & Minimum Rules)
    // ══════════════════════════════════════════════════════════════════════════

    async collectPayment(data, userId) {
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

            // Allocate payment across invoices
            for (const inv of invoicesToPay) {
                if (remainingFund <= 0) break;
                const invBalance = Number(inv.balanceAmount);
                const alloc = Math.min(remainingFund, invBalance);
                const newPaid = Number(inv.paidAmount) + alloc;
                const newBal = Math.max(0, invBalance - alloc);
                const newStatus = newBal === 0 ? 'PAID' : 'PARTIALLY_PAID';

                await inv.update(
                    {
                        paidAmount: newPaid,
                        balanceAmount: newBal,
                        status: newStatus,
                    },
                    { transaction: t }
                );

                remainingFund -= alloc;
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

    async getStudentFeeLedger(studentId) {
        const student = await Student.findByPk(studentId, {
            include: [
                { model: User, as: 'account', attributes: ['firstName', 'lastName', 'email', 'phone'] },
                {
                    model: ClassroomStudent,
                    as: 'classroomEnrollments',
                    include: [{ model: Classroom, as: 'classroom', attributes: ['id', 'name', 'section', 'classId'] }],
                },
            ],
        });
        if (!student) throw new ApiError(404, 'Student not found');

        const invoices = await StudentInvoice.findAll({
            where: { studentId },
            include: [
                { model: StudentInvoiceItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] },
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

        const totalPaid = payments.reduce((sum, p) => sum + Number(p.amountPaid || 0), 0);
        const outstandingBalance = Math.max(0, totalBilled - totalPaid);

        // Resolve assigned class fee structure for projection / transparency
        let assignedStructure = null;
        const activeEnrollment = student.classroomEnrollments?.[0];
        const studentClassId = activeEnrollment?.classroom?.classId;
        if (studentClassId) {
            const structure = await FeeStructure.findOne({
                where: { academicClassId: studentClassId, status: 'ACTIVE' },
                include: [
                    { model: FeeStructureItem, as: 'items', include: [{ model: FeeHead, as: 'feeHead' }] },
                    { model: FeeStructureDiscount, as: 'discounts' },
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
                    headsCount: (structure.items || []).filter(i => Number(i.amount) > 0).length,
                };
            }
        }

        return {
            student,
            assignedStructure,
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

    // ═════════════════════════════════════════════════════════════════════════
    // FEE REMINDER WORKFLOW ENGINE
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Resolves installment-wise dues with arrears carry-forward for students
     * and evaluates eligibility for reminders with strict skip reasoning.
     */
    async getEligibleReminderStudents({ classroomId, periodKey, asOfDate, academicYearId } = {}) {
        const targetDate = asOfDate || new Date().toISOString().split('T')[0];

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
        const todayReminders = await FeeReminderLog.findAll({
            where: {
                studentId: { [Op.in]: studentIds },
                createdAt: { [Op.gte]: todayStart },
                status: { [Op.in]: ['SENT', 'QUEUED'] },
                ...(periodKey ? { periodKey } : {}),
            },
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

            // Arrears vs Target Period Due
            let targetInvoice = null;
            let installmentDue = 0;
            let arrears = 0;
            let totalOutstanding = 0;

            for (const inv of studentInvoices) {
                const balance = Number(inv.balanceAmount || 0);
                totalOutstanding += balance;

                const isTargetPeriod = periodKey
                    ? inv.periodKey === periodKey
                    : inv.dueDate && inv.dueDate <= targetDate;

                if (periodKey && inv.periodKey === periodKey) {
                    targetInvoice = inv;
                    installmentDue += balance;
                } else if (!periodKey && inv.dueDate && inv.dueDate <= targetDate && !targetInvoice) {
                    // Default to latest matching invoice within target date
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
                periodKey: periodKey || targetInvoice?.periodKey || 'OVERDUE',
                targetInvoiceId: targetInvoice?.id || null,
                targetInvoiceNumber: targetInvoice?.invoiceNumber || null,
                dueDate: targetInvoice?.dueDate || targetDate,
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
    async sendBulkFeeReminders({ studentIds, periodKey, dueDate, customNote }, userId = null) {
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            throw new ApiError(400, 'Please select at least one student to send fee reminders.');
        }

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
                metadata: { note: customNote },
            });

            // Enqueue Job into BullMQ Email Queue
            try {
                const payload = {
                    recipientEmail: studentInfo.parentEmail,
                    studentName: studentInfo.studentName,
                    admissionNumber: studentInfo.admissionNumber,
                    classroomName: studentInfo.classroomName,
                    periodKey: periodKey || studentInfo.periodKey,
                    dueDate: dueDate || studentInfo.dueDate,
                    installmentDue: studentInfo.installmentDue,
                    arrears: studentInfo.arrears,
                    advanceCredit: studentInfo.advanceCredit,
                    payableAmount: studentInfo.totalPayable,
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
                    attributes: ['id', 'admissionNumber', 'firstName', 'lastName', 'parentEmail', 'parentPhone'],
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'name'],
                },
                {
                    model: User,
                    as: 'sentBy',
                    attributes: ['id', 'name', 'email'],
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
        const dispatchResult = await this.sendBulkFeeReminders(
            {
                studentIds: targetStudentIds,
                customNote: 'Scheduled automated reminder as per school fee calendar policy.',
            },
            null // system automated
        );

        return { executed: true, ...dispatchResult };
    }
}

export default new FeeService();

