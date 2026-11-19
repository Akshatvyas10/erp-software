/**
 * routes.config.ts
 *
 * Centralized, declarative Route Registry for School ERP.
 * Defines route patterns, layouts, and permission requirements.
 * Used by:
 * 1. App.tsx (single source of truth for routing).
 * 2. authRedirect.ts (dynamic validation using react-router-dom matchPath).
 */

export interface AppRouteDefinition {
  path: string;
  scope?: "dashboard" | "portal" | "public";
  permission?: {
    resource: string;
    action: string;
  };
  redirectTo?: string;
}

export const APP_ROUTES: AppRouteDefinition[] = [
  // Dashboard Core
  { path: "/dashboard", scope: "dashboard" },
  { path: "/dashboard/users", scope: "dashboard" },
  { path: "/dashboard/users/:id", scope: "dashboard" },
  { path: "/dashboard/teachers", scope: "dashboard" },
  { path: "/dashboard/teachers/:id", scope: "dashboard" },
  { path: "/dashboard/departments", scope: "dashboard" },
  { path: "/dashboard/roles", scope: "dashboard" },
  { path: "/dashboard/permissions", scope: "dashboard" },
  
  // Classrooms & Subjects
  { path: "/dashboard/classrooms", scope: "dashboard", permission: { resource: "classrooms", action: "read" } },
  { path: "/dashboard/classrooms/:id", scope: "dashboard", permission: { resource: "classrooms", action: "read" } },
  { path: "/dashboard/subjects", scope: "dashboard", permission: { resource: "subjects", action: "read" } },

  // Students
  { path: "/dashboard/students", scope: "dashboard", permission: { resource: "students", action: "read" } },
  { path: "/dashboard/students/:id", scope: "dashboard", permission: { resource: "students", action: "read" } },

  // Homework & Calendar
  { path: "/dashboard/homework", scope: "dashboard" },
  { path: "/dashboard/homework/:id", scope: "dashboard" },
  { path: "/dashboard/calendar", scope: "dashboard" },

  // Admissions & Config
  { path: "/dashboard/admissions", scope: "dashboard" },
  { path: "/dashboard/admissions/generate", scope: "dashboard" },
  { path: "/dashboard/school-config", scope: "dashboard" },

  // Leaves & HR
  { path: "/dashboard/leaves", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/teachers/leaves", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/hr/leave-rules", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/leaves/my", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/leaves/approvals", scope: "dashboard", permission: { resource: "teacher_leaves", action: "update" } },
  { path: "/dashboard/student-leaves", scope: "dashboard", permission: { resource: "student_leaves", action: "update" } },

  // Salary / Payroll
  { path: "/dashboard/salary", scope: "dashboard", permission: { resource: "teachers", action: "manage" } },

  // Fees & Billing
  { path: "/dashboard/fees", scope: "dashboard", permission: { resource: "fees", action: "read" } },
  { path: "/fees/management", scope: "dashboard", redirectTo: "/dashboard/fees" },

  // Student / Parent Portal Routes
  { path: "/portal", scope: "portal" },
  { path: "/portal/timetable", scope: "portal" },
  { path: "/portal/attendance", scope: "portal" },
  { path: "/portal/leaves", scope: "portal" },
  { path: "/portal/homework", scope: "portal" },
  { path: "/portal/report-cards", scope: "portal" },
  { path: "/portal/fees", scope: "portal" },
];

