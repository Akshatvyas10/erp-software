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
     * First-Time Onboarding: Bulk Provision Classes and Default Sections.
     */
    static async bulkSetupClasses({ classes = [], defaultSections = ['A'], academicYear = '2026-2027' }) {
        if (!classes || classes.length === 0) {
            throw new Error('At least one class must be selected for setup');
        }

        const t = await sequelize.transaction();

        try {
            const createdClasses = [];
            let totalSectionsCreated = 0;

            for (let i = 0; i < classes.length; i++) {
                const item = classes[i];
                const className = item.name.trim();
                const code = (item.code || className).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30);
                const orderIndex = item.orderIndex !== undefined ? item.orderIndex : (i + 1);

                // 1. Create or Find Academic Class
                const [academicClass] = await AcademicClass.findOrCreate({
                    where: { name: className },
                    defaults: {
                        name: className,
                        code,
                        orderIndex,
                        departmentId: item.departmentId || null,
                        status: 'ACTIVE'
                    },
                    transaction: t
                });

                createdClasses.push(academicClass);

                // 2. Create Sections for this class
                const sectionsToCreate = item.sections || defaultSections || ['A'];
                for (const sec of sectionsToCreate) {
                    const sectionLetter = sec.toUpperCase().trim();
                    const sectionFullName = `${className} - ${sectionLetter}`;

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
     * Create a single Academic Class.
     */
    static async createClass(data) {
        const { name, code, orderIndex, departmentId, status } = data;
        const normalizedName = name ? name.trim() : '';
        if (!normalizedName) {
            throw new Error('Class name is required');
        }

        // Prevent similar or duplicate class names (case-insensitive & whitespace/symbol normalized)
        const cleanName = normalizedName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const existingClasses = await AcademicClass.findAll({ attributes: ['id', 'name', 'code'] });
        const duplicate = existingClasses.find(c => {
            const existingClean = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            return existingClean === cleanName;
        });

        if (duplicate) {
            throw new Error(`A class with a similar name already exists ("${duplicate.name}"). Similar or duplicate names are not allowed.`);
        }

        // Auto-generate clean unique code from name if not provided
        const baseCode = (code || normalizedName).toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 20) || 'CLASS';
        let normalizedCode = baseCode;
        if (existingClasses.some(c => c.code === normalizedCode)) {
            normalizedCode = `${baseCode.slice(0, 20)}_${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const count = await AcademicClass.count();
        const academicClass = await AcademicClass.create({
            name: normalizedName,
            code: normalizedCode,
            orderIndex: orderIndex || count + 1,
            departmentId: departmentId || null,
            status: status || 'ACTIVE'
        });

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
}
