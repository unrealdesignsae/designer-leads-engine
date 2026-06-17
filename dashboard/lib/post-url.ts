// Heuristics for treating a lead's post_url as a real, useful source link
// (vs. a placeholder that just points at LinkedIn's homepage or a generic
// directory page). A useful URL is one that the user can click and actually
// see the original post / job listing.

const PLACEHOLDER_PATHS = [
  "/jobs",
  "/jobs/",
  "/feed",
  "/feed/",
];

const PLACEHOLDER_EXACT = [
  "https://www.linkedin.com/jobs/",
  "https://www.linkedin.com/feed/",
  "https://linkedin.com/jobs/",
  "https://linkedin.com/feed/",
];

export function isUsefulPostUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const u = url.trim();
  if (!u) return false;
  if (u === "N/A" || u.toLowerCase() === "n/a") return false;
  if (!/^https?:\/\//i.test(u)) return false;

  // Reject known placeholder URLs
  if ((PLACEHOLDER_EXACT as string[]).includes(u)) return false;

  // LinkedIn-specific checks
  try {
    const parsed = new URL(u);
    if (parsed.hostname.endsWith("linkedin.com")) {
      // Bare /jobs or /feed landing pages
      if (PLACEHOLDER_PATHS.includes(parsed.pathname)) return false;
      if (parsed.pathname === "/jobs" || parsed.pathname === "/feed") return false;
      // Bare company page (no specific job/post) is not the source for the role
      const m = parsed.pathname.match(/^\/company\/([^/]+)\/?$/);
      if (m) return false;
      // Acceptable: posts, /jobs/view/<id>, activity, /in/<user>/posts, etc.
      if (
        parsed.pathname.startsWith("/posts/") ||
        parsed.pathname.startsWith("/feed/update/") ||
        parsed.pathname.startsWith("/jobs/view/") ||
        parsed.pathname.startsWith("/jobs/collections/")
      ) {
        return true;
      }
      // Any other linkedin.com path is treated as not useful (e.g. /jobs, /company)
      return false;
    }
    // Non-LinkedIn: any real https URL with a path or query is fine
    return parsed.pathname !== "/" || !!parsed.search;
  } catch {
    return false;
  }
}
