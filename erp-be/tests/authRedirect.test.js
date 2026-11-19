import { describe, it } from 'node:test';
import assert from 'node:assert';

// Import functions to test using dynamic or relative node execution
// We can define unit tests for getSanitizedReturnUrl and resolvePostLoginDestination directly

function getSanitizedReturnUrl(candidate) {
  if (typeof candidate !== "string") return null;

  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // 1. Must strictly start with a single forward slash (relative internal route)
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }

  // 2. Prevent control characters
  if (/[\r\n\t]/.test(trimmed)) {
    return null;
  }

  // 3. Extract the pathname portion before query/hash to check against forbidden prefixes
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

  // 4. Ensure path matches legitimate ERP route patterns (/dashboard..., /portal...)
  if (!pathPart.startsWith("/dashboard") && !pathPart.startsWith("/portal")) {
    return null;
  }

  return trimmed;
}

function resolveDestination(user, savedUrl) {
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
    if (isStudentOnly && savedUrl.startsWith("/dashboard")) {
      return "/portal";
    }
    return savedUrl;
  }

  return defaultLanding;
}

describe("Auth Return URL Sanitization & Security Tests", () => {
  it("should accept valid internal dashboard paths with query parameters", () => {
    const input = "/dashboard/fees?class=10&status=pending";
    const result = getSanitizedReturnUrl(input);
    assert.strictEqual(result, "/dashboard/fees?class=10&status=pending");
  });

  it("should accept nested student portal routes with hash fragments", () => {
    const input = "/portal/timetable#period-2";
    const result = getSanitizedReturnUrl(input);
    assert.strictEqual(result, "/portal/timetable#period-2");
  });

  it("should reject open redirect attempts to external protocols (http/https)", () => {
    assert.strictEqual(getSanitizedReturnUrl("https://evil.com"), null);
    assert.strictEqual(getSanitizedReturnUrl("http://attacker.com/dashboard"), null);
  });

  it("should reject protocol-relative URLs (//evil.com)", () => {
    assert.strictEqual(getSanitizedReturnUrl("//evil.com/dashboard/fees"), null);
    assert.strictEqual(getSanitizedReturnUrl("//google.com"), null);
  });

  it("should reject javascript: or data: URIs", () => {
    assert.strictEqual(getSanitizedReturnUrl("javascript:alert(1)"), null);
    assert.strictEqual(getSanitizedReturnUrl("data:text/html,..."), null);
  });

  it("should reject forbidden auth routes (/login, /forgot-password)", () => {
    assert.strictEqual(getSanitizedReturnUrl("/login"), null);
    assert.strictEqual(getSanitizedReturnUrl("/login?return=/something"), null);
    assert.strictEqual(getSanitizedReturnUrl("/forgot-password"), null);
    assert.strictEqual(getSanitizedReturnUrl("/reset-password"), null);
    assert.strictEqual(getSanitizedReturnUrl("/public/admissions/123"), null);
  });

  it("should reject root / route as return URL", () => {
    assert.strictEqual(getSanitizedReturnUrl("/"), null);
  });

  it("should reject non-ERP arbitrary paths", () => {
    assert.strictEqual(getSanitizedReturnUrl("/random-path"), null);
    assert.strictEqual(getSanitizedReturnUrl("/admin-console"), null);
  });
});

describe("Post-Login Destination Resolution Tests", () => {
  it("should redirect admin/staff to saved return URL", () => {
    const user = { firstName: "Admin", Roles: [{ name: "admin" }] };
    const dest = resolveDestination(user, "/dashboard/fees?status=pending");
    assert.strictEqual(dest, "/dashboard/fees?status=pending");
  });

  it("should redirect student to saved portal return URL", () => {
    const user = { firstName: "Student", Roles: [{ name: "student" }] };
    const dest = resolveDestination(user, "/portal/homework");
    assert.strictEqual(dest, "/portal/homework");
  });

  it("should prevent student from accessing dashboard URL and fallback safely to /portal", () => {
    const user = { firstName: "Student", Roles: [{ name: "student" }] };
    const dest = resolveDestination(user, "/dashboard/users");
    assert.strictEqual(dest, "/portal");
  });

  it("should fallback to default role dashboard when no return URL is saved", () => {
    const admin = { firstName: "Admin", Roles: [{ name: "admin" }] };
    assert.strictEqual(resolveDestination(admin, null), "/dashboard");

    const student = { firstName: "Student", Roles: [{ name: "student" }] };
    assert.strictEqual(resolveDestination(student, null), "/portal");
  });
});

