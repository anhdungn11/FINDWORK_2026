import { parseJobId } from "./jobId";

const FALLBACK = "/candidate";
const RESUME_ID = /^[a-zA-Z0-9_-]+$/;

/** Only return to private routes that AppRouter actually declares. */
export const getReturnDestination = (requested: unknown): string => {
  if (typeof requested !== "string" || !requested.startsWith("/") ||
      requested.startsWith("//") || requested.includes("\\") ||
      /[\u0000-\u001f\u007f]/.test(requested)) return FALLBACK;

  let decoded: string;
  try {
    decoded = decodeURIComponent(requested);
  } catch {
    return FALLBACK;
  }
  if (decoded.includes("\\") || /[\u0000-\u001f\u007f]/.test(decoded)) return FALLBACK;

  const path = requested.split(/[?#]/, 1)[0];
  // Current private path segments are ASCII. Reject encoded path segments,
  // dot normalization and repeated slashes before the router interprets them.
  if (path.includes("%") || path.includes("//") || path.includes("/./") ||
      path.includes("/../") || path.endsWith("/.") || path.endsWith("/..")) return FALLBACK;

  if (path === "/candidate" || path === "/candidate/profile" ||
      path === "/candidate/onboarding" || path === "/cv" ||
      path === "/cv/create") return requested;

  const cvMatch = /^\/cv\/([^/]+)\/(edit|preview)$/.exec(path);
  if (cvMatch && RESUME_ID.test(cvMatch[1])) return requested;

  const jobMatch = /^\/jobs\/([^/]+)\/apply$/.exec(path);
  if (jobMatch && parseJobId(jobMatch[1]).kind !== "invalid") return requested;

  return FALLBACK;
};
