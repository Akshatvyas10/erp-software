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
     * Evaluates availability and calculates intelligent recommendation scores for substitute candidates.
     * Scoring Criteria:
     * - Availability (Must be free; busy candidates receive 0 score)
     * - Subject capability match: +50 points (if candidate teaches the subject or has it in profile subjects)
     * - Department match: +30 points (if candidate belongs to same department)
     * - Workload balance: up to +20 points (candidates with fewer proxy duties this week get higher priority)
     * 
     * @param {Object} params
     * @param {string} params.date 'YYYY-MM-DD'
     * @param {string} params.startTime 'HH:mm'
     * @param {string} params.endTime 'HH:mm'
     * @param {string} [params.subjectId]
     * @param {string} [params.subjectName]
     * @param {string} [params.department]
     * @param {string} [params.excludeTeacherId]
     * @param {object} [params.transaction]
     */
    static async getTeachersWithAvailability({
        date,
        startTime,
        endTime,
        subjectId = null,
        subjectName = null,
        department = null,
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

        // Calculate start and end of target week for proxy workload balancing
        const [y, m, d] = date.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        const dayIdx = targetDate.getDay(); // 0 is Sun, 1 is Mon...
        const diffToMon = dayIdx === 0 ? -6 : 1 - dayIdx;
        const monday = new Date(targetDate);
        monday.setDate(targetDate.getDate() + diffToMon);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const formatIsoDate = (dt) => {
            const yr = dt.getFullYear();
            const mo = String(dt.getMonth() + 1).padStart(2, '0');
            const dy = String(dt.getDate()).padStart(2, '0');
            return `${yr}-${mo}-${dy}`;
        };

        const weekStartStr = formatIsoDate(monday);
        const weekEndStr = formatIsoDate(sunday);

        // Fetch proxy duties for all candidate teachers in this week
        const teacherIds = teachers.map((t) => t.id);
        const weeklyProxies = await TimetableSubstitute.findAll({
            where: {
                substituteTeacherId: { [Op.in]: teacherIds },
                date: { [Op.between]: [weekStartStr, weekEndStr] },
                status: 'ASSIGNED',
            },
            attributes: ['substituteTeacherId'],
            raw: true,
            transaction,
        });

        const proxyCountMap = new Map();
        for (const wp of weeklyProxies) {
            proxyCountMap.set(wp.substituteTeacherId, (proxyCountMap.get(wp.substituteTeacherId) || 0) + 1);
        }

        // Query which teachers actively teach the target subject across classrooms
        const subjectTeacherIds = new Set();
        if (subjectId) {
            const subjectTaught = await ClassroomSubject.findAll({
                where: { subjectId, teacherId: { [Op.in]: teacherIds } },
                attributes: ['teacherId'],
                raw: true,
                transaction,
            });
            subjectTaught.forEach((st) => subjectTeacherIds.add(st.teacherId));
        }

        const normalizedSubjectName = subjectName ? subjectName.toLowerCase().trim() : null;
        const normalizedDept = department ? department.toLowerCase().trim() : null;

        const results = [];
        for (const t of teachers) {
            const check = await this.checkAvailability({
                teacherId: t.id,
                date,
                startTime,
                endTime,
                transaction,
            });

            let matchScore = 0;
            const matchBadges = [];

            if (check.isFree) {
                // Baseline free score
                matchScore += 10;
                matchBadges.push('Free Period');

                // Subject capability check
                let teachesSubject = subjectTeacherIds.has(t.id);
                if (!teachesSubject && normalizedSubjectName && Array.isArray(t.subjects)) {
                    teachesSubject = t.subjects.some((s) => {
                        const val = typeof s === 'string' ? s : s?.name || '';
                        return val.toLowerCase().trim() === normalizedSubjectName;
                    });
                }

                if (teachesSubject) {
                    matchScore += 50;
                    matchBadges.unshift('Same Subject');
                }

                // Department match check
                if (normalizedDept && t.department && t.department.toLowerCase().trim() === normalizedDept) {
                    matchScore += 30;
                    matchBadges.push('Same Department');
                }

                // Workload balancing
                const proxiesThisWeek = proxyCountMap.get(t.id) || 0;
                if (proxiesThisWeek === 0) {
                    matchScore += 20;
                    matchBadges.push('Light Load');
                } else if (proxiesThisWeek === 1) {
                    matchScore += 10;
                } else if (proxiesThisWeek === 2) {
                    matchScore += 5;
                }
            }

            results.push({
                id: t.id,
                teacherId: t.teacherId,
                name: t.account ? `${t.account.firstName} ${t.account.lastName}`.trim() : 'Teacher',
                email: t.account?.email || null,
                department: t.department || null,
                designationName: t.designationName || null,
                isFree: check.isFree,
                matchScore: check.isFree ? matchScore : 0,
                matchBadges: check.isFree ? matchBadges : [],
                proxiesThisWeek: proxyCountMap.get(t.id) || 0,
                isTopSuggestion: check.isFree && matchScore >= 60,
                conflicts: check.conflicts,
                primaryConflict: check.conflicts[0] || null,
            });
        }

        // Sort descending: Free teachers first with highest match score, then alphabetical
        results.sort((a, b) => {
            if (a.isFree !== b.isFree) return a.isFree ? -1 : 1;
            if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
            return a.name.localeCompare(b.name);
        });

        return results;
    }
}
