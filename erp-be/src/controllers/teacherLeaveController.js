'use strict';

import db from '../models/index.js';
const {
    TeacherLeaveRequest,
    TeacherLeaveBalance,
    LeaveType,
    Teacher,
    User,
    AcademicYear,
    Department,
} = db;
import { Op } from 'sequelize';
import { success, error } from '../utils/apiResponse.js';
import * as leaveService from '../services/leave.service.js';
import { calculateEffectiveLeaveDays } from '../services/leavePolicy.service.js';

// Helper to look up teacher record for current user
const getTeacherForUser = async (userId) => {
    return await Teacher.findOne({ where: { userId } });
};

/**
 * GET /api/teacher-leaves/balances/my
 * Teacher views own current leave balances
 */
export const getMyBalances = async (req, res, next) => {
    try {
        const teacher = await getTeacherForUser(req.user.id);
        if (!teacher) {
            // For admin / super_admin or staff accounts without a teacher record, return empty balances safely
            return success(res, { balances: [] });
        }

        const balances = await leaveService.getTeacherLeaveBalances(teacher.id, req.query.academicYearId);
        return success(res, { balances });
    } catch (err) { next(err); }
};

/**
 * GET /api/teacher-leaves/balances/:teacherId
 * Admin/HR views specific teacher balances
 */
export const getTeacherBalances = async (req, res, next) => {
    try {
        const balances = await leaveService.getTeacherLeaveBalances(req.params.teacherId, req.query.academicYearId);
        return success(res, { balances });
    } catch (err) { next(err); }
};

/**
 * POST /api/teacher-leaves/calculate-days
 * Preview total working days between dates
 */
export const previewLeaveDays = async (req, res, next) => {
    try {
        const { fromDate, toDate } = req.body;
        const result = await calculateEffectiveLeaveDays(fromDate, toDate);
        return success(res, result);
    } catch (err) { next(err); }
};

/**
 * POST /api/teacher-leaves/requests
 * Submit a leave application
 */
export const applyLeave = async (req, res, next) => {
    try {
        let teacherId = req.body.teacherId;
        const userRolesLower = (req.userRoles || []).map((r) => String(r).toLowerCase());
        const isAdmin = userRolesLower.some((r) => ['admin', 'super_admin', 'hr'].includes(r));

        if (!teacherId || !isAdmin) {
            const selfTeacher = await getTeacherForUser(req.user.id);
            if (!selfTeacher) return error(res, 'Teacher profile not found for user', 404);
            teacherId = selfTeacher.id;
        }

        const request = await leaveService.applyLeaveRequest({
            teacherId,
            leaveTypeId: req.body.leaveTypeId,
            fromDate: req.body.fromDate,
            toDate: req.body.toDate,
            reason: req.body.reason,
            attachmentUrl: req.body.attachmentUrl || null,
            academicYearId: req.body.academicYearId || null,
        });

        return success(res, { request }, 'Leave application submitted successfully', 201);
    } catch (err) { next(err); }
};

/**
 * GET /api/teacher-leaves/requests/my
 * Teacher views own leave applications
 */
export const getMyRequests = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);

        const teacher = await getTeacherForUser(req.user.id);
        if (!teacher) {
            // For admin / super_admin or staff accounts without a teacher record, return empty requests list safely
            return success(res, {
                requests: [],
                pagination: { total: 0, page, limit, pages: 1 },
            });
        }

        const offset = (page - 1) * limit;

        const where = { teacherId: teacher.id };
        if (req.query.status && req.query.status !== 'all') {
            where.status = req.query.status;
        }

        const { count, rows } = await TeacherLeaveRequest.findAndCountAll({
            where,
            include: [
                { model: LeaveType, as: 'leaveType', attributes: ['id', 'code', 'name', 'isPaid'] },
                { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] },
            ],
            limit, offset,
            order: [['created_at', 'DESC']],
        });

        return success(res, {
            requests: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) { next(err); }
};

/**
 * GET /api/teacher-leaves/requests
 * Queue of leave requests with scoping:
 * - Admin/HR/Principal: All requests
 * - HOD: Requests for teachers belonging to their department
 */
export const listLeaveRequests = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, parseInt(req.query.limit) || 20);
        const offset = (page - 1) * limit;

        const where = {};
        if (req.query.status && req.query.status !== 'all') {
            where.status = req.query.status;
        }
        if (req.query.leaveTypeId && req.query.leaveTypeId !== 'all') {
            where.leaveTypeId = req.query.leaveTypeId;
        }
        if (req.query.teacherId) {
            where.teacherId = req.query.teacherId;
        }

        const userRolesLower = (req.userRoles || []).map((r) => String(r).toLowerCase());
        const isGlobalAdmin = userRolesLower.some((r) => ['admin', 'super_admin', 'hr', 'principal'].includes(r));

        let teacherIncludeWhere = undefined;

        // If not global admin, check if user is a Department Incharge (HOD)
        if (!isGlobalAdmin) {
            const selfTeacher = await getTeacherForUser(req.user.id);
            if (!selfTeacher) {
                return error(res, 'Access denied: Staff record not found', 403);
            }

            const headedDepts = await Department.findAll({
                where: { headId: selfTeacher.id },
                attributes: ['id', 'name'],
            });

            if (headedDepts.length === 0) {
                return error(res, 'Access denied: Department incharge leadership required to view team leaves', 403);
            }

            const deptIds = headedDepts.map((d) => d.id);
            const deptNames = headedDepts.map((d) => d.name);

            teacherIncludeWhere = {
                [Op.or]: [
                    { department: { [Op.in]: deptIds } },
                    { department: { [Op.in]: deptNames } },
                ],
            };
        }

        const { count, rows } = await TeacherLeaveRequest.findAndCountAll({
            where,
            include: [
                {
                    model: Teacher,
                    as: 'teacher',
                    where: teacherIncludeWhere,
                    include: [
                        { model: User, as: 'account', attributes: ['id', 'firstName', 'lastName', 'email', 'phone'] },
                    ],
                },
                { model: LeaveType, as: 'leaveType', attributes: ['id', 'code', 'name', 'isPaid'] },
                { model: AcademicYear, as: 'academicYear', attributes: ['id', 'name'] },
                { model: User, as: 'decider', attributes: ['id', 'firstName', 'lastName'] },
            ],
            limit, offset,
            order: [['created_at', 'DESC']],
        });

        return success(res, {
            requests: rows,
            pagination: { total: count, page, limit, pages: Math.ceil(count / limit) },
        });
    } catch (err) { next(err); }
};

/**
 * PATCH /api/teacher-leaves/requests/:id/decide
 * Approver decides (APPROVED or REJECTED)
 */
export const decideLeave = async (req, res, next) => {
    try {
        const { decision, decisionRemark } = req.body;
        const request = await leaveService.decideLeaveRequest({
            requestId: req.params.id,
            decidedByUserId: req.user.id,
            decision,
            decisionRemark,
        });

        return success(res, { request }, `Leave request ${decision.toLowerCase()} successfully`);
    } catch (err) { next(err); }
};

/**
 * PATCH /api/teacher-leaves/requests/:id/cancel
 * Cancel application
 */
export const cancelLeave = async (req, res, next) => {
    try {
        const selfTeacher = await getTeacherForUser(req.user.id);
        const userRolesLower = (req.userRoles || []).map((r) => String(r).toLowerCase());
        const isAdmin = userRolesLower.some((r) => ['admin', 'super_admin', 'hr'].includes(r));

        const target = await TeacherLeaveRequest.findByPk(req.params.id);
        if (!target) return error(res, 'Leave request not found', 404);

        if (!isAdmin && (!selfTeacher || target.teacherId !== selfTeacher.id)) {
            return error(res, 'Unauthorized to cancel another teacher leave application', 403);
        }

        const request = await leaveService.cancelLeaveRequest({
            requestId: req.params.id,
            cancelledByUserId: req.user.id,
            cancellationReason: req.body.cancellationReason,
            isAdmin,
        });

        return success(res, { request }, 'Leave request cancelled successfully');
    } catch (err) { next(err); }
};

// ─── LEAVE RULES (POLICY) HANDLERS ──────────────────────────────────────────

/**
 * GET /api/teacher-leaves/rules/active
 * Get the currently active leave rule
 */
export const getActiveLeaveRule = async (req, res, next) => {
    try {
        const year = await leaveService.getOrResolveAcademicYear(req.query.academicYearId);
        const rule = await db.LeaveRule.findOne({
            where: { academicYearId: year.id, isActive: true },
            include: [
                { model: db.AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'status'] },
                { model: db.User, as: 'creator', attributes: ['id', 'firstName', 'lastName', 'email'] },
                { model: db.User, as: 'updater', attributes: ['id', 'firstName', 'lastName', 'email'] },
            ],
            order: [['created_at', 'DESC']],
        });

        return success(res, { rule, academicYear: year });
    } catch (err) { next(err); }
};

/**
 * GET /api/teacher-leaves/rules
 * List all leave rules with creator / updater audit details
 */
export const listLeaveRules = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.academicYearId) {
            where.academicYearId = req.query.academicYearId;
        }

        const rules = await db.LeaveRule.findAll({
            where,
            include: [
                { model: db.AcademicYear, as: 'academicYear', attributes: ['id', 'name', 'status'] },
                { model: db.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: db.User, as: 'updater', attributes: ['id', 'firstName', 'lastName'] },
            ],
            order: [['created_at', 'DESC']],
        });

        return success(res, { rules });
    } catch (err) { next(err); }
};

/**
 * POST /api/teacher-leaves/rules
 * Create a new leave rule and optionally activate it (deactivating previous rules for year)
 */
export const createLeaveRule = async (req, res, next) => {
    try {
        const {
            academicYearId,
            ruleName,
            casualLeaveCount = 12.0,
            sickLeaveCount = 10.0,
            earnedLeaveCount = 15.0,
            maternityLeaveCount = 90.0,
            leaveWithoutPayCount = 30.0,
            isActive = true,
        } = req.body;

        const year = await leaveService.getOrResolveAcademicYear(academicYearId);
        const currentUser = await db.User.findByPk(req.user.id);
        const creatorName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'System Admin';

        const result = await db.sequelize.transaction(async (t) => {
            if (isActive) {
                // If setting as active, deactivate previous rules for this academic year
                await db.LeaveRule.update(
                    { isActive: false },
                    { where: { academicYearId: year.id }, transaction: t }
                );
            }

            const newRule = await db.LeaveRule.create({
                academicYearId: year.id,
                ruleName: ruleName || `Teacher Leave Policy (${year.name})`,
                casualLeaveCount,
                sickLeaveCount,
                earnedLeaveCount,
                maternityLeaveCount,
                leaveWithoutPayCount,
                isActive,
                createdBy: req.user.id,
                createdByName: creatorName,
                updatedBy: req.user.id,
                updatedByName: creatorName,
            }, { transaction: t });

            return newRule;
        });

        return success(res, { rule: result }, 'Leave rule policy created successfully', 201);
    } catch (err) { next(err); }
};

/**
 * PUT /api/teacher-leaves/rules/:id
 * Update an existing leave rule with audit tracking
 */
export const updateLeaveRule = async (req, res, next) => {
    try {
        const rule = await db.LeaveRule.findByPk(req.params.id);
        if (!rule) return error(res, 'Leave rule not found', 404);

        const currentUser = await db.User.findByPk(req.user.id);
        const updaterName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Authorized Admin';

        const {
            ruleName,
            casualLeaveCount,
            sickLeaveCount,
            earnedLeaveCount,
            maternityLeaveCount,
            leaveWithoutPayCount,
            isActive,
        } = req.body;

        await db.sequelize.transaction(async (t) => {
            if (isActive === true && !rule.isActive) {
                // Ensure only one active rule per academic year
                await db.LeaveRule.update(
                    { isActive: false },
                    { where: { academicYearId: rule.academicYearId }, transaction: t }
                );
            }

            if (ruleName !== undefined) rule.ruleName = ruleName;
            if (casualLeaveCount !== undefined) rule.casualLeaveCount = casualLeaveCount;
            if (sickLeaveCount !== undefined) rule.sickLeaveCount = sickLeaveCount;
            if (earnedLeaveCount !== undefined) rule.earnedLeaveCount = earnedLeaveCount;
            if (maternityLeaveCount !== undefined) rule.maternityLeaveCount = maternityLeaveCount;
            if (leaveWithoutPayCount !== undefined) rule.leaveWithoutPayCount = leaveWithoutPayCount;
            if (isActive !== undefined) rule.isActive = isActive;

            rule.updatedBy = req.user.id;
            rule.updatedByName = updaterName;

            await rule.save({ transaction: t });
        });

        const refreshed = await db.LeaveRule.findByPk(rule.id, {
            include: [
                { model: db.AcademicYear, as: 'academicYear', attributes: ['id', 'name'] },
                { model: db.User, as: 'creator', attributes: ['id', 'firstName', 'lastName'] },
                { model: db.User, as: 'updater', attributes: ['id', 'firstName', 'lastName'] },
            ],
        });

        return success(res, { rule: refreshed }, 'Leave rule policy updated successfully');
    } catch (err) { next(err); }
};

