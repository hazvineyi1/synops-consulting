/**
 * Role helpers for the Compass curriculum engine. The server is the security
 * boundary; these helpers only shape the UI (which nav/routes to show).
 *
 * - admin / super_admin: global roles, see every tenant.
 * - school_admin: bound to one organization, manages its builders + allocations.
 * - builder: allocation-limited; only the scopes granted to them.
 */
export function isGlobalAdmin(role?: string | null): boolean {
  return role === "admin" || role === "super_admin";
}

export function isSchoolAdmin(role?: string | null): boolean {
  return role === "school_admin";
}

/** Anyone who can manage a school's builders and allocations. */
export function canManageSchool(role?: string | null): boolean {
  return isGlobalAdmin(role) || isSchoolAdmin(role);
}

export function isBuilder(role?: string | null): boolean {
  return role === "builder";
}

export function roleLabel(role?: string | null): string {
  switch (role) {
    case "admin":
      return "Administrator";
    case "super_admin":
      return "Super administrator";
    case "school_admin":
      return "School administrator";
    case "builder":
      return "Builder";
    default:
      return "Member";
  }
}
