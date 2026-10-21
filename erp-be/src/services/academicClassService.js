'use strict';
import { Op } from 'sequelize';
import db from '../models/index.js';
const {
    sequelize,
    AcademicClass,
    Classroom,
    ClassroomStudent,
    ClassroomSubject,
    Teacher,
    User,
    Department,
    ClassroomRoom,
    BuildingBlock
} = db;

const teacherAccount = () => ({
    model: User,
    as: 'account',
    attributes: ['id', 'userId', 'firstName', 'lastName']
});

export const PREDEFINED_ALLOWED_CLASSES = [
    { code: 'NURSERY', name: 'Nursery', sequenceOrder: 1, departmentCategory: 'Pre-Primary' },
    { code: 'KG1', name: 'KG 1', sequenceOrder: 2, departmentCategory: 'Pre-Primary' },
    { code: 'KG2', name: 'KG 2', sequenceOrder: 3, departmentCategory: 'Pre-Primary' },
    { code: 'CLASS_1', name: 'Class 1', sequenceOrder: 4, departmentCategory: 'Primary' },
    { code: 'CLASS_2', name: 'Class 2', sequenceOrder: 5, departmentCategory: 'Primary' },
    { code: 'CLASS_3', name: 'Class 3', sequenceOrder: 6, departmentCategory: 'Primary' },
    { code: 'CLASS_4', name: 'Class 4', sequenceOrder: 7, departmentCategory: 'Primary' },
    { code: 'CLASS_5', name: 'Class 5', sequenceOrder: 8, departmentCategory: 'Primary' },
    { code: 'CLASS_6', name: 'Class 6', sequenceOrder: 9, departmentCategory: 'Middle' },
    { code: 'CLASS_7', name: 'Class 7', sequenceOrder: 10, departmentCategory: 'Middle' },
    { code: 'CLASS_8', name: 'Class 8', sequenceOrder: 11, departmentCategory: 'Middle' },
    { code: 'CLASS_9', name: 'Class 9', sequenceOrder: 12, departmentCategory: 'Secondary' },
    { code: 'CLASS_10', name: 'Class 10', sequenceOrder: 13, departmentCategory: 'Secondary' },
    { code: 'CLASS_11', name: 'Class 11', sequenceOrder: 14, departmentCategory: 'Senior Secondary' },
    { code: 'CLASS_12', name: 'Class 12', sequenceOrder: 15, departmentCategory: 'Senior Secondary' },
];

export const findPredefinedClass = (identifier) => {
    if (!identifier) return null;
    const clean = String(identifier).toUpperCase().trim().replace(/[^A-Z0-9]/g, '');
    return PREDEFINED_ALLOWED_CLASSES.find(c => {
        const cCodeClean = c.code.replace(/[^A-Z0-9]/g, '');
        const cNameClean = c.name.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return cCodeClean === clean || cNameClean === clean;
    }) || null;
};

export class AcademicClassService {
    /**
     * Check if classes are configured in the school.
     */
    static async checkSetupStatus() {
        const count = await AcademicClass.count();
        return {
            isInitialized: count > 0,
            classCount: count
        };
    }

    /**
     * List all academic classes with their sections and enrollment numbers.
     */
    static async listClasses({ search = '', status = '', academicYear = '', departmentId = '' }, user, userRoles = []) {
        const rolesLower = (userRoles || []).map(r => String(r).toLowerCase());
        const isPrivileged = rolesLower.some(r => ['admin', 'super_admin', 'principal'].includes(r));
        const isStandardTeacher = !isPrivileged && rolesLower.includes('teacher');
        const isStudent = !isPrivileged && rolesLower.includes('student');

        const classWhere = {};
        if (status) classWhere.status = status;
        if (departmentId && departmentId !== 'all') {
            classWhere.departmentId = departmentId;
        }
        if (search) {
            classWhere[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { code: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const sectionWhere = {};
        if (academicYear) sectionWhere.academicYear = academicYear;

        // If teacher, find which section IDs they are assigned to
        let teacherAssignedSectionIds = [];
        if (isStandardTeacher && user?.teacherId) {
            const subjectClassroomIds = await ClassroomSubject.findAll({
                where: { teacherId: user.teacherId },
                attributes: ['classroomId'],
                raw: true
            }).then(rows => rows.map(r => r.classroomId));

            const classTeacherSectionIds = await Classroom.findAll({
                where: { classTeacherId: user.teacherId },
                attributes: ['id'],
                raw: true
            }).then(rows => rows.map(r => r.id));

            // Find departments where this teacher is Incharge
            const headedDepts = await Department.findAll({
                where: { headId: user.teacherId },
                attributes: ['id'],
                raw: true
            });
            const headedDeptIds = headedDepts.map(d => d.id);

            let deptSectionIds = [];
            if (headedDeptIds.length > 0) {
                const classesInDept = await AcademicClass.findAll({
                    where: { departmentId: { [Op.in]: headedDeptIds } },
                    attributes: ['id'],
                    raw: true
                });
                const classIdsInDept = classesInDept.map(c => c.id);

                const deptClassrooms = await Classroom.findAll({
                    where: {
                        [Op.or]: [
                            { departmentId: { [Op.in]: headedDeptIds } },
                            ...(classIdsInDept.length > 0 ? [{ classId: { [Op.in]: classIdsInDept } }] : [])
                        ]
                    },
                    attributes: ['id'],
                    raw: true
                });
                deptSectionIds = deptClassrooms.map(r => r.id);
            }

            teacherAssignedSectionIds = [...new Set([...subjectClassroomIds, ...classTeacherSectionIds, ...deptSectionIds])];

            // Constrain sections to assigned sections
            sectionWhere.id = { [Op.in]: teacherAssignedSectionIds };
        }

        // If student, find enrolled section ID
        if (isStudent && user?.studentId) {
            const enrolledSectionIds = await ClassroomStudent.findAll({
                where: { studentId: user.studentId },
                attributes: ['classroomId'],
                raw: true
            }).then(rows => rows.map(r => r.classroomId));

            sectionWhere.id = { [Op.in]: enrolledSectionIds };
        }

        const classes = await AcademicClass.findAll({
            where: classWhere,
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'headId'],
                    include: [{
                        model: Teacher,
                        as: 'head',
                        attributes: ['id', 'teacherId'],
                        include: [teacherAccount()]
                    }]
                },
                {
                    model: Classroom,
                    as: 'sections',
                    where: Object.keys(sectionWhere).length > 0 ? sectionWhere : undefined,
                    required: (isStandardTeacher || isStudent), // Only show classes containing their sections
                    include: [
                        {
                            model: Teacher,
                            as: 'classTeacher',
                            attributes: ['id', 'teacherId'],
                            include: [teacherAccount()]
                        },
                        {
                            model: ClassroomRoom,
                            as: 'room',
                            attributes: ['id', 'roomNumber', 'capacity']
                        },
                        {
                            model: BuildingBlock,
                            as: 'buildingBlockRef',
                            attributes: ['id', 'name', 'code']
                        },
                        {
                            model: ClassroomStudent,
                            as: 'enrollments',
                            attributes: ['id']
                        }
                    ],
                    order: [['section', 'ASC']]
                }
            ],
            order: [
                ['orderIndex', 'ASC'],
                ['name', 'ASC']
            ]
        });

        // Enrich sections with student counts
        return classes.map(cls => {
            const plain = cls.toJSON();
            let totalClassStudents = 0;

            if (plain.department?.head) {
                plain.department.incharge = plain.department.head;
            }

            plain.sections = (plain.sections || []).map(sec => {
                const count = sec.enrollments?.length || 0;
                totalClassStudents += count;
                return {
                    ...sec,
                    studentCount: count,
                    isClassTeacher: isStandardTeacher && sec.classTeacherId === user?.teacherId,
                };
            });

            plain.totalStudents = totalClassStudents;
            plain.sectionCount = plain.sections.length;
            return plain;
        });
    }

    /**
     * Get a single academic class by ID with its sections.
     */
    static async getClassById(id) {
        const cls = await AcademicClass.findByPk(id, {
            include: [
                {
                    model: Department,
                    as: 'department',
                    attributes: ['id', 'name', 'headId'],
                    include: [{
                        model: Teacher,
                        as: 'head',
                        attributes: ['id', 'teacherId'],
                        include: [teacherAccount()]
                    }]
                },
                {
                    model: Classroom,
                    as: 'sections',
                    include: [
                        {
                            model: Teacher,
                            as: 'classTeacher',
                            attributes: ['id', 'teacherId'],
                            include: [teacherAccount()]
                        },
                        {
                            model: ClassroomRoom,
                            as: 'room',
                            attributes: ['id', 'roomNumber', 'capacity']
                        },
                        {
                            model: ClassroomStudent,
                            as: 'enrollments',
                            attributes: ['id']
                        }
                    ]
                }
            ],
            order: [[{ model: Classroom, as: 'sections' }, 'section', 'ASC']]
        });

        if (!cls) return null;

        const plain = cls.toJSON();
        plain.sections = (plain.sections || []).map(sec => ({
            ...sec,
            studentCount: sec.enrollments?.length || 0
        }));
        return plain;
    }

    /**
     * First-Time Onboarding: Bulk Provision Classes with their Departments and Incharges.
     * Sections are created ONLY if provided (otherwise left empty for manual creation later in Classroom module).
     */
    static async bulkSetupClasses({ classes = [], defaultSections = [], departments = {}, academicYear = '2026-2027' }) {
        if (!classes || classes.length === 0) {
            throw new Error('At least one class must be selected for setup');
        }

        const t = await sequelize.transaction();

        try {
            // 1. Resolve or Create Departments and assign Incharge (headId)
            const deptMap = {}; // categoryName -> department.id
            const uniqueCategories = [...new Set(classes.map(c => c.category || c.departmentName).filter(Boolean))];

            for (const catName of uniqueCategories) {
                const inchargeId = departments[catName]?.inchargeId || null;
                const [dept] = await Department.findOrCreate({
                    where: { name: catName },
                    defaults: {
                        name: catName,
                        headId: inchargeId
                    },
                    transaction: t
                });

                // If department exists and an incharge is provided, update headId
                if (inchargeId && dept.headId !== inchargeId) {
                    dept.headId = inchargeId;
                    await dept.save({ transaction: t });
                }

                deptMap[catName] = dept.id;
            }

            const createdClasses = [];
            let totalSectionsCreated = 0;

            for (let i = 0; i < classes.length; i++) {
                const item = classes[i];
                const className = item.name.trim();
                const matched = findPredefinedClass(item.code || className);
                const canonicalName = matched ? matched.name : className;
                const canonicalCode = matched ? matched.code : (item.code || className).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
                const orderIndex = matched ? matched.sequenceOrder : (item.orderIndex !== undefined ? item.orderIndex : (i + 1));

                const category = item.category || (matched ? matched.departmentCategory : null);
                const resolvedDeptId = item.departmentId || (category ? deptMap[category] : null);

                // Create or Find Academic Class
                const [academicClass, created] = await AcademicClass.findOrCreate({
                    where: {
                        [Op.or]: [
                            { name: canonicalName },
                            { code: canonicalCode }
                        ]
                    },
                    defaults: {
                        name: canonicalName,
                        code: canonicalCode,
                        orderIndex,
                        departmentId: resolvedDeptId || null,
                        status: 'ACTIVE'
                    },
                    transaction: t
                });

                if (!created && resolvedDeptId && !academicClass.departmentId) {
                    academicClass.departmentId = resolvedDeptId;
                    await academicClass.save({ transaction: t });
                }

                createdClasses.push(academicClass);

                // 2. Create Sections ONLY if explicitly configured
                const sectionsToCreate = item.sections !== undefined ? item.sections : (defaultSections || []);
                for (const sec of sectionsToCreate) {
                    if (!sec) continue;
                    const sectionLetter = sec.toUpperCase().trim();
                    const sectionFullName = `${canonicalName} - ${sectionLetter}`;

                    await Classroom.findOrCreate({
                        where: {
                            classId: academicClass.id,
                            section: sectionLetter,
                            academicYear
                        },
                        defaults: {
                            classId: academicClass.id,
                            name: sectionFullName,
                            section: sectionLetter,
                            academicYear,
                            departmentId: academicClass.departmentId,
                            maxCapacity: 40,
                            status: 'ACTIVE'
                        },
                        transaction: t
                    });
                    totalSectionsCreated++;
                }
            }

            await t.commit();

            // Maintain strict progression ordering across all classes
            await AcademicClassService.resequenceAllClasses();

            return {
                classesCount: createdClasses.length,
                sectionsCount: totalSectionsCreated,
                academicYear
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Resequence all classes by their fixed predefined sequenceOrder.
     * Ensures consecutive 1, 2, 3... order index for school progression.
     */
     static async resequenceAllClasses() {
        const classes = await AcademicClass.findAll();
        if (classes.length === 0) return;

        classes.sort((a, b) => {
            const defA = findPredefinedClass(a.code) || findPredefinedClass(a.name);
            const defB = findPredefinedClass(b.code) || findPredefinedClass(b.name);
            const seqA = defA ? defA.sequenceOrder : a.orderIndex;
            const seqB = defB ? defB.sequenceOrder : b.orderIndex;
            return seqA - seqB;
        });

        for (let i = 0; i < classes.length; i++) {
            const targetIndex = i + 1;
            if (classes[i].orderIndex !== targetIndex) {
                classes[i].orderIndex = targetIndex;
                await classes[i].save();
            }
        }
    }

    /**
     * Create a single Academic Class.
     * Hard Rule: Only Predefined Allowed Classes (No Custom).
     */
    static async createClass(data) {
        const { name, code, departmentId, status } = data;
        const lookupKey = code || name;
        const matched = findPredefinedClass(lookupKey);

        if (!matched) {
            throw new Error(`Custom classes are not allowed. Please select one of the standard classes: ${PREDEFINED_ALLOWED_CLASSES.map(c => c.name).join(', ')}`);
        }

        const canonicalName = matched.name;
        const canonicalCode = matched.code;

        // Prevent duplicate creation of same class
        const existing = await AcademicClass.findOne({
            where: {
                [Op.or]: [
                    { name: canonicalName },
                    { code: canonicalCode }
                ]
            }
        });

        if (existing) {
            throw new Error(`Class "${canonicalName}" is already configured in the school structure.`);
        }

        const academicClass = await AcademicClass.create({
            name: canonicalName,
            code: canonicalCode,
            orderIndex: matched.sequenceOrder,
            departmentId: departmentId || null,
            status: status || 'ACTIVE'
        });

        // Maintain strict, deterministic sequence order across all classes
        await AcademicClassService.resequenceAllClasses();

        return academicClass;
    }

    /**
     * Update an Academic Class.
     */
    static async updateClass(id, data) {
        const academicClass = await AcademicClass.findByPk(id);
        if (!academicClass) {
            throw new Error('Academic Class not found');
        }

        const { name, code, orderIndex, departmentId, status } = data;
        if (name) {
            const normalizedName = name.trim();
            const cleanName = normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const existingClasses = await AcademicClass.findAll({
                where: { id: { [Op.ne]: id } },
                attributes: ['id', 'name', 'code']
            });
            const duplicate = existingClasses.find(c => {
                const existingClean = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
                return existingClean === cleanName;
            });
            if (duplicate) {
                throw new Error(`A class with a similar name already exists ("${duplicate.name}"). Similar or duplicate names are not allowed.`);
            }
            academicClass.name = normalizedName;
        }

        if (code) {
            academicClass.code = code.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
        }
        if (orderIndex !== undefined) academicClass.orderIndex = orderIndex;
        if (departmentId !== undefined) academicClass.departmentId = departmentId || null;
        if (status) academicClass.status = status;

        await academicClass.save();
        return academicClass;
    }

    /**
     * Delete an Academic Class (safely checks for active enrollments).
     */
    static async deleteClass(id) {
        const t = await sequelize.transaction();
        try {
            const academicClass = await AcademicClass.findByPk(id, {
                include: [{ model: Classroom, as: 'sections', attributes: ['id'] }],
                transaction: t
            });

            if (!academicClass) {
                const err = new Error('Academic Class not found');
                err.statusCode = 404;
                throw err;
            }

            const sectionIds = (academicClass.sections || []).map(s => s.id);
            if (sectionIds.length > 0) {
                const studentCount = await ClassroomStudent.count({
                    where: { classroomId: { [Op.in]: sectionIds } },
                    transaction: t
                });

                if (studentCount > 0) {
                    const err = new Error(`Cannot delete class "${academicClass.name}". There are ${studentCount} students actively enrolled in its sections.`);
                    err.statusCode = 409;
                    throw err;
                }

                // Soft-delete empty sections within transaction
                await Classroom.destroy({
                    where: { id: { [Op.in]: sectionIds } },
                    transaction: t
                });
            }

            await academicClass.destroy({ transaction: t });
            await t.commit();
            return true;
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }

    /**
     * Get the immediate next academic class in the school progression sequence.
     */
    static async getNextClass(currentClassId) {
        const currentClass = await AcademicClass.findByPk(currentClassId);
        if (!currentClass) {
            const err = new Error('Current academic class not found');
            err.statusCode = 404;
            throw err;
        }

        const nextClass = await AcademicClass.findOne({
            where: {
                orderIndex: { [Op.gt]: currentClass.orderIndex },
                status: 'ACTIVE'
            },
            order: [['orderIndex', 'ASC']],
            include: [{
                model: Classroom,
                as: 'sections',
                where: { status: 'ACTIVE' },
                required: false
            }]
        });

        return {
            currentClass,
            nextClass,
            isFinalClass: !nextClass
        };
    }

    /**
     * Apply a School Structure Preset (PRIMARY_5, MIDDLE_8, SECONDARY_10, SENIOR_SECONDARY_12).
     * Synchronizes and seeds academic classes in strict sequence order.
     */
    static async applySchoolStructurePreset(structureType, academicYear = '2026-2027') {
        const presets = {
            PRIMARY_5: [
                { name: 'Nursery', code: 'NURSERY', orderIndex: 1 },
                { name: 'LKG', code: 'LKG', orderIndex: 2 },
                { name: 'UKG', code: 'UKG', orderIndex: 3 },
                { name: 'Class 1', code: 'CLASS_1', orderIndex: 4 },
                { name: 'Class 2', code: 'CLASS_2', orderIndex: 5 },
                { name: 'Class 3', code: 'CLASS_3', orderIndex: 6 },
                { name: 'Class 4', code: 'CLASS_4', orderIndex: 7 },
                { name: 'Class 5', code: 'CLASS_5', orderIndex: 8 }
            ],
            MIDDLE_8: [
                { name: 'Nursery', code: 'NURSERY', orderIndex: 1 },
                { name: 'LKG', code: 'LKG', orderIndex: 2 },
                { name: 'UKG', code: 'UKG', orderIndex: 3 },
                { name: 'Class 1', code: 'CLASS_1', orderIndex: 4 },
                { name: 'Class 2', code: 'CLASS_2', orderIndex: 5 },
                { name: 'Class 3', code: 'CLASS_3', orderIndex: 6 },
                { name: 'Class 4', code: 'CLASS_4', orderIndex: 7 },
                { name: 'Class 5', code: 'CLASS_5', orderIndex: 8 },
                { name: 'Class 6', code: 'CLASS_6', orderIndex: 9 },
                { name: 'Class 7', code: 'CLASS_7', orderIndex: 10 },
                { name: 'Class 8', code: 'CLASS_8', orderIndex: 11 }
            ],
            SECONDARY_10: [
                { name: 'Nursery', code: 'NURSERY', orderIndex: 1 },
                { name: 'LKG', code: 'LKG', orderIndex: 2 },
                { name: 'UKG', code: 'UKG', orderIndex: 3 },
                { name: 'Class 1', code: 'CLASS_1', orderIndex: 4 },
                { name: 'Class 2', code: 'CLASS_2', orderIndex: 5 },
                { name: 'Class 3', code: 'CLASS_3', orderIndex: 6 },
                { name: 'Class 4', code: 'CLASS_4', orderIndex: 7 },
                { name: 'Class 5', code: 'CLASS_5', orderIndex: 8 },
                { name: 'Class 6', code: 'CLASS_6', orderIndex: 9 },
                { name: 'Class 7', code: 'CLASS_7', orderIndex: 10 },
                { name: 'Class 8', code: 'CLASS_8', orderIndex: 11 },
                { name: 'Class 9', code: 'CLASS_9', orderIndex: 12 },
                { name: 'Class 10', code: 'CLASS_10', orderIndex: 13 }
            ],
            SENIOR_SECONDARY_12: [
                { name: 'Nursery', code: 'NURSERY', orderIndex: 1 },
                { name: 'LKG', code: 'LKG', orderIndex: 2 },
                { name: 'UKG', code: 'UKG', orderIndex: 3 },
                { name: 'Class 1', code: 'CLASS_1', orderIndex: 4 },
                { name: 'Class 2', code: 'CLASS_2', orderIndex: 5 },
                { name: 'Class 3', code: 'CLASS_3', orderIndex: 6 },
                { name: 'Class 4', code: 'CLASS_4', orderIndex: 7 },
                { name: 'Class 5', code: 'CLASS_5', orderIndex: 8 },
                { name: 'Class 6', code: 'CLASS_6', orderIndex: 9 },
                { name: 'Class 7', code: 'CLASS_7', orderIndex: 10 },
                { name: 'Class 8', code: 'CLASS_8', orderIndex: 11 },
                { name: 'Class 9', code: 'CLASS_9', orderIndex: 12 },
                { name: 'Class 10', code: 'CLASS_10', orderIndex: 13 },
                { name: 'Class 11', code: 'CLASS_11', orderIndex: 14 },
                { name: 'Class 12', code: 'CLASS_12', orderIndex: 15 }
            ]
        };

        const targetClasses = presets[structureType];
        if (!targetClasses) {
            const err = new Error(`Invalid structure preset: ${structureType}. Supported: PRIMARY_5, MIDDLE_8, SECONDARY_10, SENIOR_SECONDARY_12`);
            err.statusCode = 422;
            throw err;
        }

        const t = await sequelize.transaction();
        try {
            const createdClasses = [];
            for (const item of targetClasses) {
                const [cls] = await AcademicClass.findOrCreate({
                    where: { name: item.name },
                    defaults: {
                        name: item.name,
                        code: item.code,
                        orderIndex: item.orderIndex,
                        status: 'ACTIVE'
                    },
                    transaction: t
                });

                // Ensure order index matches sequence
                if (cls.orderIndex !== item.orderIndex) {
                    cls.orderIndex = item.orderIndex;
                    await cls.save({ transaction: t });
                }

                // Create default Section A for each class if no sections exist
                const existingSections = await Classroom.count({
                    where: { classId: cls.id },
                    transaction: t
                });

                if (existingSections === 0) {
                    await Classroom.create({
                        classId: cls.id,
                        name: cls.name,
                        section: 'A',
                        academicYear,
                        status: 'ACTIVE',
                        maxCapacity: 40
                    }, { transaction: t });
                }

                createdClasses.push(cls);
            }

            await t.commit();
            return {
                structureType,
                classesCount: createdClasses.length,
                classes: createdClasses
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    }
}
