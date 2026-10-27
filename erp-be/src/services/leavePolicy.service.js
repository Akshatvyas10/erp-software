'use strict';

import db from '../models/index.js';
const { CalendarEvent } = db;
import { Op } from 'sequelize';

/**
 * Calculates effective leave days between fromDate and toDate.
 * Optionally deducts calendar holidays (day_type = 'HOLIDAY') and Sundays.
 * 
 * @param {string|Date} fromDateStr 'YYYY-MM-DD'
 * @param {string|Date} toDateStr 'YYYY-MM-DD'
 * @returns {Promise<{ totalDays: number, calendarDays: number, holidayDays: number }>}
 */
export const calculateEffectiveLeaveDays = async (fromDateStr, toDateStr) => {
    const from = new Date(fromDateStr);
    const to = new Date(toDateStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new Error('Invalid date parameters provided');
    }

    if (from > to) {
        throw new Error('From date cannot be after To date');
    }

    // Fetch official institutional holidays in the date window
    const holidays = await CalendarEvent.findAll({
        where: {
            day_type: 'HOLIDAY',
            status: 'PUBLISHED',
            [Op.or]: [
                {
                    start_date: {
                        [Op.lte]: to,
                    },
                    end_date: {
                        [Op.gte]: from,
                    },
                },
            ],
        },
    });

    const holidayDateStrings = new Set();
    holidays.forEach((h) => {
        const start = new Date(h.start_date);
        const end = new Date(h.end_date);
        const cur = new Date(start);
        while (cur <= end) {
            holidayDateStrings.add(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
        }
    });

    let calendarDays = 0;
    let effectiveWorkingDays = 0;
    let holidayDays = 0;

    const pointer = new Date(from);
    while (pointer <= to) {
        calendarDays++;
        const dateIso = pointer.toISOString().slice(0, 10);
        const isSunday = pointer.getDay() === 0;
        const isHoliday = holidayDateStrings.has(dateIso);

        if (isSunday || isHoliday) {
            holidayDays++;
        } else {
            effectiveWorkingDays++;
        }
        pointer.setDate(pointer.getDate() + 1);
    }

    // Minimum charge is 1.0 day if range is valid
    const totalDays = effectiveWorkingDays > 0 ? effectiveWorkingDays : 1.0;

    return {
        totalDays: Number(totalDays.toFixed(1)),
        calendarDays,
        holidayDays,
    };
};
