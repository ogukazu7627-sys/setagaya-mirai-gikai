export function parseAdminEmailAllowlist(
  value: string | undefined
): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function hasAdminRole(user: unknown): boolean {
  if (!user || typeof user !== "object") return false;
  const appMetadata = (user as { app_metadata?: unknown }).app_metadata;
  if (!appMetadata || typeof appMetadata !== "object") return false;
  const roles = (appMetadata as { roles?: unknown }).roles;
  return Array.isArray(roles) && roles.includes("admin");
}

export function isAllowedAdminUser(
  user: unknown,
  options: {
    adminEmails?: string;
    requireEmailAllowlist: boolean;
  }
): boolean {
  if (!hasAdminRole(user)) return false;

  const allowedEmails = parseAdminEmailAllowlist(options.adminEmails);
  if (allowedEmails.size === 0) {
    return !options.requireEmailAllowlist;
  }

  const email = (user as { email?: unknown }).email;
  return typeof email === "string" && allowedEmails.has(email.toLowerCase());
}
