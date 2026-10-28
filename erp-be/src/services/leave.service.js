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
    Role
} = db;
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { calculateEffectiveLeaveDays } from './leavePolicy.service.js';
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

    // Async notification to approvers (HOD, Principals, Admins)
    setImmediate(async () => {
        try {
            const applicantTeacher = await Teacher.findByPk(teacherId, {
                include: [{ model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email'] }],
            });
            const applicantName = applicantTeacher?.account
                ? `${applicantTeacher.account.firstName} ${applicantTeacher.account.lastName}`.trim()
                : 'Teacher';

            // Find recipient approvers
            // 1. Department HOD if teacher belongs to a department
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

            // 2. Admins & Super Admins
            const adminRoles = await Role.findAll({
                where: { name: { [Op.in]: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'] } },
                include: [{ model: User, attributes: ['id', 'email', 'firstName', 'lastName'] }],
            });
            for (const r of adminRoles) {
                for (const u of (r.Users || [])) {
                    approverUserIds.add(u.id);
                }
            }

            // In-app Socket broadcast to approvers
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
                            message: `${applicantName} has applied for ${totalDays} days of ${leaveType.name} (${fromDate} to ${toDate}).`,
                            data: payload,
                        });
                    }
                }
            } catch (sockErr) {
                logger.warn(`[LeaveNotify] Socket emit skipped: ${sockErr.message}`);
            }

            // Email to approvers
            const approverUsers = await User.findAll({
                where: { id: { [Op.in]: Array.from(approverUserIds) } },
                attributes: ['id', 'email', 'firstName', 'lastName'],
            });

            const actionUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/leaves?tab=approvals`;
            for (const approver of approverUsers) {
                if (approver.email) {
                    await sendSystemNotificationEmail(
                        approver.email,
                        `${approver.firstName} ${approver.lastName}`,
                        'New Leave Application Awaiting Review',
                        `<strong>${applicantName}</strong> has submitted a new leave application:<br/><br/>
                        • <strong>Type:</strong> ${leaveType.name} (${leaveType.code})<br/>
                        • <strong>Dates:</strong> ${fromDate} to ${toDate} (${totalDays} working days)<br/>
                        • <strong>Reason:</strong> ${reason}<br/><br/>
                        Please review the application in the institutional leave approval queue.`,
                        actionUrl
                    ).catch((err) => logger.warn(`[LeaveEmail] Failed notifying approver ${approver.email}: ${err.message}`));
                }
            }
        } catch (notifErr) {
            logger.error('[LeaveNotify] Error dispatching leave apply notifications:', notifErr);
        }
    });

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

    const decidedRequest = await sequelize.transaction(async (t) => {
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

    // Post-transaction side-effects (resilient, non-blocking)
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

            // 1. Timetable Substitution Need Trigger (on APPROVED)
            if (decision === 'APPROVED') {
                try {
                    // Find all subjects taught by this teacher
                    const teacherClassroomSubjects = await ClassroomSubject.findAll({
                        where: { teacherId: reqData.teacherId },
                        attributes: ['id', 'classroomId', 'subjectId'],
                    });

                    if (teacherClassroomSubjects.length > 0) {
                        const cSubIds = teacherClassroomSubjects.map((cs) => cs.id);
                        const cSubMap = new Map(teacherClassroomSubjects.map((cs) => [cs.id, cs.classroomId]));

                        // Find all timetable slots for these subjects
                        const timetableSlots = await Timetable.findAll({
                            where: { classroomSubjectId: { [Op.in]: cSubIds } },
                            attributes: ['id', 'classroomSubjectId', 'dayOfWeek', 'startTime', 'endTime'],
                        });

                        const dayMap = {
                            0: 'Sunday',
                            1: 'Monday',
                            2: 'Tuesday',
                            3: 'Wednesday',
                            4: 'Thursday',
                            5: 'Friday',
                            6: 'Saturday',
                        };

                        const cur = new Date(reqData.fromDate);
                        const end = new Date(reqData.toDate);

                        while (cur <= end) {
                            const dayName = dayMap[cur.getDay()];
                            const dateStr = cur.toISOString().slice(0, 10);

                            // Skip Sundays
                            if (cur.getDay() !== 0) {
                                const matchingSlots = timetableSlots.filter((s) => s.dayOfWeek === dayName);

                                for (const slot of matchingSlots) {
                                    const classroomId = cSubMap.get(slot.classroomSubjectId);

                                    // Create PENDING substitution entry if not already assigned
                                    await TimetableSubstitute.findOrCreate({
                                        where: { timetableId: slot.id, date: dateStr },
                                        defaults: {
                                            classroomId,
                                            timetableId: slot.id,
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
                            cur.setDate(cur.getDate() + 1);
                        }
                        logger.info(`[SubstitutionTrigger] Substitution needs evaluated for leave request ${reqData.id}.`);
                    }
                } catch (subErr) {
                    logger.error('[SubstitutionTrigger] Error generating substitution slots:', subErr);
                }
            }

            // 2. In-App Real-time Socket Notification to Applicant
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

            // 3. Email Notification to Applicant
            if (applicantEmail) {
                const actionUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard/leaves`;
                const isApproved = decision === 'APPROVED';
                const statusColor = isApproved ? '#059669' : '#DC2626';

                const remarkHtml = reqData.decisionRemark
                    ? `<br/>• <strong>Approver Remark:</strong> ${reqData.decisionRemark}`
                    : '';

                await sendSystemNotificationEmail(
                    applicantEmail,
                    applicantName,
                    `Leave Application ${decision} (${leaveTypeName})`,
                    `<div style="padding: 12px 16px; border-radius: 8px; background: ${isApproved ? '#ECFDF5' : '#FEF2F2'}; border: 1px solid ${isApproved ? '#A7F3D0' : '#FECACA'}; margin-bottom: 16px;">
                        <span style="font-size: 16px; font-weight: 700; color: ${statusColor};">Status: ${decision}</span>
                    </div>
                    Your leave application details:<br/><br/>
                    • <strong>Leave Type:</strong> ${leaveTypeName}<br/>
                    • <strong>Period:</strong> ${reqData.fromDate} to ${reqData.toDate} (${reqData.totalDays} working days)<br/>
                    • <strong>Decided By:</strong> ${reqData.actionByName || 'Authorized Staff'}${remarkHtml}<br/><br/>
                    You can check your updated balances and history in your portal.`,
                    actionUrl
                ).catch((mailErr) => logger.warn(`[LeaveEmail] Failed notifying applicant ${applicantEmail}: ${mailErr.message}`));
            }
        } catch (notifErr) {
            logger.error('[LeaveNotify] Error in post-decision notification workflow:', notifErr);
        }
    });

    return decidedRequest;
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

            // Clean up unassigned PENDING substitution slots for these dates
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
