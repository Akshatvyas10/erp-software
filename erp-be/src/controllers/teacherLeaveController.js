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
        const { fromDate, toDate, teacherId, leaveTypeId, options } = req.body;
        let resolvedTeacherId = teacherId;
        if (!resolvedTeacherId) {
            const selfTeacher = await getTeacherForUser(req.user.id);
            if (selfTeacher) resolvedTeacherId = selfTeacher.id;
        }

        const result = await calculateEffectiveLeaveDays(fromDate, toDate, {
            teacherId: resolvedTeacherId,
            leaveTypeId,
            ...(options || {}),
        });
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
 * Create a new leave rule with comprehensive dynamic configuration
 */
export const createLeaveRule = async (req, res, next) => {
    try {
        const {
            academicYearId,
            ruleName,
            status = 'ACTIVE',
            appliesTo = 'ALL',
            targetDepartments = [],
            targetEmploymentTypes = [],
            effectiveFrom = null,
            effectiveTo = null,
            casualLeaveCount = 12.0,
            sickLeaveCount = 10.0,
            earnedLeaveCount = 15.0,
            maternityLeaveCount = 90.0,
            leaveWithoutPayCount = 30.0,
            isActive = true,
            leaveTypeConfigs,
            sandwichRule,
            restrictions,
        } = req.body;

        const year = await leaveService.getOrResolveAcademicYear(academicYearId);
        const currentUser = await db.User.findByPk(req.user.id);
        const creatorName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'System Admin';

        const isRuleActive = status === 'ACTIVE' || isActive === true;
        const normalizedStatus = isRuleActive ? 'ACTIVE' : (status || 'DRAFT');

        const result = await db.sequelize.transaction(async (t) => {
            if (isRuleActive && appliesTo === 'ALL') {
                // Deactivate other 'ALL' rules for this academic year to keep exactly one active default
                await db.LeaveRule.update(
                    { status: 'INACTIVE', isActive: false },
                    { where: { academicYearId: year.id, appliesTo: 'ALL' }, transaction: t }
                );
            }

            const newRule = await db.LeaveRule.create({
                academicYearId: year.id,
                ruleName: ruleName || `Teacher Leave Policy (${year.name})`,
                status: normalizedStatus,
                appliesTo,
                targetDepartments,
                targetEmploymentTypes,
                effectiveFrom,
                effectiveTo,
                casualLeaveCount,
                sickLeaveCount,
                earnedLeaveCount,
                maternityLeaveCount,
                leaveWithoutPayCount,
                isActive: isRuleActive,
                ...(leaveTypeConfigs ? { leaveTypeConfigs } : {}),
                ...(sandwichRule ? { sandwichRule } : {}),
                ...(restrictions ? { restrictions } : {}),
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
 * Update an existing leave rule with audit tracking and dynamic JSON support
 */
export const updateLeaveRule = async (req, res, next) => {
    try {
        const rule = await db.LeaveRule.findByPk(req.params.id);
        if (!rule) return error(res, 'Leave rule not found', 404);

        const currentUser = await db.User.findByPk(req.user.id);
        const updaterName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Authorized Admin';

        const {
            ruleName,
            status,
            appliesTo,
            targetDepartments,
            targetEmploymentTypes,
            effectiveFrom,
            effectiveTo,
            casualLeaveCount,
            sickLeaveCount,
            earnedLeaveCount,
            maternityLeaveCount,
            leaveWithoutPayCount,
            isActive,
            leaveTypeConfigs,
            sandwichRule,
            restrictions,
        } = req.body;

        await db.sequelize.transaction(async (t) => {
            const willBeActive = (status === 'ACTIVE') || (isActive === true && status !== 'INACTIVE' && status !== 'DRAFT');

            if (willBeActive && (!rule.isActive || rule.status !== 'ACTIVE')) {
                const scope = appliesTo || rule.appliesTo;
                if (scope === 'ALL') {
                    await db.LeaveRule.update(
                        { status: 'INACTIVE', isActive: false },
                        { where: { academicYearId: rule.academicYearId, appliesTo: 'ALL', id: { [Op.ne]: rule.id } }, transaction: t }
                    );
                }
            }

            if (ruleName !== undefined) rule.ruleName = ruleName;
            if (status !== undefined) {
                rule.status = status;
                rule.isActive = status === 'ACTIVE';
            } else if (isActive !== undefined) {
                rule.isActive = isActive;
                rule.status = isActive ? 'ACTIVE' : 'INACTIVE';
            }
            if (appliesTo !== undefined) rule.appliesTo = appliesTo;
            if (targetDepartments !== undefined) rule.targetDepartments = targetDepartments;
            if (targetEmploymentTypes !== undefined) rule.targetEmploymentTypes = targetEmploymentTypes;
            if (effectiveFrom !== undefined) rule.effectiveFrom = effectiveFrom;
            if (effectiveTo !== undefined) rule.effectiveTo = effectiveTo;

            if (casualLeaveCount !== undefined) rule.casualLeaveCount = casualLeaveCount;
            if (sickLeaveCount !== undefined) rule.sickLeaveCount = sickLeaveCount;
            if (earnedLeaveCount !== undefined) rule.earnedLeaveCount = earnedLeaveCount;
            if (maternityLeaveCount !== undefined) rule.maternityLeaveCount = maternityLeaveCount;
            if (leaveWithoutPayCount !== undefined) rule.leaveWithoutPayCount = leaveWithoutPayCount;

            if (leaveTypeConfigs !== undefined) rule.leaveTypeConfigs = leaveTypeConfigs;
            if (sandwichRule !== undefined) rule.sandwichRule = sandwichRule;
            if (restrictions !== undefined) rule.restrictions = restrictions;

            rule.version = (rule.version || 1) + 1;
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

/**
 * PATCH /api/teacher-leaves/rules/:id/activate
 * Set a specific leave rule as ACTIVE, deactivating conflicting rules in same scope
 */
export const activateLeaveRule = async (req, res, next) => {
    try {
        const rule = await db.LeaveRule.findByPk(req.params.id);
        if (!rule) return error(res, 'Leave rule not found', 404);

        const currentUser = await db.User.findByPk(req.user.id);
        const updaterName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Authorized Admin';

        await db.sequelize.transaction(async (t) => {
            if (rule.appliesTo === 'ALL') {
                await db.LeaveRule.update(
                    { status: 'INACTIVE', isActive: false },
                    { where: { academicYearId: rule.academicYearId, appliesTo: 'ALL', id: { [Op.ne]: rule.id } }, transaction: t }
                );
            }

            rule.status = 'ACTIVE';
            rule.isActive = true;
            rule.updatedBy = req.user.id;
            rule.updatedByName = updaterName;
            await rule.save({ transaction: t });
        });

        return success(res, { rule }, 'Leave rule activated successfully');
    } catch (err) { next(err); }
};

/**
 * PATCH /api/teacher-leaves/rules/:id/deactivate
 * Mark a leave rule as INACTIVE
 */
export const deactivateLeaveRule = async (req, res, next) => {
    try {
        const rule = await db.LeaveRule.findByPk(req.params.id);
        if (!rule) return error(res, 'Leave rule not found', 404);

        const currentUser = await db.User.findByPk(req.user.id);
        const updaterName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}`.trim() : 'Authorized Admin';

        rule.status = 'INACTIVE';
        rule.isActive = false;
        rule.updatedBy = req.user.id;
        rule.updatedByName = updaterName;
        await rule.save();

        return success(res, { rule }, 'Leave rule deactivated successfully');
    } catch (err) { next(err); }
};

/**
 * GET /api/teacher-leaves/rules/preview-quota
 * Preview how dynamic policy calculates quotas for a teacher / leave type
 */
export const previewLeaveQuota = async (req, res, next) => {
    try {
        const { teacherId, leaveTypeCode, asOfDate, academicYearId } = req.query;

        let resolvedTeacherId = teacherId;
        if (!resolvedTeacherId) {
            const selfTeacher = await getTeacherForUser(req.user.id);
            if (selfTeacher) resolvedTeacherId = selfTeacher.id;
        }

        const quota = await leaveService.calculateDynamicLeaveQuota({
            teacherId: resolvedTeacherId,
            leaveTypeCode: leaveTypeCode || 'CL',
            asOfDate: asOfDate || new Date(),
            academicYearId,
        });

        return success(res, { quota });
    } catch (err) { next(err); }
};

