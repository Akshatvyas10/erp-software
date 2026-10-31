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
    Department,
    ClassroomSubject,
    Timetable,
    TimetableSubstitute,
    Role,
    LeaveRule,
    TeacherLeaveAccrual,
} = db;
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { calculateEffectiveLeaveDays, getActiveRuleForYear } from './leavePolicy.service.js';
import { sendSystemNotificationEmail } from './email.service.js';
import { getIo } from '../config/socket.js';

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
 * Calculates current month accrual, carried balance, allowed advance, and effective available leave.
 * 
 * Formula:
 * Available = currentMonthCredit + carriedOverBalance + allowedAdvance - consumedThisMonth
 */
export const calculateDynamicLeaveQuota = async (teacherId, leaveTypeId, targetDateStr = null, academicYearId = null) => {
    const year = await getOrResolveAcademicYear(academicYearId);
    const teacher = await Teacher.findByPk(teacherId);
    const leaveType = await LeaveType.findByPk(leaveTypeId);
    if (!leaveType) throw new Error('Leave type not found');

    const activeRule = await getActiveRuleForYear(year.id, teacher);
    const typeCode = (leaveType.code || '').toUpperCase();
    const config = activeRule?.leaveTypeConfigs?.[typeCode] || {
        enabled: true,
        allocationMode: 'YEARLY',
        monthlyCreditCount: 1.0,
        yearlyTotalQuota: Number(leaveType.defaultDaysPerYear || 12.0),
        maxPerRequest: Number(leaveType.maxConsecutiveDays || 15.0),
        maxPerMonth: 5.0,
        maxPerYear: Number(leaveType.defaultDaysPerYear || 12.0),
        allowAdvanceFromFutureMonths: false,
        advanceLimit: 0,
        carryForwardEnabled: true,
        carryForwardMaxLimit: 12.0,
    };

    const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();
    const targetYearMonth = targetDate.toISOString().slice(0, 7); // e.g. '2026-10'

    // Compute month index within academic year (1..12)
    const academicStart = year.startDate ? new Date(year.startDate) : new Date(targetDate.getFullYear(), 3, 1); // April default
    const monthDiff = (targetDate.getFullYear() - academicStart.getFullYear()) * 12 + (targetDate.getMonth() - academicStart.getMonth());
    const elapsedMonths = Math.max(1, Math.min(12, monthDiff + 1));

    // Base yearly balance record
    const [balance] = await TeacherLeaveBalance.findOrCreate({
        where: { teacherId, leaveTypeId, academicYearId: year.id },
        defaults: {
            openingBalance: config.yearlyTotalQuota || leaveType.defaultDaysPerYear || 12.0,
            consumedDays: 0.0,
        },
    });

    const isMonthly = config.allocationMode === 'MONTHLY';
    let currentMonthCredit = Number(config.monthlyCreditCount || 1.0);
    let accruedToDate = isMonthly ? Number((currentMonthCredit * elapsedMonths).toFixed(1)) : Number(balance.openingBalance);
    
    // Total consumed across the academic year
    const totalConsumed = Number(balance.consumedDays || 0.0);

    // Prior carried balance
    let carriedEligible = 0.0;
    if (isMonthly) {
        const previousAccrued = currentMonthCredit * (elapsedMonths - 1);
        const priorUnused = Math.max(0, previousAccrued - totalConsumed);
        carriedEligible = config.carryForwardEnabled 
            ? Math.min(priorUnused, Number(config.carryForwardMaxLimit || 12.0))
            : 0.0;
    }

    // Allowed Advance calculation (if enabled and remaining future months exist)
    let advanceAvailable = 0.0;
    if (config.allowAdvanceFromFutureMonths && elapsedMonths < 12) {
        const maxAdvanceAllowed = Number(config.advanceLimit || 1.0);
        const remainingMonthsInYear = 12 - elapsedMonths;
        advanceAvailable = Math.min(maxAdvanceAllowed, remainingMonthsInYear * currentMonthCredit);
    }

    // Remaining standard balance (accrued to date minus consumed)
    const standardAvailable = Math.max(0, Number((accruedToDate - totalConsumed).toFixed(1)));
    
    // Effective available including allowed advance from next month
    const effectiveAvailable = Number((standardAvailable + advanceAvailable).toFixed(1));

    return {
        leaveTypeCode: typeCode,
        leaveTypeName: leaveType.name,
        allocationMode: config.allocationMode,
        monthlyCreditCount: currentMonthCredit,
        yearlyTotalQuota: Number(config.yearlyTotalQuota || balance.openingBalance),
        elapsedMonths,
        accruedToDate,
        carriedEligible: Number(carriedEligible.toFixed(1)),
        totalConsumed,
        standardAvailable,
        advanceAvailable: Number(advanceAvailable.toFixed(1)),
        effectiveAvailable,
        maxPerRequest: Number(config.maxPerRequest || 15.0),
        requiresAttachment: Boolean(config.requiresAttachment),
        allowAdvanceFromFutureMonths: Boolean(config.allowAdvanceFromFutureMonths),
    };
};

/**
 * Initializes or returns leave balances for a teacher for a given academic year.
 * If an active LeaveRule exists for the academic year, uses its configured quotas.
 */
export const initializeTeacherBalances = async (teacherId, academicYearId, transaction = null) => {
    const activeLeaveTypes = await LeaveType.findAll({ where: { isActive: true }, transaction });
    const balances = [];

    const activeRule = await LeaveRule.findOne({
        where: { academicYearId, status: 'ACTIVE', isActive: true },
        transaction,
    });

    const getOpeningQuota = (leaveTypeCode, fallback) => {
        if (!activeRule) return fallback;
        const code = (leaveTypeCode || '').toUpperCase();
        if (activeRule.leaveTypeConfigs?.[code]?.yearlyTotalQuota !== undefined) {
            return Number(activeRule.leaveTypeConfigs[code].yearlyTotalQuota);
        }
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
 * Retrieves full leave balance summary for a teacher including dynamic breakdown.
 */
export const getTeacherLeaveBalances = async (teacherId, academicYearId = null) => {
    const year = await getOrResolveAcademicYear(academicYearId);
    
    // Auto-initialize base balances if not present
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

    const enriched = await Promise.all(
        balances.map(async (b) => {
            const item = b.toJSON();
            try {
                const dynamicQuota = await calculateDynamicLeaveQuota(teacherId, item.leaveTypeId, null, year.id);
                item.remainingDays = dynamicQuota.effectiveAvailable;
                item.dynamicBreakdown = dynamicQuota;
            } catch (e) {
                const opening = Number(item.openingBalance || 0);
                const consumed = Number(item.consumedDays || 0);
                item.remainingDays = Number(Math.max(0, opening - consumed).toFixed(1));
            }
            item.academicYearName = year.name;
            return item;
        })
    );

    return enriched;
};

/**
 * Teacher applies for a new leave request.
 * Enforces dynamic rule engine:
 * - date range validity
 * - no overlapping PENDING or APPROVED leaves
 * - dynamic sandwich day calculation
 * - dynamic balance sufficiency (including monthly credit + advance limits)
 * - consecutive days ceiling
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

    // Dynamic calculation with sandwich rules
    const calcResult = await calculateEffectiveLeaveDays(fromDate, toDate, leaveType.code, teacherId, year.id);
    const { totalDays, sandwichedDays, sandwichDetails } = calcResult;

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

    // Dynamic Balance & Policy Validation
    const dynamicQuota = await calculateDynamicLeaveQuota(teacherId, leaveTypeId, fromDate, year.id);

    if (dynamicQuota.maxPerRequest && totalDays > dynamicQuota.maxPerRequest) {
        throw new Error(`Maximum consecutive days allowed for ${leaveType.name} is ${dynamicQuota.maxPerRequest} days.`);
    }

    if (dynamicQuota.requiresAttachment && !attachmentUrl) {
        throw new Error(`${leaveType.name} requires supporting medical/official attachment.`);
    }

    let usesAdvance = false;
    let advanceAmount = 0.0;

    if (leaveType.isPaid) {
        if (totalDays > dynamicQuota.effectiveAvailable) {
            throw new Error(`Insufficient leave balance. Required: ${totalDays} day(s), Available: ${dynamicQuota.effectiveAvailable} day(s).`);
        }
        if (totalDays > dynamicQuota.standardAvailable && dynamicQuota.advanceAvailable > 0) {
            usesAdvance = true;
            advanceAmount = Number((totalDays - dynamicQuota.standardAvailable).toFixed(1));
        }
    }

    const newRequest = await TeacherLeaveRequest.create({
        teacherId,
        leaveTypeId,
        academicYearId: year.id,
        fromDate,
        toDate,
        totalDays,
        reason: usesAdvance 
            ? `${reason} [Uses ${advanceAmount} advance ${dynamicQuota.leaveTypeCode} from next month]` 
            : reason,
        attachmentUrl,
        status: 'PENDING',
    });

    logger.info(`Teacher ${teacherId} submitted leave request ${newRequest.id} for ${totalDays} days (Sandwiched: ${sandwichedDays}, Advance: ${advanceAmount}).`);

    // Async notification to approvers (HOD, Principals, Admins)
    setImmediate(async () => {
        try {
            const applicantTeacher = await Teacher.findByPk(teacherId, {
                include: [{ model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            });
            const applicantName = applicantTeacher?.account
                ? `${applicantTeacher.account.firstName} ${applicantTeacher.account.lastName}`.trim()
                : 'Teacher';

            const approverUserIds = new Set();
            if (applicantTeacher?.department) {
                const depts = await Department.findAll({
                    where: {
                        [Op.or]: [
                            { id: applicantTeacher.department },
                            { name: applicantTeacher.department },
                        ],
                    },
                    include: [{ model: Teacher, as: 'head', include: [{ model: User, as: 'account' }] }],
                });
                for (const d of depts) {
                    if (d.head?.account?.id) {
                        approverUserIds.add(d.head.account.id);
                    }
                }
            }

            const adminRoles = await Role.findAll({
                where: { name: { [Op.in]: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'] } },
                include: [{ model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }],
            });
            for (const r of adminRoles) {
                for (const u of (r.Users || [])) {
                    approverUserIds.add(u.id);
                }
            }

            try {
                const io = getIo();
                if (io) {
                    const payload = {
                        type: 'leave:applied',
                        requestId: newRequest.id,
                        teacherName: applicantName,
                        leaveTypeName: leaveType.name,
                        fromDate,
                        toDate,
                        totalDays,
                        reason,
                    };
                    for (const uId of approverUserIds) {
                        io.to(`user:${uId}`).emit('notification', {
                            title: 'New Teacher Leave Application',
                            message: `${applicantName} applied for ${leaveType.name} (${fromDate} to ${toDate}, ${totalDays} days).`,
                            data: payload,
                        });
                    }
                }
            } catch (sockErr) {
                logger.warn(`[LeaveNotify] Socket emit skipped: ${sockErr.message}`);
            }
        } catch (err) {
            logger.error('[LeaveNotify] Error notifying approvers:', err);
        }
    });

    return newRequest;
};

/**
 * Decides a pending leave request (APPROVED / REJECTED) with atomic transaction.
 */
export const decideLeaveRequest = async ({ requestId, decision, decidedByUserId, decisionRemark = null }) => {
    if (!['APPROVED', 'REJECTED'].includes(decision)) {
        throw new Error('Invalid decision. Must be APPROVED or REJECTED');
    }

    const decidedRequest = await sequelize.transaction(async (t) => {
        const request = await TeacherLeaveRequest.findByPk(requestId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
        });

        if (!request) throw new Error('Leave request not found');
        if (request.status !== 'PENDING') {
            throw new Error(`Cannot decide request that is already ${request.status}`);
        }

        const leaveType = await LeaveType.findByPk(request.leaveTypeId, { transaction: t });
        const teacher = await Teacher.findByPk(request.teacherId, {
            include: [{ model: User, as: 'account', attributes: ['id', 'firstName', 'lastName'] }],
            transaction: t,
        });

        const deciderUser = await User.findByPk(decidedByUserId, { transaction: t });
        const deciderFullName = deciderUser ? `${deciderUser.firstName} ${deciderUser.lastName}`.trim() : 'Authorized Staff';

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

    // Async post-transaction side-effects
    setImmediate(async () => {
        try {
            const reqData = await TeacherLeaveRequest.findByPk(requestId, {
                include: [
                    { model: LeaveType, as: 'leaveType' },
                    {
                        model: Teacher,
                        as: 'teacher',
                        include: [{ model: User, as: 'account', attributes: ['id', 'email', 'firstName', 'lastName'] }],
                    },
                ],
            });

            if (!reqData) return;

            const applicantUser = reqData.teacher?.account;
            const applicantEmail = applicantUser?.email;
            const applicantName = applicantUser ? `${applicantUser.firstName} ${applicantUser.lastName}`.trim() : 'Teacher';
            const leaveTypeName = reqData.leaveType?.name || 'Leave';

            // Substitution slots generator
            if (decision === 'APPROVED') {
                try {
                    const teacherClassroomSubjects = await ClassroomSubject.findAll({
                        where: { teacherId: reqData.teacherId },
                        attributes: ['id', 'classroomId', 'subjectId'],
                    });

                    if (teacherClassroomSubjects.length > 0) {
                        const cSubIds = teacherClassroomSubjects.map((cs) => cs.id);
                        const cSubMap = new Map(teacherClassroomSubjects.map((cs) => [cs.id, cs.classroomId]));

                        const timetableSlots = await Timetable.findAll({
                            where: { classroom_subject_id: { [Op.in]: cSubIds } },
                            attributes: ['id', 'day_of_week', 'start_time', 'end_time', 'classroom_subject_id'],
                        });

                        const parseDateUTC = (d) => {
                            if (!d) return new Date();
                            if (d instanceof Date) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                            const parts = String(d).split('T')[0].split('-').map(Number);
                            return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
                        };

                        const cur = parseDateUTC(reqData.fromDate);
                        const end = parseDateUTC(reqData.toDate);
                        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

                        while (cur <= end) {
                            const dayName = dayNames[cur.getUTCDay()];
                            const dateStr = cur.toISOString().slice(0, 10);
                            const matchingSlots = timetableSlots.filter((slot) => slot.day_of_week === dayName);

                            for (const slot of matchingSlots) {
                                const classId = cSubMap.get(slot.classroom_subject_id);
                                if (classId) {
                                    await TimetableSubstitute.findOrCreate({
                                        where: { timetableId: slot.id, date: dateStr },
                                        defaults: {
                                            timetableId: slot.id,
                                            classroomId: classId,
                                            originalTeacherId: reqData.teacherId,
                                            substituteTeacherId: null,
                                            date: dateStr,
                                            reason: `Leave approved: ${leaveTypeName} (${reqData.reason || 'On Leave'})`,
                                            status: 'PENDING',
                                            assignedBy: null,
                                        },
                                    });
                                }
                            }
                            cur.setUTCDate(cur.getUTCDate() + 1);
                        }
                    }
                } catch (subErr) {
                    logger.error('[SubstitutionTrigger] Error generating substitution slots:', subErr);
                }
            }

            // Real-time socket notification
            try {
                const io = getIo();
                if (io && applicantUser?.id) {
                    io.to(`user:${applicantUser.id}`).emit('notification', {
                        title: `Leave Application ${decision}`,
                        message: `Your leave request for ${leaveTypeName} (${reqData.fromDate} to ${reqData.toDate}) has been ${decision.toLowerCase()} by ${reqData.actionByName || 'Administrator'}.`,
                        data: {
                            type: 'leave:decided',
                            decision,
                            requestId: reqData.id,
                            decisionRemark: reqData.decisionRemark,
                            actionByName: reqData.actionByName,
                        },
                    });
                }
            } catch (sockErr) {
                logger.warn(`[LeaveNotify] Socket emit skipped: ${sockErr.message}`);
            }

            // Email Notification
            if (applicantEmail) {
                const actionUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/leaves`;
                const isApproved = decision === 'APPROVED';
                const statusColor = isApproved ? '#059669' : '#DC2626';

                const remarkHtml = reqData.decisionRemark
                    ? `<br/>• <strong>Approver Remark:</strong> ${reqData.decisionRemark}`
                    : '';

                await sendSystemNotificationEmail(
                    applicantEmail,
                    `Leave Request ${decision} - ${leaveTypeName}`,
                    `Your leave request from ${reqData.fromDate} to ${reqData.toDate} has been ${decision}.`,
                    `
                    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                        <h2 style="color: ${statusColor};">Leave Request ${decision}</h2>
                        <p>Dear ${applicantName},</p>
                        <p>Your leave request has been reviewed with the following details:</p>
                        <div style="background: #f4f4f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
                            • <strong>Category:</strong> ${leaveTypeName}<br/>
                            • <strong>Duration:</strong> ${reqData.fromDate} &rarr; ${reqData.toDate} (${reqData.totalDays} day(s))<br/>
                            • <strong>Decision:</strong> <span style="font-weight: bold; color: ${statusColor};">${decision}</span><br/>
                            • <strong>Decided By:</strong> ${reqData.actionByName || 'Administrator'}${remarkHtml}
                        </div>
                        <p><a href="${actionUrl}" style="display:inline-block; padding: 10px 20px; background: #4F46E5; color: #fff; text-decoration: none; border-radius: 6px;">View Leave Portal</a></p>
                    </div>
                    `
                );
            }
        } catch (err) {
            logger.error('[LeaveNotify] Post-decision notification error:', err);
        }
    });

    return decidedRequest;
};

/**
 * Cancels a leave request.
 */
export const cancelLeaveRequest = async ({ requestId, cancelledByUserId, cancellationReason = null, isAdmin = false }) => {
    return await sequelize.transaction(async (t) => {
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

            await TimetableSubstitute.destroy({
                where: {
                    originalTeacherId: request.teacherId,
                    date: {
                        [Op.gte]: today,
                        [Op.between]: [request.fromDate, request.toDate],
                    },
                    status: 'PENDING',
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
