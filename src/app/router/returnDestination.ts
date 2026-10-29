import { parseJobId } from "./jobId";

const DEFAULT_FALLBACK = "/candidate";
const RESUME_ID = /^[a-zA-Z0-9_-]+$/;
const JOB_ID = /^[a-zA-Z0-9_-]+$/;

/** Only return to private routes that AppRouter actually declares. */
export const getReturnDestination = (requested: unknown, defaultFallback = DEFAULT_FALLBACK): string => {
  const isEmployerContext = typeof requested === "string" && requested.startsWith("/employer");
  const fallback = defaultFallback !== DEFAULT_FALLBACK ? defaultFallback : (isEmployerContext ? "/employer" : DEFAULT_FALLBACK);

  if (typeof requested !== "string" || !requested.startsWith("/") ||
      requested.startsWith("//") || requested.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(requested)) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    return fallback;
  }
  if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return fallback;

  const path = requested.split(/[?#]/, 1)[0];
  // Current private path segments are ASCII. Reject encoded path segments,
  // dot normalization and repeated slashes before the router interprets them.
  if (path.includes("%") || path.includes("//") || path.includes("/./") ||
      path.includes("/../") || path.endsWith("/.") || path.endsWith("/..")) return fallback;

  if (path === "/candidate" || path === "/candidate/profile" ||
      path === "/candidate/onboarding" || path === "/candidate/saved-jobs" ||
      path === "/candidate/applications" || path === "/cv" ||
      path === "/cv/create" || path === "/verify-email") return requested;

  if (/^\/candidate\/applications\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(path)) {
    return requested;
  }

  if (path === "/admin" || path === "/admin/users" ||
      path === "/admin/companies" || path === "/admin/jobs" ||
      path === "/admin/system") return requested;

  if (path === "/employer" || path === "/employer/onboarding" ||
      path === "/employer/jobs" || path === "/employer/jobs/new" ||
      path === "/employer/jobs/create" || path === "/employer/profile" ||
      path === "/employer/locations" || path === "/employer/members" ||
      path === "/employer/applicants") return requested;

  const employerJobMatch = /^\/employer\/jobs\/([^/]+)\/edit$/.exec(path);
  if (employerJobMatch && JOB_ID.test(employerJobMatch[1])) return requested;

  const cvMatch = /^\/cv\/([^/]+)\/(edit|preview)$/.exec(path);
  if (cvMatch && RESUME_ID.test(cvMatch[1])) return requested;

  const jobMatch = /^\/jobs\/([^/]+)\/apply$/.exec(path);
  if (jobMatch && parseJobId(jobMatch[1]).kind !== "invalid") return requested;

  return fallback;
};
