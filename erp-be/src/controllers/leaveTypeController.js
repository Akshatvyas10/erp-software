'use strict';

import db from '../models/index.js';
const { LeaveType } = db;
import { success, error } from '../utils/apiResponse.js';

export const listLeaveTypes = async (req, res, next) => {
    try {
        const where = {};
        if (req.query.activeOnly !== 'false') {
            where.isActive = true;
        }
        const types = await LeaveType.findAll({
            where,
            order: [['code', 'ASC']],
        });
        return success(res, { leaveTypes: types });
    } catch (err) { next(err); }
};

export const createLeaveType = async (req, res, next) => {
    try {
        const type = await LeaveType.create(req.body);
        return success(res, { leaveType: type }, 'Leave type created successfully', 201);
    } catch (err) { next(err); }
};

export const updateLeaveType = async (req, res, next) => {
    try {
        const type = await LeaveType.findByPk(req.params.id);
        if (!type) return error(res, 'Leave type not found', 404);

        await type.update(req.body);
        return success(res, { leaveType: type }, 'Leave type updated successfully');
    } catch (err) { next(err); }
};

export const toggleLeaveType = async (req, res, next) => {
    try {
        const type = await LeaveType.findByPk(req.params.id);
        if (!type) return error(res, 'Leave type not found', 404);

        await type.update({ isActive: !type.isActive });
        return success(res, { leaveType: type }, `Leave type ${type.isActive ? 'activated' : 'deactivated'}`);
    } catch (err) { next(err); }
};
