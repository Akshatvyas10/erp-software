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

        // Add incharge alias to each department object
        const result = departments.map(d => {
            const plain = d.toJSON();
            plain.incharge = plain.head;
            return plain;
        });

        return success(res, { departments: result });
    } catch (err) { next(err); }
};

/** POST /api/departments */
const createDepartment = async (req, res, next) => {
    try {
        const { name, headId, inchargeId } = req.body;
        if (!name) return error(res, 'Department name is required', 400);

        const assignedInchargeId = inchargeId !== undefined ? inchargeId : headId;

        const existing = await Department.findOne({ where: { name } });
        if (existing) return error(res, 'Department already exists', 409);

        const department = await Department.create({ name, headId: assignedInchargeId || null });
        
        const created = await Department.findByPk(department.id, {
            include: [{
                model: Teacher,
                as: 'head',
                attributes: ['id', 'teacherId', 'employeeNumber'],
                include: [{
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName', 'email']
                }]
            }]
        });

        const plain = created.toJSON();
        plain.incharge = plain.head;

        return success(res, { department: plain }, 'Department created', 201);
    } catch (err) { next(err); }
};

/** PUT /api/departments/:id */
const updateDepartment = async (req, res, next) => {
    try {
        const { name, headId, inchargeId } = req.body;
        const department = await Department.findByPk(req.params.id);
        if (!department) return error(res, 'Department not found', 404);

        if (name && name !== department.name) {
            const existing = await Department.findOne({ where: { name } });
            if (existing) return error(res, 'Department name already exists', 409);
        }

        const assignedInchargeId = inchargeId !== undefined ? inchargeId : headId;

        await department.update({
            name: name || department.name,
            headId: assignedInchargeId !== undefined ? (assignedInchargeId || null) : department.headId
        });

        const updated = await Department.findByPk(department.id, {
            include: [{
                model: Teacher,
                as: 'head',
                attributes: ['id', 'teacherId', 'employeeNumber'],
                include: [{
                    model: User,
                    as: 'account',
                    attributes: ['firstName', 'lastName', 'email']
                }]
            }]
        });

        const plain = updated.toJSON();
        plain.incharge = plain.head;

        return success(res, { department: plain }, 'Department updated');
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
