'use strict';

import { z } from 'zod';
import * as idCardService from '../services/idCard.service.js';
import { success, error } from '../utils/apiResponse.js';
import db from '../models/index.js';
const { Classroom } = db;

export const generateStudentCardsSchema = z.object({
    classroomId: z.string().uuid().optional(),
    studentIds: z.array(z.string().uuid()).optional(),
    templateId: z.string().uuid().optional()
});

export const generateTeacherCardsSchema = z.object({
    teacherIds: z.array(z.string().uuid()).optional(),
    templateId: z.string().uuid().optional()
});

/**
 * Generate Student ID Cards (Single / Bulk from Classroom)
 */
export const generateStudentIdCards = async (req, res, next) => {
    try {
        const { classroomId, studentIds, templateId } = req.body;
        const userRoles = (req.userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = userRoles.some(r => ['super_admin', 'admin', 'principal'].includes(r));

        // RBAC / Scope Check:
        // If not admin/principal, verify Class Teacher or Dept Incharge scope
        if (!isPrivileged && classroomId) {
            const teacherId = req.user.teacherId;
            if (!teacherId) {
                return error(res, 'Teacher profile required to generate class ID cards', 403);
            }

            const classroom = await Classroom.findByPk(classroomId);
            if (!classroom) {
                return error(res, 'Classroom not found', 404);
            }

            // Check if user is the assigned Class Teacher
            if (classroom.classTeacherId !== teacherId) {
                return error(res, 'Forbidden: You can only generate ID cards for your own assigned classroom', 403);
            }
        }

        const result = await idCardService.generateStudentIdCards({
            classroomId,
            studentIds,
            templateId,
            issuedById: req.user.id,
            actor: req.user
        });

        return success(res, result, `Generated ${result.total} student ID cards successfully`);
    } catch (err) {
        next(err);
    }
};

/**
 * Generate Teacher ID Cards
 */
export const generateTeacherIdCards = async (req, res, next) => {
    try {
        const { teacherIds, templateId } = req.body;
        const result = await idCardService.generateTeacherIdCards({
            teacherIds,
            templateId,
            issuedById: req.user.id
        });

        return success(res, result, `Generated ${result.total} teacher ID cards successfully`);
    } catch (err) {
        next(err);
    }
};

/**
 * Get Student's Own ID Card
 */
export const getMyIdCard = async (req, res, next) => {
    try {
        const result = await idCardService.getMyStudentIdCard(req.user.id);
        return success(res, result, 'Student ID card fetched successfully');
    } catch (err) {
        next(err);
    }
};

/**
 * Get Issuance Audit Logs
 */
export const getIssuanceAuditLogs = async (req, res, next) => {
    try {
        const { documentType, limit = 50, page = 1 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const where = {};
        if (documentType) where.documentType = documentType;

        const { count, rows } = await db.IssuedDocument.findAndCountAll({
            where,
            include: [
                {
                    model: db.User,
                    as: 'issuer',
                    attributes: ['id', 'firstName', 'lastName', 'email']
                },
                {
                    model: db.DocumentTemplate,
                    as: 'template',
                    attributes: ['id', 'name', 'type', 'paperSize']
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: Number(limit),
            offset
        });

        return success(res, { logs: rows, total: count, page: Number(page) }, 'Audit logs fetched');
    } catch (err) {
        next(err);
    }
};
