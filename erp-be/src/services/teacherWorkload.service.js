'use strict';

import db from '../models/index.js';
const {
    Teacher,
    User,
    ClassroomSubject,
    Classroom,
    Subject,
    Timetable,
    TimetableSubstitute,
    ClassroomPeriod,
    SchoolConfig,
} = db;
import { Op } from 'sequelize';

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_MAP = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
};

/**
 * Service to aggregate teacher weekly period workload, calculate daily schedule distributions,
 * detect overloading/underloading, and provide full period details (time, class, section, subject, room, type).
 */
export class TeacherWorkloadService {
    /**
     * Get default or configured maximum periods per week.
     */
    static async getMaxPeriodsPerWeek() {
        try {
            const config = await SchoolConfig.findOne();
            return config?.maxPeriodsPerWeek || 30;
        } catch {
            return 30;
        }
    }

    /**
     * Compute workload matrix for all active teachers across the school (with daily period details).
     *
     * @param {Object} filterOptions
     * @param {string} [filterOptions.department]
     * @param {string} [filterOptions.search]
     * @param {string} [filterOptions.weekStart] 'YYYY-MM-DD'
     */
    static async getWorkloadMatrix({ department, search, weekStart } = {}) {
        const maxPeriodsPerWeek = await this.getMaxPeriodsPerWeek();

        // Target week dates (Monday to Saturday)
        let weekDates = {};
        if (weekStart) {
            const [y, m, d] = weekStart.split('-').map(Number);
            const anchor = new Date(y, m - 1, d, 12, 0, 0);
            for (let i = 0; i < 6; i++) {
                const cur = new Date(anchor);
                cur.setDate(anchor.getDate() + i);
                const dayName = DAY_MAP[cur.getDay()];
                const curStr = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`;
                weekDates[dayName] = curStr;
            }
        }

        const teacherWhere = {};
        if (department) {
            teacherWhere.department = { [Op.iLike]: `%${department}%` };
        }

        const userWhere = { isActive: true };
        if (search) {
            userWhere[Op.or] = [
                { firstName: { [Op.iLike]: `%${search}%` } },
                { lastName: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
            ];
        }

        // Fetch teachers with their active accounts, classrooms, subjects, timetables
        const teachers = await Teacher.findAll({
            where: teacherWhere,
            include: [
                {
                    model: User,
                    as: 'account',
                    where: userWhere,
                    attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'isActive'],
                },
                {
                    model: ClassroomSubject,
                    as: 'assignedSubjects',
                    include: [
                        {
                            model: Classroom,
                            as: 'classroom',
                            attributes: ['id', 'name', 'section', 'status', 'roomNumber', 'buildingBlock'],
                            where: { status: 'ACTIVE' },
                            required: false,
                            include: [
                                {
                                    model: ClassroomPeriod,
                                    as: 'periods',
                                    attributes: ['id', 'name', 'startTime', 'endTime', 'order'],
                                    required: false,
                                },
                            ],
                        },
                        {
                            model: Subject,
                            as: 'subject',
                            attributes: ['id', 'name', 'code', 'type'],
                            required: false,
                        },
                        {
                            model: Timetable,
                            as: 'schedule',
                            attributes: ['id', 'dayOfWeek', 'startTime', 'endTime'],
                            required: false,
                            include: [
                                {
                                    model: TimetableSubstitute,
                                    as: 'substitutes',
                                    required: false,
                                },
                            ],
                        },
                    ],
                },
                {
                    model: TimetableSubstitute,
                    as: 'proxyDuties',
                    where: { status: 'ASSIGNED' },
                    required: false,
                    include: [
                        {
                            model: Timetable,
                            as: 'slot',
                            include: [
                                {
                                    model: ClassroomSubject,
                                    as: 'classroomSubject',
                                    include: [
                                        {
                                            model: Classroom,
                                            as: 'classroom',
                                            attributes: ['id', 'name', 'section', 'roomNumber', 'buildingBlock'],
                                            include: [
                                                {
                                                    model: ClassroomPeriod,
                                                    as: 'periods',
                                                    attributes: ['id', 'name', 'startTime', 'endTime', 'order'],
                                                    required: false,
                                                },
                                            ],
                                        },
                                        {
                                            model: Subject,
                                            as: 'subject',
                                            attributes: ['id', 'name', 'code', 'type'],
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            ],
            order: [
                [{ model: User, as: 'account' }, 'firstName', 'ASC'],
                [{ model: User, as: 'account' }, 'lastName', 'ASC'],
            ],
        });

        // Helper function to resolve period name (e.g. Lecture 1, Period 2)
        const matchPeriodName = (periods, startTime, endTime, fallbackIndex) => {
            if (Array.isArray(periods) && periods.length > 0) {
                const s = (startTime || '').slice(0, 5);
                const e = (endTime || '').slice(0, 5);
                const matched = periods.find((p) => {
                    const ps = (p.startTime || '').slice(0, 5);
                    const pe = (p.endTime || '').slice(0, 5);
                    return ps === s || (ps && pe && s >= ps && s < pe);
                });
                if (matched?.name) return matched.name;
            }
            return `Period ${fallbackIndex}`;
        };

        const matrix = teachers.map((teacher) => {
            const fullName = teacher.account
                ? `${teacher.account.firstName} ${teacher.account.lastName}`.trim()
                : 'Unknown Teacher';

            const subjectsMap = new Map();
            const classroomsMap = new Map();

            const dailyDistribution = {
                Monday: [],
                Tuesday: [],
                Wednesday: [],
                Thursday: [],
                Friday: [],
                Saturday: [],
            };

            let totalPeriods = 0;

            // 1. Regular assigned timetable slots
            for (const cs of teacher.assignedSubjects || []) {
                if (cs.subject) {
                    subjectsMap.set(cs.subject.id, { id: cs.subject.id, name: cs.subject.name, code: cs.subject.code });
                }
                if (cs.classroom) {
                    classroomsMap.set(cs.classroom.id, {
                        id: cs.classroom.id,
                        name: cs.classroom.name,
                        section: cs.classroom.section,
                        roomNumber: cs.classroom.roomNumber,
                    });
                }

                for (const slot of cs.schedule || []) {
                    const day = slot.dayOfWeek;
                    if (dailyDistribution[day] !== undefined) {
                        const targetDateForDay = weekDates[day] || null;

                        // Check if this regular slot is relieved by a substitute on the target date
                        let isRelieved = false;
                        if (targetDateForDay && Array.isArray(slot.substitutes)) {
                            const subForDate = slot.substitutes.find(
                                (s) => s.date === targetDateForDay && s.status === 'ASSIGNED' && s.substituteTeacherId
                            );
                            if (subForDate) isRelieved = true;
                        }

                        if (!isRelieved) {
                            const periodLabel = matchPeriodName(
                                cs.classroom?.periods,
                                slot.startTime,
                                slot.endTime,
                                dailyDistribution[day].length + 1
                            );

                            dailyDistribution[day].push({
                                slotId: slot.id,
                                periodName: periodLabel,
                                dayOfWeek: slot.dayOfWeek,
                                startTime: (slot.startTime || '').slice(0, 5),
                                endTime: (slot.endTime || '').slice(0, 5),
                                subjectId: cs.subject?.id,
                                subjectName: cs.subject?.name || 'Subject',
                                subjectCode: cs.subject?.code || '',
                                classroomId: cs.classroom?.id,
                                classroomName: cs.classroom?.name || '',
                                section: cs.classroom?.section || '',
                                roomNumber: cs.classroom?.roomNumber || null,
                                buildingBlock: cs.classroom?.buildingBlock || null,
                                type: 'REGULAR',
                            });
                            totalPeriods++;
                        }
                    }
                }
            }

            // 2. Proxy duties assigned to this teacher
            for (const proxy of teacher.proxyDuties || []) {
                const slot = proxy.slot;
                const cs = slot?.classroomSubject;
                if (!slot || !cs) continue;

                const [py, pm, pd] = proxy.date.split('-').map(Number);
                const proxyDate = new Date(py, pm - 1, pd, 12, 0, 0);
                const proxyDayName = DAY_MAP[proxyDate.getDay()];

                // If weekStart was provided, only include proxy duties falling in that week!
                if (weekDates[proxyDayName] && weekDates[proxyDayName] !== proxy.date) {
                    continue;
                }

                if (dailyDistribution[proxyDayName] !== undefined) {
                    const periodLabel = matchPeriodName(
                        cs.classroom?.periods,
                        slot.startTime,
                        slot.endTime,
                        dailyDistribution[proxyDayName].length + 1
                    );

                    dailyDistribution[proxyDayName].push({
                        slotId: slot.id,
                        proxyId: proxy.id,
                        periodName: `${periodLabel} (Proxy)`,
                        dayOfWeek: proxyDayName,
                        startTime: (slot.startTime || '').slice(0, 5),
                        endTime: (slot.endTime || '').slice(0, 5),
                        subjectId: cs.subject?.id,
                        subjectName: cs.subject?.name || 'Subject',
                        subjectCode: cs.subject?.code || '',
                        classroomId: cs.classroom?.id,
                        classroomName: cs.classroom?.name || '',
                        section: cs.classroom?.section || '',
                        roomNumber: cs.classroom?.roomNumber || null,
                        buildingBlock: cs.classroom?.buildingBlock || null,
                        type: 'SUBSTITUTE',
                        proxyDate: proxy.date,
                        reason: proxy.reason || null,
                    });
                    totalPeriods++;
                }
            }

            // Sort each day's periods chronologically
            for (const day of WEEKDAYS) {
                dailyDistribution[day].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
                // Normalize period labels in chronological order if they were default
                dailyDistribution[day].forEach((p, idx) => {
                    if (p.periodName.startsWith('Period ')) {
                        p.periodName = `Lecture ${idx + 1}`;
                    }
                });
            }

            const dailyCounts = {
                Monday: dailyDistribution.Monday.length,
                Tuesday: dailyDistribution.Tuesday.length,
                Wednesday: dailyDistribution.Wednesday.length,
                Thursday: dailyDistribution.Thursday.length,
                Friday: dailyDistribution.Friday.length,
                Saturday: dailyDistribution.Saturday.length,
            };

            const freePeriods = Math.max(0, maxPeriodsPerWeek - totalPeriods);
            const percentage = maxPeriodsPerWeek > 0 ? Math.round((totalPeriods / maxPeriodsPerWeek) * 100) : 0;

            let loadStatus = 'BALANCED';
            if (totalPeriods > maxPeriodsPerWeek) {
                loadStatus = 'OVERLOADED';
            } else if (percentage < 60) {
                loadStatus = 'UNDERLOADED';
            }

            return {
                id: teacher.id,
                teacherId: teacher.teacherId,
                employeeNumber: teacher.employeeNumber,
                name: fullName,
                email: teacher.account?.email || null,
                department: teacher.department || 'General',
                designation: teacher.designation || 'Teacher',
                employmentType: teacher.employmentType || 'full_time',
                totalPeriods,
                maxPeriodsPerWeek,
                freePeriods,
                percentage,
                loadStatus,
                dailyCounts,
                dailyDistribution,
                subjectsTaught: Array.from(subjectsMap.values()),
                classroomsTaught: Array.from(classroomsMap.values()),
            };
        });

        const summary = {
            totalTeachers: matrix.length,
            overloadedCount: matrix.filter((m) => m.loadStatus === 'OVERLOADED').length,
            balancedCount: matrix.filter((m) => m.loadStatus === 'BALANCED').length,
            underloadedCount: matrix.filter((m) => m.loadStatus === 'UNDERLOADED').length,
            maxPeriodsPerWeek,
            averagePeriodsPerTeacher: matrix.length > 0
                ? Math.round((matrix.reduce((acc, m) => acc + m.totalPeriods, 0) / matrix.length) * 10) / 10
                : 0,
        };

        return { summary, matrix };
    }

    /**
     * Get workload details for a single teacher with full day-wise periods.
     *
     * @param {string} teacherId
     * @param {Object} [options]
     * @param {string} [options.weekStart] 'YYYY-MM-DD'
     */
    static async getTeacherWorkload(teacherId, { weekStart } = {}) {
        const matrixResult = await this.getWorkloadMatrix({ weekStart });
        const teacherData = matrixResult.matrix.find((t) => t.id === teacherId);

        if (!teacherData) {
            const err = new Error('Teacher not found');
            err.statusCode = 404;
            throw err;
        }

        return teacherData;
    }
}
