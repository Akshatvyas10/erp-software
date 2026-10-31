'use strict';

import db from '../models/index.js';
const { CalendarEvent, LeaveRule, AcademicYear, TeacherLeaveRequest, LeaveType } = db;
import { Op } from 'sequelize';

/**
 * Resolves the currently active LeaveRule for an academic year and optional teacher context.
 */
export const getActiveRuleForYear = async (academicYearId = null, teacher = null) => {
    let yearId = academicYearId;
    if (!yearId) {
        const currentYear = await AcademicYear.findOne({ where: { isCurrent: true } }) 
            || await AcademicYear.findOne({ where: { status: 'ACTIVE' } })
            || await AcademicYear.findOne({ order: [['createdAt', 'DESC']] });
        if (currentYear) yearId = currentYear.id;
    }

    if (!yearId) return null;

    // First search for matching active rules
    const rules = await LeaveRule.findAll({
        where: {
            academicYearId: yearId,
            status: 'ACTIVE',
            isActive: true,
        },
        order: [['version', 'DESC'], ['updated_at', 'DESC']],
    });

    if (!rules || rules.length === 0) return null;

    // If teacher provided, evaluate scope (e.g. department, employment type)
    if (teacher) {
        const scopedRule = rules.find((r) => {
            if (r.appliesTo === 'ALL') return true;
            if (r.appliesTo === 'DEPARTMENT' && Array.isArray(r.targetDepartments) && r.targetDepartments.length > 0) {
                return r.targetDepartments.includes(teacher.departmentId);
            }
            if (r.appliesTo === 'EMPLOYMENT_TYPE' && Array.isArray(r.targetEmploymentTypes) && r.targetEmploymentTypes.length > 0) {
                return r.targetEmploymentTypes.includes(teacher.employmentType);
            }
            return false;
        });
        if (scopedRule) return scopedRule;
    }

    return rules[0];
};

/**
 * Enhanced calculation of leave days taking into account:
 * 1. Working days vs Sundays vs Calendar Holidays
 * 2. Dynamic Sandwich Rules:
 *    - 'NONE': Only working days charged.
 *    - 'WEEKENDS': Enclosed weekends between leave days are charged.
 *    - 'HOLIDAYS': Enclosed institutional holidays between leave days are charged.
 *    - 'BOTH': Both enclosed weekends and holidays are charged.
 * 3. Adjacent sandwich checking:
 *    If leave starts on Monday and prior Friday was on approved leave (or starts Friday and next Monday is leave),
 *    the intervening weekend is evaluated based on the sandwich policy.
 *
 * @param {string|Date} fromDateStr 'YYYY-MM-DD'
 * @param {string|Date} toDateStr 'YYYY-MM-DD'
 * @param {string|null} leaveTypeCode e.g. 'CL', 'SL'
 * @param {string|null} teacherId
 * @param {string|null} academicYearId
 * @returns {Promise<{
 *   totalDays: number,
 *   workingDays: number,
 *   calendarDays: number,
 *   holidayDays: number,
 *   sandwichedDays: number,
 *   sandwichDetails: Array<{ date: string, type: 'SUNDAY'|'HOLIDAY', reason: string, name?: string }>,
 *   messages: string[]
 * }>}
 */
const parseDateUTC = (d) => {
    if (!d) return null;
    if (d instanceof Date) return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const parts = String(d).split('T')[0].split('-').map(Number);
    if (parts.length < 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) {
        return new Date(d);
    }
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
};

export const calculateEffectiveLeaveDays = async (
    fromDateStr,
    toDateStr,
    leaveTypeCode = null,
    teacherId = null,
    academicYearId = null
) => {
    const from = parseDateUTC(fromDateStr);
    const to = parseDateUTC(toDateStr);

    if (!from || !to || isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Invalid date parameters provided');
    }

    if (from > to) {
        throw new Error('From date cannot be after To date');
    }

    const activeRule = await getActiveRuleForYear(academicYearId);
    const sandwichMode = activeRule?.sandwichRule?.mode || 'NONE'; // 'NONE' | 'WEEKENDS' | 'HOLIDAYS' | 'BOTH'
    const restrictions = activeRule?.restrictions || {};
    const excludeSundays = restrictions.excludeSundays !== false;
    const excludeHolidays = restrictions.excludeHolidays !== false;

    // Buffer 4 days before and after to check for adjacent sandwich triggers
    const queryStart = new Date(from);
    queryStart.setUTCDate(queryStart.getUTCDate() - 4);
    const queryEnd = new Date(to);
    queryEnd.setUTCDate(queryEnd.getUTCDate() + 4);

    // Fetch official institutional holidays
    const holidays = await CalendarEvent.findAll({
        where: {
            day_type: 'HOLIDAY',
            status: 'PUBLISHED',
            [Op.or]: [
                {
                    start_date: { [Op.lte]: queryEnd },
                    end_date: { [Op.gte]: queryStart },
                },
            ],
        },
    });

    const holidayMap = new Map(); // 'YYYY-MM-DD' -> Holiday name
    holidays.forEach((h) => {
        const start = parseDateUTC(h.start_date);
        const end = parseDateUTC(h.end_date);
        const cur = new Date(start);
        while (cur <= end) {
            holidayMap.set(cur.toISOString().slice(0, 10), h.title || 'Institutional Holiday');
            cur.setUTCDate(cur.getUTCDate() + 1);
        }
    });

    let calendarDays = 0;
    let workingDays = 0;
    let holidayDays = 0;
    let sundayDays = 0;
    const dayRecords = [];

    const pointer = new Date(from);
    while (pointer <= to) {
        calendarDays++;
        const dateIso = pointer.toISOString().slice(0, 10);
        const isSunday = pointer.getUTCDay() === 0;
        const isSaturday = pointer.getUTCDay() === 6;
        const isHoliday = holidayMap.has(dateIso);
        const holidayName = holidayMap.get(dateIso);

        const isOffDay = isSunday || isHoliday;
        if (isSunday) sundayDays++;
        if (isHoliday) holidayDays++;

        dayRecords.push({
            date: dateIso,
            isSunday,
            isSaturday,
            isHoliday,
            holidayName,
            isOffDay,
        });

        if (!isOffDay) {
            workingDays++;
        }

        pointer.setUTCDate(pointer.getUTCDate() + 1);
    }

    const sandwichDetails = [];
    const messages = [];

    // Evaluate Sandwich Rules
    if (sandwichMode !== 'NONE' && dayRecords.length > 1) {
        // Internal sandwich check (e.g., Leave on Friday and Tuesday with Weekend/Monday holiday enclosed)
        for (let i = 1; i < dayRecords.length - 1; i++) {
            const current = dayRecords[i];
            if (current.isOffDay) {
                let shouldSandwich = false;
                if ((sandwichMode === 'WEEKENDS' || sandwichMode === 'BOTH') && current.isSunday) {
                    shouldSandwich = true;
                }
                if ((sandwichMode === 'HOLIDAYS' || sandwichMode === 'BOTH') && current.isHoliday) {
                    shouldSandwich = true;
                }

                if (shouldSandwich) {
                    sandwichDetails.push({
                        date: current.date,
                        type: current.isSunday ? 'SUNDAY' : 'HOLIDAY',
                        reason: `Enclosed by approved/requested leave days (${sandwichMode.toLowerCase()} policy)`,
                        name: current.holidayName,
                    });
                }
            }
        }
    }

    // Check adjacent leave requests for the teacher (e.g. Teacher took Friday, now applying for Monday)
    if (teacherId && sandwichMode !== 'NONE') {
        try {
            const prevWorkingDate = new Date(from);
            prevWorkingDate.setUTCDate(prevWorkingDate.getUTCDate() - 1);
            while (prevWorkingDate.getUTCDay() === 0 || holidayMap.has(prevWorkingDate.toISOString().slice(0, 10))) {
                prevWorkingDate.setUTCDate(prevWorkingDate.getUTCDate() - 1);
            }

            const nextWorkingDate = new Date(to);
            nextWorkingDate.setUTCDate(nextWorkingDate.getUTCDate() + 1);
            while (nextWorkingDate.getUTCDay() === 0 || holidayMap.has(nextWorkingDate.toISOString().slice(0, 10))) {
                nextWorkingDate.setUTCDate(nextWorkingDate.getUTCDate() + 1);
            }

            // Check if teacher has approved leave on prevWorkingDate or nextWorkingDate
            const adjacentLeaves = await TeacherLeaveRequest.findAll({
                where: {
                    teacherId,
                    status: 'APPROVED',
                    [Op.or]: [
                        {
                            fromDate: { [Op.lte]: prevWorkingDate.toISOString().slice(0, 10) },
                            toDate: { [Op.gte]: prevWorkingDate.toISOString().slice(0, 10) },
                        },
                        {
                            fromDate: { [Op.lte]: nextWorkingDate.toISOString().slice(0, 10) },
                            toDate: { [Op.gte]: nextWorkingDate.toISOString().slice(0, 10) },
                        },
                    ],
                },
            });

            if (adjacentLeaves.length > 0) {
                // If adjacent leave exists across the weekend/holiday boundary
                const checkBoundary = new Date(prevWorkingDate);
                checkBoundary.setUTCDate(checkBoundary.getUTCDate() + 1);
                while (checkBoundary < from) {
                    const bIso = checkBoundary.toISOString().slice(0, 10);
                    const isSun = checkBoundary.getUTCDay() === 0;
                    const isHol = holidayMap.has(bIso);
                    if ((isSun && (sandwichMode === 'WEEKENDS' || sandwichMode === 'BOTH')) ||
                        (isHol && (sandwichMode === 'HOLIDAYS' || sandwichMode === 'BOTH'))) {
                        if (!sandwichDetails.some((d) => d.date === bIso)) {
                            sandwichDetails.push({
                                date: bIso,
                                type: isSun ? 'SUNDAY' : 'HOLIDAY',
                                reason: 'Sandwiched with previously approved adjacent leave',
                                name: holidayMap.get(bIso),
                            });
                        }
                    }
                    checkBoundary.setUTCDate(checkBoundary.getUTCDate() + 1);
                }
            }
        } catch (e) {
            // Ignore adjacent check error gracefully
        }
    }

    const sandwichedDays = sandwichDetails.length;
    let totalDays = workingDays + sandwichedDays;
    if (totalDays === 0 && calendarDays > 0) {
        totalDays = 1.0; // Fallback minimum charge for single-day off-calendar requests if applied
    }

    if (sandwichedDays > 0) {
        messages.push(`Includes ${sandwichedDays} sandwiched day(s) according to institutional leave policy.`);
    }

    return {
        totalDays: Number(totalDays.toFixed(1)),
        workingDays,
        calendarDays,
        holidayDays,
        sandwichedDays,
        sandwichDetails,
        messages,
    };
};
