import { describe, expect, it } from "vitest";
import {
  hasAdminRole,
  isAllowedAdminUser,
  parseAdminEmailAllowlist,
} from "./admin-access";

const adminUser = {
  email: "Owner@Example.com",
  app_metadata: { roles: ["admin"] },
};

describe("parseAdminEmailAllowlist", () => {
  it("normalizes comma-separated email addresses", () => {
    expect(
      parseAdminEmailAllowlist(" owner@example.com, Second@Example.com ")
    ).toEqual(new Set(["owner@example.com", "second@example.com"]));
  });
});

describe("hasAdminRole", () => {
  it("returns true only when app_metadata.roles includes admin", () => {
    expect(hasAdminRole(adminUser)).toBe(true);
    expect(hasAdminRole({ email: "owner@example.com", app_metadata: {} })).toBe(
      false
    );
    expect(hasAdminRole({ email: "owner@example.com" })).toBe(false);
  });
});

describe("isAllowedAdminUser", () => {
  it("allows an admin user whose email is in the allowlist", () => {
    expect(
      isAllowedAdminUser(adminUser, {
        adminEmails: "owner@example.com",
        requireEmailAllowlist: true,
      })
    ).toBe(true);
  });

  it("rejects an admin user whose email is not in the allowlist", () => {
    expect(
      isAllowedAdminUser(adminUser, {
        adminEmails: "someone-else@example.com",
        requireEmailAllowlist: true,
      })
    ).toBe(false);
  });

  it("rejects all admin users when a required allowlist is empty", () => {
    expect(
      isAllowedAdminUser(adminUser, {
        adminEmails: undefined,
        requireEmailAllowlist: true,
      })
    ).toBe(false);
  });

  it("allows role-only admin users when the allowlist is not required locally", () => {
    expect(
      isAllowedAdminUser(adminUser, {
        adminEmails: undefined,
        requireEmailAllowlist: false,
      })
    ).toBe(true);
  });
});
