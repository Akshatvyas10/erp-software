'use strict';
import { ClassroomConfigService } from '../services/classroomConfigService.js';
import { success, error } from '../utils/apiResponse.js';

// ── Blocks ──────────────────────────────────────────────────────────
export const getBlocks = async (req, res, next) => {
    try {
        const blocks = await ClassroomConfigService.listBlocks();
        return success(res, { blocks });
    } catch (err) { next(err); }
};

export const createBlock = async (req, res, next) => {
    try {
        const { name, code, description, status } = req.body;
        if (!name || !code) return error(res, 'Name and Code are required', 400);
        const block = await ClassroomConfigService.createBlock({ name, code: code.toUpperCase(), description, status });
        return success(res, { block }, 'Block created successfully', 201);
    } catch (err) { next(err); }
};

export const updateBlock = async (req, res, next) => {
    try {
        const block = await ClassroomConfigService.updateBlock(req.params.id, req.body);
        return success(res, { block }, 'Block updated successfully');
    } catch (err) { next(err); }
};

export const deleteBlock = async (req, res, next) => {
    try {
        await ClassroomConfigService.deleteBlock(req.params.id);
        return success(res, null, 'Block deleted successfully');
    } catch (err) { next(err); }
};

// ── Rooms ───────────────────────────────────────────────────────────
export const getRooms = async (req, res, next) => {
    try {
        const { blockId } = req.query;
        const rooms = await ClassroomConfigService.listRooms(blockId);
        return success(res, { rooms });
    } catch (err) { next(err); }
};

export const createRoom = async (req, res, next) => {
    try {
        const { blockId, roomNumber, capacity, roomType, floor, status } = req.body;
        if (!blockId || !roomNumber) return error(res, 'Block and Room Number are required', 400);
        const room = await ClassroomConfigService.createRoom({
            blockId,
            roomNumber,
            capacity: capacity ? parseInt(capacity, 10) : 40,
            roomType,
            floor,
            status
        });
        return success(res, { room }, 'Room created successfully', 201);
    } catch (err) { next(err); }
};

export const updateRoom = async (req, res, next) => {
    try {
        const room = await ClassroomConfigService.updateRoom(req.params.id, req.body);
        return success(res, { room }, 'Room updated successfully');
    } catch (err) { next(err); }
};

export const deleteRoom = async (req, res, next) => {
    try {
        await ClassroomConfigService.deleteRoom(req.params.id);
        return success(res, null, 'Room deleted successfully');
    } catch (err) { next(err); }
};

// ── Test & Exam Rules ───────────────────────────────────────────────
export const getTestExamRules = async (req, res, next) => {
    try {
        const { departmentId, academicYear } = req.query;
        const rules = await ClassroomConfigService.getTestExamRules(departmentId, academicYear);
        return success(res, { rules });
    } catch (err) { next(err); }
};

export const upsertTestExamRule = async (req, res, next) => {
    try {
        const { departmentId, academicYear, totalTestsPerYear, totalExamsPerYear, testFrequency, examFrequency, testTemplates, examTemplates, rulesDescription } = req.body;
        if (!departmentId) return error(res, 'Department is required', 400);

        const rule = await ClassroomConfigService.upsertTestExamRule({
            departmentId,
            academicYear: academicYear || '2026-2027',
            totalTestsPerYear: totalTestsPerYear ? parseInt(totalTestsPerYear, 10) : 6,
            totalExamsPerYear: totalExamsPerYear ? parseInt(totalExamsPerYear, 10) : 3,
            testFrequency: testFrequency || 'MONTHLY',
            examFrequency: examFrequency || 'QUARTERLY',
            testTemplates: testTemplates || [],
            examTemplates: examTemplates || [],
            rulesDescription,
            isActive: true
        });

        return success(res, { rule }, 'Evaluation rules saved successfully');
    } catch (err) { next(err); }
};

// ── Provision Classroom with Configuration & Targeted Calendar Events ─
export const configureClassroom = async (req, res, next) => {
    try {
        const creatorUserId = req.user.id;
        const result = await ClassroomConfigService.createConfiguredClassroom(req.body, creatorUserId);
        return success(res, result, 'Classroom configured and academic calendar updated successfully', 201);
    } catch (err) {
        return error(res, err.message, 400);
    }
};
