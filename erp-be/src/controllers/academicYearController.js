import * as academicYearService from '../services/academicYearService.js';
import { success, error } from '../utils/apiResponse.js';

export const getAllYears = async (req, res, next) => {
    try {
        const years = await academicYearService.getAllAcademicYears();
        return success(res, years, 'Academic years fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const getCurrentYear = async (req, res, next) => {
    try {
        const current = await academicYearService.getCurrentAcademicYear();
        return success(res, current, 'Current academic year fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const syncFromCalendar = async (req, res, next) => {
    try {
        const { sessionStartDate, sessionEndDate } = req.body;
        if (!sessionStartDate || !sessionEndDate) {
            return error(res, 'sessionStartDate and sessionEndDate are required', 400);
        }

        const year = await academicYearService.syncFromCalendarSession({
            sessionStartDate,
            sessionEndDate,
            userId: req.user?.id,
        });

        return success(res, year, 'Academic year synchronized with calendar session successfully', 200);
    } catch (err) {
        return error(res, err.message, 400);
    }
};

export const activateYear = async (req, res, next) => {
    try {
        const { id } = req.params;
        const year = await academicYearService.activateAcademicYear(id, req.user?.id);
        return success(res, year, 'Academic year activated successfully');
    } catch (err) {
        return error(res, err.message, 400);
    }
};

export const updateYear = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, notes } = req.body;
        const year = await academicYearService.updateAcademicYear(id, { name, notes }, req.user?.id);
        return success(res, year, 'Academic year updated successfully');
    } catch (err) {
        return error(res, err.message, 400);
    }
};

export const deleteYear = async (req, res, next) => {
    try {
        const { id } = req.params;
        await academicYearService.deleteAcademicYear(id);
        return success(res, null, 'Academic year deleted successfully');
    } catch (err) {
        return error(res, err.message, 400);
    }
};
