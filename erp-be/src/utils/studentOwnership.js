import { Op } from 'sequelize';
import db from '../models/index.js';
import ApiError from './ApiError.js';

const { Student, User } = db;

/**
 * Resolves all accessible student IDs for the authenticated user:
 * - If user is Admin / Super Admin / Accountant / Faculty with fees:read -> null (unrestricted)
 * - If user is Student -> [own studentProfile.id]
 * - If user is Parent / Guardian -> all student IDs matching guardianEmail or guardianPhone
 */
export const getAccessibleStudentIdsForUser = async (user, userRoles = []) => {
    if (!user) return [];

    const rawRoles = [
        ...(Array.isArray(userRoles) ? userRoles : []),
        ...(Array.isArray(user.roles) ? user.roles : []),
        ...(Array.isArray(user.Roles) ? user.Roles : [])
    ];
    const roleNames = rawRoles.map((r) =>
        (typeof r === 'string' ? r : r.name || '').toLowerCase()
    );

    // Administrative roles have broad access
    const isStaffOrAdmin = roleNames.some((r) =>
        ['admin', 'super_admin', 'superadmin', 'accountant', 'faculty', 'principal'].includes(r)
    );
    if (isStaffOrAdmin) {
        return null; // Null means unrestricted access
    }

    const studentIds = new Set();

    // 1. Direct student user linkage
    if (user.studentProfile?.id) {
        studentIds.add(user.studentProfile.id);
    }
    if (user.studentId) {
        studentIds.add(user.studentId);
    }

    // 2. Lookup student by userId
    const directStudent = await Student.findOne({
        where: { userId: user.id },
        attributes: ['id'],
    });
    if (directStudent) {
        studentIds.add(directStudent.id);
    }

    // 3. Parent / Guardian lookup (matches guardianEmail or phone)
    const guardianFilters = [];
    if (user.email) {
        guardianFilters.push({ guardianEmail: user.email });
    }
    if (user.phone) {
        guardianFilters.push({ guardianPhone: user.phone });
    }

    if (guardianFilters.length > 0) {
        const wards = await Student.findAll({
            where: { [Op.or]: guardianFilters },
            attributes: ['id'],
        });
        wards.forEach((w) => studentIds.add(w.id));
    }

    return Array.from(studentIds);
};

/**
 * Asserts that the authenticated user has access to the target studentId.
 * Throws ApiError(403) if unauthorized.
 */
export const assertStudentOwnership = async (user, targetStudentId, userRoles = []) => {
    if (!targetStudentId) {
        throw new ApiError(400, 'Student ID is required');
    }

    const accessibleIds = await getAccessibleStudentIdsForUser(user, userRoles);
    if (accessibleIds === null) {
        return true; // Staff/Admin permitted
    }

    if (!accessibleIds.includes(targetStudentId)) {
        throw new ApiError(403, 'Access denied: You are only authorized to view your own billing records.');
    }

    return true;
};

export default {
    getAccessibleStudentIdsForUser,
    assertStudentOwnership,
};

