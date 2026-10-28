'use strict';

import db from '../models/index.js';
const {
    Teacher,
    Classroom,
    ClassroomSubject,
    Subject,
    Timetable,
    TimetableSubstitute,
    TeacherLeaveRequest,
    TeacherAttendance,
    LeaveType,
    User,
} = db;
import { Op } from 'sequelize';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Service to verify teacher availability at a specific date and time slot.
 * Checks for:
 * 1. Approved leaves & on-leave attendance status
 * 2. Regular timetable lecture slots (unless relieved by another substitute)
 * 3. Already assigned substitute proxy duties
 */
export class TeacherAvailabilityService {
    /**
     * Check if a specific teacher is free for a given period on a date.
     * 
     * @param {Object} params
     * @param {string} params.teacherId
     * @param {string} params.date 'YYYY-MM-DD'
     * @param {string} params.startTime 'HH:mm' or 'HH:mm:ss'
     * @param {string} params.endTime 'HH:mm' or 'HH:mm:ss'
     * @param {string} [params.excludeSubstituteId] Optional ID of substitution record to ignore (for updates)
     * @param {object} [params.transaction] Optional Sequelize transaction
     * @returns {Promise<{ isFree: boolean, conflicts: Array<{ type: string, message: string, details?: any }> }>}
     */
    static async checkAvailability({
        teacherId,
        date,
        startTime,
        endTime,
        excludeSubstituteId = null,
        transaction = null,
    }) {
        const conflicts = [];

        // Parse date and determine day of week
        const [y, m, d] = date.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        const dayOfWeek = DAY_NAMES[targetDate.getDay()];

        // 1. Check Approved Leave / Attendance status on that date
        const leaveRequest = await TeacherLeaveRequest.findOne({
            where: {
                teacherId,
                status: 'APPROVED',
                fromDate: { [Op.lte]: date },
                toDate: { [Op.gte]: date },
            },
            include: [{ model: LeaveType, as: 'leaveType', attributes: ['id', 'name', 'code'] }],
            transaction,
        });

        if (leaveRequest) {
            const typeName = leaveRequest.leaveType?.name || 'Approved Leave';
            conflicts.push({
                type: 'LEAVE',
                message: `Teacher is on ${typeName} from ${leaveRequest.fromDate} to ${leaveRequest.toDate}.`,
                details: {
                    leaveTypeId: leaveRequest.leaveTypeId,
                    leaveTypeName: typeName,
                    fromDate: leaveRequest.fromDate,
                    toDate: leaveRequest.toDate,
                },
            });
        }

        // Also check TeacherAttendance table for 'on_leave' marking
        const attendanceRecord = await TeacherAttendance.findOne({
            where: {
                teacherId,
                date,
                status: 'on_leave',
            },
            transaction,
        });

        if (attendanceRecord && !leaveRequest) {
            conflicts.push({
                type: 'LEAVE',
                message: `Teacher attendance is marked 'On Leave' on ${date}.`,
                details: {
                    attendanceId: attendanceRecord.id,
                    leaveType: attendanceRecord.leaveType,
                },
            });
        }

        // 2. Check Regular Timetable Lecture Overlap
        // A teacher is busy if they teach a classroom subject at this day/time
        // UNLESS someone else has already been assigned as substitute for that slot on this date!
        const regularSlots = await Timetable.findAll({
            where: {
                dayOfWeek,
                startTime: { [Op.lt]: endTime },
                endTime: { [Op.gt]: startTime },
            },
            include: [
                {
                    model: ClassroomSubject,
                    as: 'classroomSubject',
                    where: { teacherId },
                    required: true,
                    include: [
                        {
                            model: Classroom,
                            as: 'classroom',
                            attributes: ['id', 'name', 'section', 'status'],
                            where: { status: 'ACTIVE' },
                        },
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['id', 'name', 'code'],
                        },
                    ],
                },
            ],
            transaction,
        });

        if (regularSlots.length > 0) {
            for (const slot of regularSlots) {
                // Check if this teacher is relieved by another substitute for this slot on this date
                const substituteRelief = await TimetableSubstitute.findOne({
                    where: {
                        timetableId: slot.id,
                        date,
                        status: 'ASSIGNED',
                        substituteTeacherId: { [Op.ne]: null },
                    },
                    transaction,
                });

                if (!substituteRelief) {
                    const c = slot.classroomSubject?.classroom;
                    const s = slot.classroomSubject?.subject;
                    const cName = c ? `${c.name} - Section ${c.section}` : 'another classroom';
                    const sName = s ? s.name : 'Lecture';
                    const timeRange = `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}`;

                    conflicts.push({
                        type: 'REGULAR_LECTURE',
                        message: `Scheduled lecture (${sName}) in ${cName} (${timeRange}).`,
                        details: {
                            classroomId: c?.id,
                            classroomName: cName,
                            subjectName: sName,
                            startTime: slot.startTime,
                            endTime: slot.endTime,
                        },
                    });
                }
            }
        }

        // 3. Check Proxy/Substitute Duty Overlap
        const substituteWhere = {
            substituteTeacherId: teacherId,
            date,
            status: 'ASSIGNED',
        };
        if (excludeSubstituteId) {
            substituteWhere.id = { [Op.ne]: excludeSubstituteId };
        }

        const proxyDuties = await TimetableSubstitute.findAll({
            where: substituteWhere,
            include: [
                {
                    model: Timetable,
                    as: 'slot',
                    where: {
                        startTime: { [Op.lt]: endTime },
                        endTime: { [Op.gt]: startTime },
                    },
                    required: true,
                    include: [
                        {
                            model: ClassroomSubject,
                            as: 'classroomSubject',
                            include: [
                                {
                                    model: Classroom,
                                    as: 'classroom',
                                    attributes: ['id', 'name', 'section'],
                                },
                                {
                                    model: Subject,
                                    as: 'subject',
                                    attributes: ['id', 'name'],
                                },
                            ],
                        },
                    ],
                },
            ],
            transaction,
        });

        for (const proxy of proxyDuties) {
            const slot = proxy.slot;
            const c = slot?.classroomSubject?.classroom;
            const s = slot?.classroomSubject?.subject;
            const cName = c ? `${c.name} - ${c.section}` : 'Classroom';
            const sName = s ? s.name : 'Proxy Subject';
            const timeRange = slot ? `${slot.startTime.slice(0, 5)} - ${slot.endTime.slice(0, 5)}` : 'this period';

            conflicts.push({
                type: 'SUBSTITUTE_DUTY',
                message: `Already appointed as proxy for ${sName} in ${cName} (${timeRange}).`,
                details: {
                    substituteId: proxy.id,
                    classroomName: cName,
                    subjectName: sName,
                    startTime: slot?.startTime,
                    endTime: slot?.endTime,
                },
            });
        }

        return {
            isFree: conflicts.length === 0,
            conflicts,
        };
    }

    /**
     * Evaluates availability for all active teachers in school for a specific slot/date.
     * Useful for populate the substitute selection dropdown with live availability badges.
     */
    static async getTeachersWithAvailability({
        date,
        startTime,
        endTime,
        excludeTeacherId = null,
        transaction = null,
    }) {
        const whereTeacher = {};
        if (excludeTeacherId) {
            whereTeacher.id = { [Op.ne]: excludeTeacherId };
        }

        const teachers = await Teacher.findAll({
            where: whereTeacher,
            include: [
                {
                    model: User,
                    as: 'account',
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    where: { isActive: true },
                    required: true,
                },
            ],
            order: [
                [{ model: User, as: 'account' }, 'firstName', 'ASC'],
            ],
            transaction,
        });

        const results = [];
        for (const t of teachers) {
            const check = await this.checkAvailability({
                teacherId: t.id,
                date,
                startTime,
                endTime,
                transaction,
            });

            results.push({
                id: t.id,
                teacherId: t.teacherId,
                name: t.account ? `${t.account.firstName} ${t.account.lastName}`.trim() : 'Teacher',
                email: t.account?.email || null,
                department: t.department || null,
                designationName: t.designationName || null,
                isFree: check.isFree,
                conflicts: check.conflicts,
                primaryConflict: check.conflicts[0] || null,
            });
        }

        return results;
    }
}
