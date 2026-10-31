'use strict';
import * as studentLeaveService from '../services/studentLeave.service.js';
import { success, error } from '../utils/apiResponse.js';

/**
 * GET /api/student-leaves
 * For faculty/admin to view student leave requests in their scope
 */
export const getReviewableLeaves = async (req, res, next) => {
    try {
        const leaves = await studentLeaveService.getReviewableStudentLeaves({
            user: req.user,
            query: req.query
        });
        return success(res, leaves, 'Student leave requests fetched successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/student-leaves/:id/action
 * For Class Teacher / Department Incharge / Admin to approve or reject
 */
export const actionLeave = async (req, res, next) => {
    try {
        const { action, decisionRemark } = req.body;
        const updated = await studentLeaveService.actionStudentLeave({
            requestId: req.params.id,
            action,
            decisionRemark,
            user: req.user
        });
        return success(res, updated, `Student leave application ${action.toLowerCase()} successfully`);
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/student-leaves/my
 * For student/parent to view their own leave history
 */
export const getMyLeaves = async (req, res, next) => {
    try {
        const studentId = req.user.studentId;
        if (!studentId) {
            return error(res, 'Student profile not associated with this account.', 400);
        }
        const leaves = await studentLeaveService.getStudentOwnLeaves(studentId);
        return success(res, leaves, 'Leave history fetched successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/student-leaves/apply
 * For student/parent to submit a new leave application
 */
export const applyLeave = async (req, res, next) => {
    try {
        const studentId = req.user.studentId;
        if (!studentId) {
            return error(res, 'Student profile not associated with this account.', 400);
        }

        const { category, fromDate, toDate, totalDays, reason, attachmentUrl } = req.body;
        if (!fromDate || !toDate || !reason) {
            return error(res, 'From date, to date, and reason are required fields.', 400);
        }

        const leave = await studentLeaveService.applyStudentLeave({
            studentId,
            category,
            fromDate,
            toDate,
            totalDays,
            reason,
            attachmentUrl
        });

        return success(res, leave, 'Student leave application submitted successfully', 201);
    } catch (err) {
        next(err);
    }
};
