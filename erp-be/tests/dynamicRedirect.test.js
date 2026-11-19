import { describe, it } from 'node:test';
import assert from 'node:assert';

// We implement dynamic route matching tests matching the implementation in routes.config.ts and authRedirect.ts

const APP_ROUTES = [
  { path: "/dashboard", scope: "dashboard" },
  { path: "/dashboard/users", scope: "dashboard" },
  { path: "/dashboard/users/:id", scope: "dashboard" },
  { path: "/dashboard/teachers", scope: "dashboard" },
  { path: "/dashboard/teachers/:id", scope: "dashboard" },
  { path: "/dashboard/departments", scope: "dashboard" },
  { path: "/dashboard/roles", scope: "dashboard" },
  { path: "/dashboard/permissions", scope: "dashboard" },
  { path: "/dashboard/classrooms", scope: "dashboard", permission: { resource: "classrooms", action: "read" } },
  { path: "/dashboard/classrooms/:id", scope: "dashboard", permission: { resource: "classrooms", action: "read" } },
  { path: "/dashboard/subjects", scope: "dashboard", permission: { resource: "subjects", action: "read" } },
  { path: "/dashboard/students", scope: "dashboard", permission: { resource: "students", action: "read" } },
  { path: "/dashboard/students/:id", scope: "dashboard", permission: { resource: "students", action: "read" } },
  { path: "/dashboard/homework", scope: "dashboard" },
  { path: "/dashboard/homework/:id", scope: "dashboard" },
  { path: "/dashboard/calendar", scope: "dashboard" },
  { path: "/dashboard/admissions", scope: "dashboard" },
  { path: "/dashboard/admissions/generate", scope: "dashboard" },
  { path: "/dashboard/school-config", scope: "dashboard" },
  { path: "/dashboard/leaves", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/teachers/leaves", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/hr/leave-rules", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/leaves/my", scope: "dashboard", permission: { resource: "teacher_leaves", action: "read" } },
  { path: "/dashboard/leaves/approvals", scope: "dashboard", permission: { resource: "teacher_leaves", action: "update" } },
  { path: "/dashboard/student-leaves", scope: "dashboard", permission: { resource: "student_leaves", action: "update" } },
  { path: "/dashboard/salary", scope: "dashboard", permission: { resource: "teachers", action: "manage" } },
  { path: "/dashboard/fees", scope: "dashboard", permission: { resource: "fees", action: "read" } },
  { path: "/fees/management", scope: "dashboard", redirectTo: "/dashboard/fees" },
  { path: "/portal", scope: "portal" },
  { path: "/portal/timetable", scope: "portal" },
  { path: "/portal/attendance", scope: "portal" },
  { path: "/portal/leaves", scope: "portal" },
  { path: "/portal/homework", scope: "portal" },
  { path: "/portal/report-cards", scope: "portal" },
  { path: "/portal/fees", scope: "portal" },
];

function matchRoutePattern(pattern, pathname) {
  const patternSegments = pattern.split("/").filter(Boolean);
  const pathSegments = pathname.split("/").filter(Boolean);

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  for (let i = 0; i < patternSegments.length; i++) {
    const p = patternSegments[i];
    const s = pathSegments[i];

    if (p.startsWith(":")) {
      // Dynamic route parameter
      if (!s || s.trim() === "") return false;
      continue;
    }

    if (p !== s) {
      return false;
    }
  }

  return true;
}

function findMatchingRoute(pathname) {
  for (const route of APP_ROUTES) {
    if (matchRoutePattern(route.path, pathname)) {
      return route;
    }
  }
  return null;
}

function getSanitizedReturnUrl(candidate) {
  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }

  if (/[\r\n\t]/.test(trimmed)) {
    return null;
  }

  const pathPart = trimmed.split("?")[0].split("#")[0].toLowerCase();
  if (pathPart === "/" || pathPart === "") {
    return null;
  }

  const FORBIDDEN_PREFIXES = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/request-access",
    "/public/",
  ];

  for (const forbidden of FORBIDDEN_PREFIXES) {
    if (pathPart === forbidden || pathPart.startsWith(forbidden)) {
      return null;
    }
  }

  return trimmed;
}

function resolvePostLoginDestination(user, savedUrl, canCheck) {
  const userRoles = (user?.Roles || []).map((r) =>
    String(r?.name || r).toLowerCase()
  );

  const isStudentOnly =
    userRoles.includes("student") &&
    !userRoles.some((r) =>
      ["admin", "super_admin", "teacher", "principal", "accountant"].includes(r)
    );

  const defaultLanding = isStudentOnly ? "/portal" : "/dashboard";

  if (savedUrl) {
    const sanitized = getSanitizedReturnUrl(savedUrl);
    if (!sanitized) return defaultLanding;

    const pathPart = sanitized.split("?")[0].split("#")[0];
    const matchedRoute = findMatchingRoute(pathPart);

    if (!matchedRoute) {
      return defaultLanding;
    }

    if (isStudentOnly && matchedRoute.scope === "dashboard") {
      return "/portal";
    }

    if (matchedRoute.permission && canCheck) {
      const allowed = canCheck(matchedRoute.permission.resource, matchedRoute.permission.action);
      if (!allowed) {
        return defaultLanding;
      }
    }

    if (matchedRoute.redirectTo) {
      const queryAndHash = sanitized.substring(pathPart.length);
      return `${matchedRoute.redirectTo}${queryAndHash}`;
    }

    return sanitized;
  }

  return defaultLanding;
}

describe("Dynamic Post-Login Return URL & Route Matching Tests", () => {
  it("should match static protected routes like /dashboard/departments", () => {
    const route = findMatchingRoute("/dashboard/departments");
    assert.notStrictEqual(route, null);
    assert.strictEqual(route.path, "/dashboard/departments");
  });

  it("should match parameterized nested routes like /dashboard/students/123", () => {
    const route = findMatchingRoute("/dashboard/students/student-990");
    assert.notStrictEqual(route, null);
    assert.strictEqual(route.path, "/dashboard/students/:id");
  });

  it("should reject non-existent routes (e.g. /dashboard/non-existent-page)", () => {
    const route = findMatchingRoute("/dashboard/non-existent-page");
    assert.strictEqual(route, null);
  });

  it("should preserve query parameters and hashes for dynamic routes", () => {
    const user = { firstName: "Akshat", Roles: [{ name: "admin" }] };
    const saved = "/dashboard/departments?page=2&search=IT#department-list";
    const dest = resolvePostLoginDestination(user, saved);
    assert.strictEqual(dest, "/dashboard/departments?page=2&search=IT#department-list");
  });

  it("should resolve route aliases like /fees/management?status=pending", () => {
    const user = { firstName: "Accountant", Roles: [{ name: "accountant" }] };
    const saved = "/fees/management?class=10&status=pending";
    const dest = resolvePostLoginDestination(user, saved);
    assert.strictEqual(dest, "/dashboard/fees?class=10&status=pending");
  });

  it("should fallback to /dashboard if saved URL references a deleted/non-existent route", () => {
    const user = { firstName: "Admin", Roles: [{ name: "admin" }] };
    const saved = "/dashboard/deleted-feature";
    const dest = resolvePostLoginDestination(user, saved);
    assert.strictEqual(dest, "/dashboard");
  });

  it("should fallback to /dashboard if user lacks required permission", () => {
    const user = { firstName: "Teacher", Roles: [{ name: "teacher" }] };
    const saved = "/dashboard/salary"; // requires teachers:manage
    const canCheck = (res, act) => false; // deny
    const dest = resolvePostLoginDestination(user, saved, canCheck);
    assert.strictEqual(dest, "/dashboard");
  });

  it("should allow redirect when user holds valid permission", () => {
    const user = { firstName: "Principal", Roles: [{ name: "principal" }] };
    const saved = "/dashboard/salary";
    const canCheck = (res, act) => res === "teachers" && act === "manage";
    const dest = resolvePostLoginDestination(user, saved, canCheck);
    assert.strictEqual(dest, "/dashboard/salary");
  });
});

