'use strict';

import db from '../models/index.js';
const {
    sequelize,
    LeaveType,
    TeacherLeaveBalance,
    TeacherLeaveRequest,
    Teacher,
    User,
    AcademicYear,
    TeacherAttendance,
    Department
} = db;
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { calculateEffectiveLeaveDays } from './leavePolicy.service.js';

/**
 * Ensures an active academic year exists or returns the specified one.
 */
export const getOrResolveAcademicYear = async (academicYearId = null) => {
    if (academicYearId) {
        const year = await AcademicYear.findByPk(academicYearId);
        if (!year) throw new Error('Academic year not found');
        return year;
    }
    const current = await AcademicYear.findOne({ where: { isCurrent: true } });
    if (current) return current;
    const active = await AcademicYear.findOne({ where: { status: 'ACTIVE' } });
    if (active) return active;
    const latest = await AcademicYear.findOne({ order: [['createdAt', 'DESC']] });
    if (!latest) throw new Error('No academic year configured in system');
    return latest;
};

/**
 * Initializes or returns leave balances for a teacher for a given academic year.
 * If an active LeaveRule exists for the academic year, uses its configured quotas.
 */
export const initializeTeacherBalances = async (teacherId, academicYearId, transaction = null) => {
    const activeLeaveTypes = await LeaveType.findAll({ where: { isActive: true }, transaction });
    const balances = [];

    // Check for an active LeaveRule for this academic year
    const activeRule = await db.LeaveRule.findOne({
        where: { academicYearId, isActive: true },
        transaction,
    });

    const getOpeningQuota = (leaveTypeCode, fallback) => {
        if (!activeRule) return fallback;
        const code = (leaveTypeCode || '').toUpperCase();
        if (code === 'CL' && activeRule.casualLeaveCount !== undefined) return Number(activeRule.casualLeaveCount);
        if (code === 'SL' && activeRule.sickLeaveCount !== undefined) return Number(activeRule.sickLeaveCount);
        if (code === 'EL' && activeRule.earnedLeaveCount !== undefined) return Number(activeRule.earnedLeaveCount);
        if (code === 'ML' && activeRule.maternityLeaveCount !== undefined) return Number(activeRule.maternityLeaveCount);
        if (code === 'LWP' && activeRule.leaveWithoutPayCount !== undefined) return Number(activeRule.leaveWithoutPayCount);
        return fallback;
    };

    for (const lt of activeLeaveTypes) {
        const openingDays = getOpeningQuota(lt.code, lt.defaultDaysPerYear);
        const [bal] = await TeacherLeaveBalance.findOrCreate({
            where: {
                teacherId,
                leaveTypeId: lt.id,
                academicYearId,
            },
            defaults: {
                openingBalance: openingDays,
                consumedDays: 0.0,
            },
            transaction,
        });
        balances.push(bal);
    }

    return balances;
};

/**
 * Retrieves full leave balance summary for a teacher including remaining days and metadata.
 */
export const getTeacherLeaveBalances = async (teacherId, academicYearId = null) => {
    const year = await getOrResolveAcademicYear(academicYearId);
    
    // Auto-initialize if not created yet
    await initializeTeacherBalances(teacherId, year.id);

    const balances = await TeacherLeaveBalance.findAll({
        where: { teacherId, academicYearId: year.id },
        include: [{
            model: LeaveType,
            as: 'leaveType',
            attributes: ['id', 'code', 'name', 'isPaid', 'maxConsecutiveDays', 'requiresAttachment', 'description'],
        }],
        order: [[{ model: LeaveType, as: 'leaveType' }, 'code', 'ASC']],
    });

    return balances.map((b) => {
        const item = b.toJSON();
        const opening = Number(item.openingBalance || 0);
        const consumed = Number(item.consumedDays || 0);
        item.remainingDays = Number(Math.max(0, opening - consumed).toFixed(1));
        item.academicYearName = year.name;
        return item;
    });
};

/**
 * Teacher applies for a new leave request.
 * Enforces:
 * - date range validity
 * - no overlapping PENDING or APPROVED leaves
 * - balance sufficiency (unless leave is unpaid / LWP)
 * - consecutive days ceiling if set on LeaveType
 */
export const applyLeaveRequest = async ({
    teacherId,
    leaveTypeId,
    fromDate,
    toDate,
    reason,
    attachmentUrl = null,
    academicYearId = null
}) => {
    const year = await getOrResolveAcademicYear(academicYearId);
    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType || !leaveType.isActive) {
        throw new Error('Selected leave type is invalid or inactive');
    }

    const { totalDays } = await calculateEffectiveLeaveDays(fromDate, toDate);

    if (leaveType.maxConsecutiveDays && totalDays > leaveType.maxConsecutiveDays) {
        throw new Error(`Maximum consecutive days allowed for ${leaveType.name} is ${leaveType.maxConsecutiveDays} days.`);
    }

    if (leaveType.requiresAttachment && !attachmentUrl) {
        throw new Error(`${leaveType.name} requires supporting medical/official attachment.`);
    }

    // Overlap validation
    const overlap = await TeacherLeaveRequest.findOne({
        where: {
            teacherId,
            status: { [Op.in]: ['PENDING', 'APPROVED'] },
            [Op.and]: [
                { fromDate: { [Op.lte]: toDate } },
                { toDate: { [Op.gte]: fromDate } },
            ],
        },
    });

    if (overlap) {
        throw new Error(`You already have a ${overlap.status} leave request spanning ${overlap.fromDate} to ${overlap.toDate}.`);
    }

    // Balance check
    await initializeTeacherBalances(teacherId, year.id);
    const balance = await TeacherLeaveBalance.findOne({
        where: { teacherId, leaveTypeId, academicYearId: year.id },
    });

    if (leaveType.isPaid && balance) {
        const remaining = Number(balance.openingBalance) - Number(balance.consumedDays);
        if (totalDays > remaining) {
            throw new Error(`Insufficient leave balance. Requested: ${totalDays} days, Available: ${remaining.toFixed(1)} days.`);
        }
    }

    const newRequest = await TeacherLeaveRequest.create({
        teacherId,
        leaveTypeId,
        academicYearId: year.id,
        fromDate,
        toDate,
        totalDays,
        reason,
        attachmentUrl,
        status: 'PENDING',
    });

    logger.info(`Teacher ${teacherId} submitted leave request ${newRequest.id} for ${totalDays} days.`);
    return newRequest;
};

/**
 * Decision on leave request (APPROVE or REJECT).
 * Enforces atomic database transaction, balance deduction, and attendance sync.
 */
export const decideLeaveRequest = async ({
    requestId,
    decidedByUserId,
    decision, // 'APPROVED' | 'REJECTED'
    decisionRemark
}) => {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new Error('Invalid decision. Must be APPROVED or REJECTED');
    }

    return await sequelize.transaction(async (t) => {
        // Lock the request row specifically (without LEFT OUTER JOINs to prevent Postgres lock error)
        const request = await TeacherLeaveRequest.findByPk(requestId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!request) throw new Error('Leave request not found');
        if (request.status !== 'PENDING') {
            throw new Error(`Cannot decide request that is already ${request.status}`);
        }

        // Fetch associated models separately inside the transaction
        const leaveType = await LeaveType.findByPk(request.leaveTypeId, { transaction: t });
        const teacher = await Teacher.findByPk(request.teacherId, {
            include: [{ model: User, as: 'account', attributes: ['id', 'firstName', 'lastName'] }],
            transaction: t,
        });

        const deciderUser = await User.findByPk(decidedByUserId, { transaction: t });
        const deciderFullName = deciderUser ? `${deciderUser.firstName} ${deciderUser.lastName}`.trim() : 'Authorized Staff';

        // Prevent self-approval (unless super_admin)
        if (teacher && teacher.userId === decidedByUserId) {
            if (!deciderUser || !['super_admin', 'SUPER_ADMIN'].includes(deciderUser.role)) {
                throw new Error('Approval policy violation: You cannot approve your own leave request.');
            }
        }

        if (decision === 'APPROVED') {
            // Deduct balance
            const balance = await TeacherLeaveBalance.findOne({
                where: {
                    teacherId: request.teacherId,
                    leaveTypeId: request.leaveTypeId,
                    academicYearId: request.academicYearId,
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (balance) {
                balance.consumedDays = Number(balance.consumedDays) + Number(request.totalDays);
                await balance.save({ transaction: t });
            }

            // Sync TeacherAttendance rows for each day in range
            const cur = new Date(request.fromDate);
            const end = new Date(request.toDate);
            const ltCode = leaveType ? leaveType.code.toLowerCase() : '';
            const attendanceLeaveType = ltCode === 'cl' ? 'casual' : (ltCode === 'sl' ? 'sick' : 'unpaid');

            while (cur <= end) {
                const dayStr = cur.toISOString().slice(0, 10);
                const isSunday = cur.getDay() === 0;
                if (!isSunday) {
                    await TeacherAttendance.findOrCreate({
                        where: { teacherId: request.teacherId, date: dayStr },
                        defaults: {
                            status: 'on_leave',
                            leaveType: attendanceLeaveType,
                            source: 'leave_module',
                        },
                        transaction: t,
                    });
                    await TeacherAttendance.update(
                        {
                            status: 'on_leave',
                            leaveType: attendanceLeaveType,
                        },
                        {
                            where: { teacherId: request.teacherId, date: dayStr },
                            transaction: t,
                        }
                    );
                }
                cur.setDate(cur.getDate() + 1);
            }
        }

        request.status = decision;
        request.decidedBy = decidedByUserId;
        request.actionByName = deciderFullName;
        request.decidedAt = new Date();
        request.decisionRemark = decisionRemark || null;
        await request.save({ transaction: t });

        logger.info(`Leave request ${request.id} decided as ${decision} by ${deciderFullName} (${decidedByUserId}).`);
        return request;
    });
};

/**
 * Cancels a leave request.
 * - If PENDING: immediately marks CANCELLED.
 * - If APPROVED: reverses balance deduction and cleans up attendance marks.
 */
export const cancelLeaveRequest = async ({ requestId, cancelledByUserId, cancellationReason, isAdmin = false }) => {
    return await sequelize.transaction(async (t) => {
        // Lock request row directly without joins to prevent outer join lock errors
        const request = await TeacherLeaveRequest.findByPk(requestId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!request) throw new Error('Leave request not found');
        if (request.status === 'CANCELLED') {
            throw new Error('Leave application is already cancelled');
        }
        if (request.status === 'REJECTED') {
            throw new Error('Rejected leave applications cannot be cancelled');
        }
        if (request.status === 'APPROVED' && !isAdmin) {
            throw new Error('Approved leave applications cannot be cancelled by applicant. Please contact administration.');
        }

        if (request.status === 'APPROVED') {
            // Restore consumed balance
            const balance = await TeacherLeaveBalance.findOne({
                where: {
                    teacherId: request.teacherId,
                    leaveTypeId: request.leaveTypeId,
                    academicYearId: request.academicYearId,
                },
                transaction: t,
                lock: t.LOCK.UPDATE,
            });

            if (balance) {
                balance.consumedDays = Math.max(0, Number(balance.consumedDays) - Number(request.totalDays));
                await balance.save({ transaction: t });
            }

            // Remove attendance leave marks for non-past dates
            const today = new Date().toISOString().slice(0, 10);
            await TeacherAttendance.destroy({
                where: {
                    teacherId: request.teacherId,
                    date: {
                        [Op.gte]: today,
                        [Op.between]: [request.fromDate, request.toDate],
                    },
                    status: 'on_leave',
                },
                transaction: t,
            });
        }

        request.status = 'CANCELLED';
        request.cancelledAt = new Date();
        request.cancellationReason = cancellationReason || 'Cancelled by user';
        await request.save({ transaction: t });

        logger.info(`Leave request ${request.id} cancelled.`);
        return request;
    });
};
