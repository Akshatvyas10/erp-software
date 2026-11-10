'use strict';

import { z } from 'zod';
import * as documentTemplateService from '../services/documentTemplate.service.js';
import { success, error } from '../utils/apiResponse.js';

export const createTemplateSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(150),
    description: z.string().optional().nullable(),
    type: z.enum([
        'STUDENT_ID_CARD',
        'TEACHER_ID_CARD',
        'REPORT_CARD',
        'TRANSFER_CERTIFICATE',
        'LEAVING_CERTIFICATE',
        'BONAFIDE_CERTIFICATE',
        'CHARACTER_CERTIFICATE',
        'FEE_RECEIPT',
        'CUSTOM'
    ]),
    status: z.enum(['DRAFT', 'ACTIVE', 'INACTIVE']).default('DRAFT'),
    paperSize: z.enum(['CR80', 'A4', 'A5', 'LETTER', 'CUSTOM']).default('A4'),
    orientation: z.enum(['PORTRAIT', 'LANDSCAPE']).default('PORTRAIT'),
    isDefault: z.boolean().default(false),
    designConfig: z.record(z.any()).default({}),
    selectedFields: z.array(z.any()).default([])
});

export const updateTemplateSchema = createTemplateSchema.partial();

export const getTemplates = async (req, res, next) => {
    try {
        const { type, status, search } = req.query;
        const templates = await documentTemplateService.getAllTemplates({ type, status, search });
        return success(res, { templates }, 'Templates fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const getTemplateById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await documentTemplateService.getTemplateById(id);
        if (!template) {
            return error(res, 'Template not found', 404);
        }
        return success(res, { template }, 'Template fetched successfully');
    } catch (err) {
        next(err);
    }
};

export const createTemplate = async (req, res, next) => {
    try {
        const parsed = createTemplateSchema.parse(req.body);
        const template = await documentTemplateService.createTemplate(parsed, req.user.id);
        return success(res, { template }, 'Template created successfully', 201);
    } catch (err) {
        if (err instanceof z.ZodError) {
            return error(res, err.errors[0].message, 400);
        }
        next(err);
    }
};

export const updateTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const parsed = updateTemplateSchema.parse(req.body);
        const template = await documentTemplateService.updateTemplate(id, parsed, req.user.id);
        return success(res, { template }, 'Template updated successfully');
    } catch (err) {
        if (err instanceof z.ZodError) {
            return error(res, err.errors[0].message, 400);
        }
        next(err);
    }
};

export const duplicateTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const copy = await documentTemplateService.duplicateTemplate(id, req.user.id);
        return success(res, { template: copy }, 'Template duplicated successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const setDefaultTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        const template = await documentTemplateService.setDefaultTemplate(id, req.user.id);
        return success(res, { template }, 'Default template set successfully');
    } catch (err) {
        next(err);
    }
};

export const deleteTemplate = async (req, res, next) => {
    try {
        const { id } = req.params;
        await documentTemplateService.deleteTemplate(id);
        return success(res, null, 'Template deleted successfully');
    } catch (err) {
        return error(res, err.message, 400);
    }
};
