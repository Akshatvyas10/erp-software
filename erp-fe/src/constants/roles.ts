/**
 * Centralized Role Constants & System Protection Policies (Frontend)
 * Synchronized with backend roles.js
 */
export const SYSTEM_ROLES = {
    SUPER_ADMIN: 'super_admin',
    SUPERADMIN: 'superadmin',
    ADMIN: 'admin',
    STUDENT: 'student',
    TEACHER: 'teacher',
} as const;

export const PROTECTED_ROLES_LIST = [
    'super_admin',
    'superadmin',
    'admin',
    'student',
    'teacher'
] as const;

export type ProtectedRole = typeof PROTECTED_ROLES_LIST[number];

/**
 * Checks whether a given role name or slug is a protected system role.
 */
export const isProtectedRole = (roleName?: string | null): boolean => {
    if (!roleName) return false;
    const normalized = roleName.trim().toLowerCase().replace(/[\s-]+/g, '_');
    return (
        PROTECTED_ROLES_LIST.includes(normalized as ProtectedRole) ||
        PROTECTED_ROLES_LIST.includes(roleName.trim().toLowerCase() as ProtectedRole)
    );
};

export default {
    SYSTEM_ROLES,
    PROTECTED_ROLES_LIST,
    isProtectedRole
};
