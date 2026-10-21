/**
 * Centralized Permission Constants (Single Source of Truth)
 * Matches backend permissions.js exactly.
 */
export const PERMISSIONS = {
    CLASSROOMS: {
        READ: "classrooms:read",
        CREATE: "classrooms:create",
        UPDATE: "classrooms:update",
        DELETE: "classrooms:delete",
        MANAGE: "classrooms:manage",
    },
    STUDENTS: {
        READ: "students:read",
        CREATE: "students:create",
        UPDATE: "students:update",
        DELETE: "students:delete",
        MANAGE: "students:manage",
    },
    HOMEWORK: {
        READ: "homework:read",
        CREATE: "homework:create",
        UPDATE: "homework:update",
        DELETE: "homework:delete",
    },
    EXAMS: {
        READ: "exams:read",
        CREATE: "exams:create",
        UPDATE: "exams:update",
        MANAGE: "exams:manage",
    },
    ATTENDANCE: {
        READ: "attendance:read",
        CREATE: "attendance:create",
        UPDATE: "attendance:update",
        MANAGE: "attendance:manage",
    },
    DEPARTMENTS: {
        READ: "departments:read",
        CREATE: "departments:create",
        UPDATE: "departments:update",
        DELETE: "departments:delete",
        MANAGE: "departments:manage",
    },
    TEACHERS: {
        READ: "teachers:read",
        CREATE: "teachers:create",
        UPDATE: "teachers:update",
        DELETE: "teachers:delete",
        MANAGE: "teachers:manage",
    },
    ALL: {
        MANAGE: "all:manage",
    },
} as const;

export type PermissionKey =
    | typeof PERMISSIONS.CLASSROOMS[keyof typeof PERMISSIONS.CLASSROOMS]
    | typeof PERMISSIONS.STUDENTS[keyof typeof PERMISSIONS.STUDENTS]
    | typeof PERMISSIONS.HOMEWORK[keyof typeof PERMISSIONS.HOMEWORK]
    | typeof PERMISSIONS.EXAMS[keyof typeof PERMISSIONS.EXAMS]
    | typeof PERMISSIONS.ATTENDANCE[keyof typeof PERMISSIONS.ATTENDANCE]
    | typeof PERMISSIONS.DEPARTMENTS[keyof typeof PERMISSIONS.DEPARTMENTS]
    | typeof PERMISSIONS.TEACHERS[keyof typeof PERMISSIONS.TEACHERS]
    | typeof PERMISSIONS.ALL[keyof typeof PERMISSIONS.ALL];
