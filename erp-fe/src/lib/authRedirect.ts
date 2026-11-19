/**
 * authRedirect.ts
 *
 * Secure Return URL management for School ERP authentication.
 * 
 * Dynamic Features & Security Safeguards:
 * 1. Encrypted query param URL support (?redirect=<encrypted_payload>).
 * 2. Uses AES encryption (CryptoJS) with base64url encoding for safe transmission in query params.
 * 3. Fallback support in sessionStorage/localStorage for redundancy.
 * 4. Dynamic validation using react-router-dom `matchPath` against registered application routes.
 * 5. Strict rejection of external URLs, protocol-relative paths (`//evil.com`), JavaScript URLs, or malformed characters.
 * 6. Exclusion of auth routes (/login, /forgot-password, /reset-password, /request-access) and public standalone tokens.
 * 7. Full preservation of pathname, query parameters (?page=2&search=IT), and hash fragments (#department-list).
 * 8. Role & Permission checks: ensures the user holds the required permissions for the route before redirecting.
 */

import CryptoJS from "crypto-js";
import { matchPath } from "react-router-dom";
import { APP_ROUTES, type AppRouteDefinition } from "@/config/routes.config";

export const RETURN_URL_PARAM = "redirect";
const RETURN_URL_STORAGE_KEY = "erp_auth_return_url";

const getEncryptSecret = (): string => {
  return (import.meta.env.VITE_PERMISSION_ENCRYPT_KEY as string) || "erp_default_return_key_2025!!";
};

/**
 * Encrypts a return path string into a URL-safe encrypted token.
 */
export function encryptReturnUrl(path: string): string {
  try {
    const rawCipher = CryptoJS.AES.encrypt(path, getEncryptSecret()).toString();
    // Convert standard Base64 to URL-safe Base64 (+ -> -, / -> _, trim =)
    return rawCipher.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  } catch (err) {
    console.warn("[AuthRedirect] Encryption failed, returning fallback", err);
    return "";
  }
}

/**
 * Decrypts a URL-safe encrypted token back into the original path string.
 */
export function decryptReturnUrl(cipherToken: string): string | null {
  if (!cipherToken || typeof cipherToken !== "string") return null;

  try {
    // Restore base64 standard padding and chars (- -> +, _ -> /)
    let base64 = cipherToken.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) {
      base64 += "=";
    }

    const bytes = CryptoJS.AES.decrypt(base64, getEncryptSecret());
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) return null;

    return getSanitizedReturnUrl(decrypted);
  } catch {
    return null;
  }
}

/**
 * Public and authentication route prefixes that must NEVER be saved or redirected to.
 */
const FORBIDDEN_PREFIXES = [
  "/login",
  "/forgot-password",
  "/reset-password",
  "/request-access",
  "/public/",
];

/**
 * Sanitizes and validates a candidate return URL.
 * Returns the safe path or null if invalid/unsafe.
 */
export function getSanitizedReturnUrl(candidate: unknown): string | null {
  if (typeof candidate !== "string") return null;

  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // 1. Must strictly start with a single forward slash (relative internal route)
  // Rejects "//evil.com", "http://", "https://", "javascript:", etc.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return null;
  }

  // 2. Prevent control characters or encoded directory traversal/protocols
  if (/[\r\n\t]/.test(trimmed)) {
    return null;
  }

  // 3. Extract the pathname portion before query/hash to check against forbidden prefixes
  const pathPart = trimmed.split("?")[0].split("#")[0].toLowerCase();

  // Root or forbidden auth routes should not be saved as return destinations
  if (pathPart === "/" || pathPart === "") {
    return null;
  }

  for (const forbidden of FORBIDDEN_PREFIXES) {
    if (pathPart === forbidden || pathPart.startsWith(forbidden)) {
      return null;
    }
  }

  return trimmed;
}

/**
 * Builds the login URL containing the encrypted return path in query parameters.
 * e.g. /login?redirect=U2FsdGVkX19...
 */
export function buildLoginUrlWithReturn(rawPath?: string): string {
  const target = rawPath || (typeof window !== "undefined" && window.location
    ? `${window.location.pathname}${window.location.search}${window.location.hash}`
    : "");

  const safe = getSanitizedReturnUrl(target);
  if (!safe) return "/login";

  // Also persist in storage as resilient secondary fallback
  setReturnUrl(safe);

  const encrypted = encryptReturnUrl(safe);
  if (!encrypted) return "/login";

  return `/login?${RETURN_URL_PARAM}=${encodeURIComponent(encrypted)}`;
}

/**
 * Finds the matching route definition for a pathname using React Router's matchPath.
 */
export function findMatchingRoute(pathname: string): AppRouteDefinition | null {
  for (const route of APP_ROUTES) {
    if (matchPath({ path: route.path, end: true }, pathname)) {
      return route;
    }
  }
  return null;
}

/**
 * Saves the intended return URL in sessionStorage (and localStorage as backup).
 */
export function setReturnUrl(url: string): void {
  const safe = getSanitizedReturnUrl(url);
  if (!safe) return;

  try {
    sessionStorage.setItem(RETURN_URL_STORAGE_KEY, safe);
  } catch (err) {
    console.warn("[AuthRedirect] Failed to write return URL to sessionStorage", err);
  }

  try {
    localStorage.setItem(RETURN_URL_STORAGE_KEY, safe);
  } catch {
    // Ignore localStorage write error if disabled
  }
}

/**
 * Retrieves the stored return URL without clearing it.
 * Priority:
 * 1. Decrypted value from URL search params (?redirect=...)
 * 2. SessionStorage
 * 3. LocalStorage
 */
export function peekReturnUrl(searchParamsOrQueryString?: URLSearchParams | string): string | null {
  // 1. Try URL query params first
  try {
    let params: URLSearchParams | null = null;
    if (searchParamsOrQueryString instanceof URLSearchParams) {
      params = searchParamsOrQueryString;
    } else if (typeof searchParamsOrQueryString === "string") {
      params = new URLSearchParams(searchParamsOrQueryString);
    } else if (typeof window !== "undefined" && window.location) {
      params = new URLSearchParams(window.location.search);
    }

    if (params) {
      const encrypted = params.get(RETURN_URL_PARAM);
      if (encrypted) {
        const decrypted = decryptReturnUrl(encrypted);
        if (decrypted) return decrypted;
      }
    }
  } catch {
    // Fallback to storage
  }

  // 2. Try sessionStorage
  try {
    const rawSession = sessionStorage.getItem(RETURN_URL_STORAGE_KEY);
    const safeSession = getSanitizedReturnUrl(rawSession);
    if (safeSession) return safeSession;
  } catch {
    // Ignore sessionStorage read error
  }

  // 3. Try localStorage
  try {
    const rawLocal = localStorage.getItem(RETURN_URL_STORAGE_KEY);
    return getSanitizedReturnUrl(rawLocal);
  } catch {
    return null;
  }
}

/**
 * Consumes and returns the stored return URL, automatically removing it from storage.
 */
export function popReturnUrl(searchParamsOrQueryString?: URLSearchParams | string): string | null {
  const safe = peekReturnUrl(searchParamsOrQueryString);
  clearReturnUrl();
  return safe;
}

/**
 * Explicitly clears the stored return URL from all storage tiers.
 */
export function clearReturnUrl(): void {
  try {
    sessionStorage.removeItem(RETURN_URL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }

  try {
    localStorage.removeItem(RETURN_URL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Determines the safe post-login destination URL for a user.
 * 
 * Evaluation Logic:
 * 1. Inspect encrypted ?redirect= in query params or storage.
 * 2. Validate URL syntax and verify it matches a legitimate registered ERP route via `findMatchingRoute`.
 * 3. Verify user's role and permission access for the matched route.
 * 4. Fall back safely to role-based dashboard if any check fails.
 */
export function resolvePostLoginDestination(
  user: any,
  searchParamsOrQueryString?: URLSearchParams | string,
  canCheck?: (resource: string, action: string) => boolean,
  fallbackOverride?: string,
  options?: { peekOnly?: boolean }
): string {
  const userRoles = (user?.Roles || []).map((r: any) =>
    String(r?.name || r).toLowerCase()
  );

  const isStudentOnly =
    userRoles.includes("student") &&
    !userRoles.some((r: string) =>
      ["admin", "super_admin", "teacher", "principal", "accountant"].includes(r)
    );

  const defaultLanding = isStudentOnly ? "/portal" : "/dashboard";

  // Check saved return URL
  const saved = options?.peekOnly
    ? peekReturnUrl(searchParamsOrQueryString)
    : popReturnUrl(searchParamsOrQueryString);

  if (saved) {
    const pathPart = saved.split("?")[0].split("#")[0];
    const matchedRoute = findMatchingRoute(pathPart);

    // If no route matches in the ERP route tree, fallback to default dashboard
    if (!matchedRoute) {
      if (!options?.peekOnly) clearReturnUrl();
      return fallbackOverride || defaultLanding;
    }

    // Role boundary protection:
    // If student-only tries to access a dashboard route, deny and send to portal
    if (isStudentOnly && matchedRoute.scope === "dashboard") {
      if (!options?.peekOnly) clearReturnUrl();
      return "/portal";
    }

    // If route requires a specific permission and a permission checker is provided
    if (matchedRoute.permission && canCheck) {
      const isAllowed = canCheck(matchedRoute.permission.resource, matchedRoute.permission.action);
      if (!isAllowed) {
        if (!options?.peekOnly) clearReturnUrl();
        return fallbackOverride || defaultLanding;
      }
    }

    // Handle aliases (e.g. /fees/management -> /dashboard/fees)
    if (matchedRoute.redirectTo) {
      const queryAndHash = saved.substring(pathPart.length);
      return `${matchedRoute.redirectTo}${queryAndHash}`;
    }

    return saved;
  }

  return fallbackOverride || defaultLanding;
}
