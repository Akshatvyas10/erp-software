'use strict';
import { AcademicClassService } from '../services/academicClassService.js';
import { success, error } from '../utils/apiResponse.js';

export const getPredefinedClasses = async (req, res, next) => {
    try {
        const { PREDEFINED_ALLOWED_CLASSES } = await import('../services/academicClassService.js');
        return success(res, { predefinedClasses: PREDEFINED_ALLOWED_CLASSES });
    } catch (err) {
        next(err);
    }
};

export const getSetupStatus = async (req, res, next) => {
    try {
        const status = await AcademicClassService.checkSetupStatus();
        return success(res, status);
    } catch (err) {
        next(err);
    }
};

export const listClasses = async (req, res, next) => {
    try {
        const { search, status, academicYear, departmentId } = req.query;
        const classes = await AcademicClassService.listClasses(
            { search, status, academicYear, departmentId },
            req.user,
            req.userRoles || []
        );
        return success(res, { classes });
    } catch (err) {
        next(err);
    }
};

export const getClass = async (req, res, next) => {
    try {
        const cls = await AcademicClassService.getClassById(req.params.id);
        if (!cls) return error(res, 'Academic Class not found', 404);
        return success(res, { class: cls });
    } catch (err) {
        next(err);
    }
};

export const bulkSetup = async (req, res, next) => {
    try {
        const { classes, defaultSections, academicYear } = req.body;
        const result = await AcademicClassService.bulkSetupClasses({
            classes,
            defaultSections,
            academicYear: academicYear || '2026-2027'
        });
        return success(res, result, 'Classes and sections created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const createClass = async (req, res, next) => {
    try {
        const academicClass = await AcademicClassService.createClass(req.body);
        return success(res, { class: academicClass }, 'Academic Class created successfully', 201);
    } catch (err) {
        next(err);
    }
};

export const updateClass = async (req, res, next) => {
    try {
        const academicClass = await AcademicClassService.updateClass(req.params.id, req.body);
        return success(res, { class: academicClass }, 'Academic Class updated successfully');
    } catch (err) {
        next(err);
    }
};

export const deleteClass = async (req, res, next) => {
    try {
        await AcademicClassService.deleteClass(req.params.id);
        return success(res, null, 'Academic Class and empty sections deleted successfully');
    } catch (err) {
        next(err);
    }
};

export const getNextClass = async (req, res, next) => {
    try {
        const result = await AcademicClassService.getNextClass(req.params.id);
        return success(res, result);
    } catch (err) {
        next(err);
    }
};

export const applyStructure = async (req, res, next) => {
    try {
        const { structureType, academicYear } = req.body;
        const result = await AcademicClassService.applySchoolStructurePreset(structureType, academicYear);
        return success(res, result, `School structure preset "${structureType}" applied successfully`);
    } catch (err) {
        next(err);
    }
};
