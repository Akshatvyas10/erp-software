'use strict';

/**
 * Centralized Role Constants & System Protection Policies
 * System roles are critical to ERP RBAC integrity and must never be deleted or renamed.
 */
export const SYSTEM_ROLES = Object.freeze({
    SUPER_ADMIN: 'super_admin',
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    STUDENT: 'student',
    TEACHER: 'teacher',
});

/**
 * Array of protected role names (normalized lowercase)
 */
export const PROTECTED_ROLES_LIST = Object.freeze([
    'super_admin',
    'superadmin',
    'admin',
    'student',
    'teacher'
]);

/**
 * Checks whether a given role name or slug is a protected system role
 * @param {string} roleName 
 * @returns {boolean}
 */
export const isProtectedRole = (roleName) => {
    if (!roleName || typeof roleName !== 'string') return false;
    const normalized = roleName.trim().toLowerCase().replace(/[\s-]+/g, '_');
    return PROTECTED_ROLES_LIST.includes(normalized) || PROTECTED_ROLES_LIST.includes(roleName.trim().toLowerCase());
};

export default {
    SYSTEM_ROLES,
    PROTECTED_ROLES_LIST,
    isProtectedRole
};
