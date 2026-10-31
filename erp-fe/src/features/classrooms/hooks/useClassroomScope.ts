import { useMemo } from "react";
import { useAuth, usePermissions } from "@/store/hooks";
import type { Classroom } from "@/types/erp";

export interface ClassroomScopeResult {
    // Identity & Roles
    isSuperAdmin: boolean;
    isDepartmentIncharge: boolean;
    isClassTeacher: boolean;
    isSubjectTeacher: boolean;
    isStudentEnrolled: boolean;

    // Action Capabilities
    canEditClassroom: boolean;
    canDeleteClassroom: boolean;
    canManageRoster: boolean;
    canAppointTeacher: boolean;
    canAppointMonitors: boolean;
    canManageTimetable: boolean;
    isReadOnly: boolean;

    // Tab Access Grants
    canAccessOverview: boolean;
    canAccessRoster: boolean;
    canAccessTimetable: boolean;
    canAccessHomework: boolean;
    canAccessGradebook: boolean;
    canAccessAttendance: boolean;
    canAccessRemarks: boolean;
    canCreateRemark: boolean;
}

/**
 * Centralized Role & Scope Evaluation Hook for the Classroom Module.
 * Calculates granular capabilities for Super Admin, Department Incharge,
 * Class Teacher, Subject Teacher, and Enrolled Student.
 */
export function useClassroomScope(classroom?: Classroom | null): ClassroomScopeResult {
    const { user } = useAuth();
    const { can, hasRole } = usePermissions();

    return useMemo(() => {
        const isSuperAdmin = hasRole("super_admin", "admin", "principal");

        const teacherId = user?.teacherId;
        const studentId = (user as any)?.studentId || (user as any)?.student?.id;

        // Check if teacher is the Department Incharge (Head of Department)
        const inchargeLeadId =
            classroom?.departmentRef?.headId ||
            (classroom?.departmentRef as any)?.inchargeId ||
            (classroom?.departmentRef as any)?.head?.id ||
            classroom?.academicClass?.department?.headId ||
            (classroom?.academicClass?.department as any)?.inchargeId ||
            (classroom?.academicClass?.department as any)?.head?.id;

        const isDepartmentIncharge = Boolean(teacherId && inchargeLeadId && teacherId === inchargeLeadId);

        // Check if teacher is assigned as Class Teacher for this section
        const isClassTeacher = Boolean(teacherId && classroom?.classTeacherId && teacherId === classroom.classTeacherId);

        // Check if teacher teaches one of the subjects in this classroom
        const isSubjectTeacher = Boolean(
            teacherId &&
            classroom?.subjects?.some((s) => s.teacher?.id === teacherId)
        );

        // Check if current student is enrolled in this section
        const isStudentEnrolled = Boolean(
            studentId &&
            classroom?.enrollments?.some((e) => e.student?.id === studentId)
        );

        // Privileged administrator or department incharge for this classroom
        const hasClassroomAdminAccess = isSuperAdmin || isDepartmentIncharge;

        // Edit permission (Class Teacher or Admin / HOD)
        const canEditClassroom = hasClassroomAdminAccess || (can("classrooms", "update") && isClassTeacher);

        // Delete permission (Admins only)
        const canDeleteClassroom = isSuperAdmin || can("classrooms", "delete");

        // Teacher appointment (Admins and Department Incharge)
        const canAppointTeacher = hasClassroomAdminAccess || can("classrooms", "update");

        // Roster mutations (Enroll / Remove students)
        const canManageRoster = hasClassroomAdminAccess || (can("classrooms", "update") && isClassTeacher);

        // Monitor appointment (Class Teacher or Dept Incharge / Admin)
        const canAppointMonitors = hasClassroomAdminAccess || (can("classrooms", "update") && isClassTeacher);

        // Timetable configuration
        const canManageTimetable = hasClassroomAdminAccess || (can("classrooms", "update") && isClassTeacher);

        // Overall read-only mode for current viewer
        const isReadOnly = !canEditClassroom;

        const isStudentOnly = !isSuperAdmin && !teacherId && hasRole("student");

        // ── Tab Level Access Grants ───────────────────────────────────────────
        const canAccessOverview = can("classrooms", "read");
        // Staff/Admin only: Students must never access the staff roster management tab
        const canAccessRoster = !isStudentOnly && can("classrooms", "read");
        const canAccessTimetable = can("classrooms", "read");
        const canAccessHomework = can("homework", "read") || isClassTeacher || isSubjectTeacher || isStudentEnrolled || hasClassroomAdminAccess;
        // Staff/Faculty only: Students must never view the whole class gradebook or class attendance marker
        const canAccessGradebook = !isStudentOnly && (can("exams", "read") || isClassTeacher || hasClassroomAdminAccess);
        const canAccessAttendance = !isStudentOnly && (can("attendance", "read") || isClassTeacher || hasClassroomAdminAccess);
        const canAccessRemarks = !isStudentOnly && (can("classrooms", "read") || isClassTeacher || isSubjectTeacher || hasClassroomAdminAccess);
        const canCreateRemark = !isStudentOnly && (can("classrooms", "update") || isClassTeacher || isSubjectTeacher || hasClassroomAdminAccess);

        return {
            isSuperAdmin,
            isDepartmentIncharge,
            isClassTeacher,
            isSubjectTeacher,
            isStudentEnrolled,

            canEditClassroom,
            canDeleteClassroom,
            canManageRoster,
            canAppointTeacher,
            canAppointMonitors,
            canManageTimetable,
            isReadOnly,

            canAccessOverview,
            canAccessRoster,
            canAccessTimetable,
            canAccessHomework,
            canAccessGradebook,
            canAccessAttendance,
            canAccessRemarks,
            canCreateRemark,
        };
    }, [user, classroom, can, hasRole]);
}
