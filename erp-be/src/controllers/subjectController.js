import db from '../models/index.js';
const { Subject } = db;
import { success, error } from '../utils/apiResponse.js';

// ── GET /api/subjects ────────────────────────────────────────────────────────
const getAllSubjects = async (req, res, next) => {
    try {
        const subjects = await Subject.findAll({
            order: [['name', 'ASC']]
        });
        return success(res, { subjects });
    } catch (err) { next(err); }
};

// ── GET /api/subjects/:id ────────────────────────────────────────────────────
const getSubjectById = async (req, res, next) => {
    try {
        const subject = await Subject.findByPk(req.params.id);
        if (!subject) return error(res, 'Subject not found', 404);
        return success(res, { subject });
    } catch (err) { next(err); }
};

// ── POST /api/subjects ───────────────────────────────────────────────────────
const createSubject = async (req, res, next) => {
    try {
        let { code, name, type, description, isActive } = req.body;

        if (!code) {
            const prefix = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'SUB';
            let random = Math.floor(100 + Math.random() * 900);
            code = `${prefix}${random}`;
            
            // Ensure unique code
            while (await Subject.findOne({ where: { code } })) {
                random = Math.floor(100 + Math.random() * 900);
                code = `${prefix}${random}`;
            }
        }

        const existing = await Subject.findOne({ where: { code } });
        if (existing) return error(res, 'Subject code already exists', 409);

        const subject = await Subject.create({
            code, name, type, description, isActive
        });

        return success(res, { subject }, 'Subject created', 201);
    } catch (err) { next(err); }
};

// ── PUT /api/subjects/:id ────────────────────────────────────────────────────
const updateSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findByPk(req.params.id);
        if (!subject) return error(res, 'Subject not found', 404);

        const { code, name, type, description, isActive } = req.body;
        
        if (code && code !== subject.code) {
            const existing = await Subject.findOne({ where: { code } });
            if (existing) return error(res, 'Subject code already exists', 409);
        }

        await subject.update({ code, name, type, description, isActive });
        return success(res, { subject }, 'Subject updated');
    } catch (err) { next(err); }
};

// ── DELETE /api/subjects/:id ─────────────────────────────────────────────────
const deleteSubject = async (req, res, next) => {
    try {
        const subject = await Subject.findByPk(req.params.id);
        if (!subject) return error(res, 'Subject not found', 404);
        
        await subject.destroy();
        return success(res, null, 'Subject deleted');
    } catch (err) { next(err); }
};

export {
    getAllSubjects,
    getSubjectById,
    createSubject,
    updateSubject,
    deleteSubject,
};
