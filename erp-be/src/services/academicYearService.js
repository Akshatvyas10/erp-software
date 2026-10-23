import db from '../models/index.js';
const { AcademicYear, Classroom, StudentAcademicHistory, sequelize } = db;
import { Op } from 'sequelize';

/**
 * Generate standard display name for an Academic Year given start and end dates.
 * e.g., 2026-04-01 -> 2027-03-31 results in "2026-27"
 * e.g., 2026-01-01 -> 2026-12-31 results in "2026"
 */
export const formatAcademicYearName = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();

    if (startYear === endYear) {
        return `${startYear}`;
    }
    const endShort = String(endYear).slice(-2);
    return `${startYear}-${endShort}`;
};

/**
 * Synchronize Academic Year automatically from Academic Calendar session start and end dates.
 * Called whenever an admin sets up or updates the academic session calendar.
 */
export const syncFromCalendarSession = async ({ sessionStartDate, sessionEndDate, userId = null }) => {
    const start = new Date(sessionStartDate);
    const end = new Date(sessionEndDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid session start or end date');
    }

    if (start >= end) {
        throw new Error('Session start date must precede end date');
    }

    const name = formatAcademicYearName(sessionStartDate, sessionEndDate);
    const today = new Date();
    const isWithinToday = today >= start && today <= end;

    const t = await sequelize.transaction();
    try {
        // Check if an academic year exists with this name OR exact overlapping boundary
        let academicYear = await AcademicYear.findOne({
            where: {
                [Op.or]: [
                    { name },
                    {
                        startDate: sessionStartDate,
                        endDate: sessionEndDate,
                    },
                ],
            },
            transaction: t,
        });

        if (academicYear) {
            // Update boundaries and name
            await academicYear.update({
                name,
                startDate: sessionStartDate,
                endDate: sessionEndDate,
            }, { transaction: t });
        } else {
            // Check if there is currently an active year
            const existingActive = await AcademicYear.findOne({
                where: { isCurrent: true },
                transaction: t,
            });

            // If no active year exists and today falls within session, auto-activate
            const shouldBeActive = !existingActive && isWithinToday;

            academicYear = await AcademicYear.create({
                name,
                startDate: sessionStartDate,
                endDate: sessionEndDate,
                status: shouldBeActive ? 'ACTIVE' : (today > end ? 'COMPLETED' : 'UPCOMING'),
                isCurrent: shouldBeActive,
                createdBy: userId,
                notes: 'Automatically generated from Academic Calendar Session Setup',
            }, { transaction: t });
        }

        await t.commit();
        return academicYear;
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

/**
 * Get all Academic Years ordered chronologically
 */
export const getAllAcademicYears = async () => {
    return await AcademicYear.findAll({
        order: [['start_date', 'DESC']],
    });
};

/**
 * Get the currently active Academic Year
 */
export const getCurrentAcademicYear = async () => {
    let current = await AcademicYear.findOne({
        where: { isCurrent: true },
    });

    // Fallback: If not explicitly marked as isCurrent, look for ACTIVE status
    if (!current) {
        current = await AcademicYear.findOne({
            where: { status: 'ACTIVE' },
        });
    }

    // Fallback 2: Look for date containing today
    if (!current) {
        const todayStr = new Date().toISOString().split('T')[0];
        current = await AcademicYear.findOne({
            where: {
                startDate: { [Op.lte]: todayStr },
                endDate: { [Op.gte]: todayStr },
            },
            order: [['start_date', 'DESC']],
        });
    }

    return current;
};

/**
 * Manually activate an Academic Year with strict lifecycle rules:
 * - Mark the selected year as ACTIVE and isCurrent = true
 * - All other years become isCurrent = false
 * - Previously active years transition to COMPLETED
 * - Wrapped in a database transaction
 */
export const activateAcademicYear = async (id, userId = null) => {
    const t = await sequelize.transaction();
    try {
        const targetYear = await AcademicYear.findByPk(id, { transaction: t });
        if (!targetYear) {
            throw new Error('Academic year not found');
        }

        // 1. Transition existing active year(s) to COMPLETED
        await AcademicYear.update(
            {
                isCurrent: false,
                status: 'COMPLETED',
            },
            {
                where: {
                    id: { [Op.ne]: id },
                    [Op.or]: [
                        { isCurrent: true },
                        { status: 'ACTIVE' },
                    ],
                },
                transaction: t,
            }
        );

        // 2. Activate target year
        await targetYear.update(
            {
                isCurrent: true,
                status: 'ACTIVE',
            },
            { transaction: t }
        );

        await t.commit();
        return targetYear;
    } catch (err) {
        await t.rollback();
        throw err;
    }
};

/**
 * Update academic year metadata (label / notes)
 */
export const updateAcademicYear = async (id, { name, notes }, userId = null) => {
    const year = await AcademicYear.findByPk(id);
    if (!year) {
        throw new Error('Academic year not found');
    }

    if (name && name !== year.name) {
        // Check uniqueness
        const existing = await AcademicYear.findOne({ where: { name } });
        if (existing && existing.id !== id) {
            throw new Error(`Academic year with name "${name}" already exists`);
        }
        year.name = name;
    }

    if (notes !== undefined) {
        year.notes = notes;
    }

    await year.save();
    return year;
};

/**
 * Delete academic year with safety guard:
 * Prevent deleting if classrooms or student history reference this year.
 */
export const deleteAcademicYear = async (id) => {
    const year = await AcademicYear.findByPk(id);
    if (!year) {
        throw new Error('Academic year not found');
    }

    if (year.isCurrent || year.status === 'ACTIVE') {
        throw new Error('Cannot delete the currently active Academic Year');
    }

    // Safety checks against classrooms and student history
    const classroomCount = await Classroom.count({
        where: { academicYear: year.name },
    });
    if (classroomCount > 0) {
        throw new Error(`Cannot delete academic year: ${classroomCount} classroom(s) are linked to it`);
    }

    const historyCount = await StudentAcademicHistory.count({
        where: { academicYear: year.name },
    });
    if (historyCount > 0) {
        throw new Error(`Cannot delete academic year: ${historyCount} student academic record(s) are linked to it`);
    }

    await year.destroy();
    return { success: true };
};
