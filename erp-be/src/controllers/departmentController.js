import db from '../models/index.js';
const { Department, Teacher, User } = db;
import { success, error } from '../utils/apiResponse.js';

/** GET /api/departments */
const listDepartments = async (req, res, next) => {
    try {
        const departments = await Department.findAll({
            include: [{
                model: Teacher,
                as: 'head',
                attributes: ['id', 'teacherId', 'employeeNumber'],
                include: [{
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName', 'email']
                }]
            }],
            order: [['name', 'ASC']]
        });
        return success(res, { departments });
    } catch (err) { next(err); }
};

/** POST /api/departments */
const createDepartment = async (req, res, next) => {
    try {
        const { name, headId } = req.body;
        if (!name) return error(res, 'Department name is required', 400);

        const existing = await Department.findOne({ where: { name } });
        if (existing) return error(res, 'Department already exists', 409);

        const department = await Department.create({ name, headId: headId || null });
        
        const created = await Department.findByPk(department.id, {
            include: [{
                model: Teacher,
                as: 'head',
                attributes: ['id', 'teacherId'],
                include: [{
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName']
                }]
            }]
        });

        return success(res, { department: created }, 'Department created', 201);
    } catch (err) { next(err); }
};

/** PUT /api/departments/:id */
const updateDepartment = async (req, res, next) => {
    try {
        const { name, headId } = req.body;
        const department = await Department.findByPk(req.params.id);
        if (!department) return error(res, 'Department not found', 404);

        if (name && name !== department.name) {
            const existing = await Department.findOne({ where: { name } });
            if (existing) return error(res, 'Department name already exists', 409);
        }

        await department.update({
            name: name || department.name,
            headId: headId !== undefined ? headId : department.headId
        });

        const updated = await Department.findByPk(department.id, {
            include: [{
                model: Teacher,
                as: 'head',
                attributes: ['id', 'teacherId'],
                include: [{
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName']
                }]
            }]
        });

        return success(res, { department: updated }, 'Department updated');
    } catch (err) { next(err); }
};

/** DELETE /api/departments/:id */
const deleteDepartment = async (req, res, next) => {
    try {
        const department = await Department.findByPk(req.params.id);
        if (!department) return error(res, 'Department not found', 404);
        await department.destroy();
        return success(res, null, 'Department deleted');
    } catch (err) { next(err); }
};

export { listDepartments, createDepartment, updateDepartment, deleteDepartment };
