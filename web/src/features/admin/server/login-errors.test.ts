import { describe, expect, it } from "vitest";
import {
  buildAdminLoginErrorPath,
  getAdminLoginErrorMessage,
} from "./login-errors";

describe("getAdminLoginErrorMessage", () => {
  it("returns a Japanese message for a known error code", () => {
    expect(getAdminLoginErrorMessage("not_admin")).toBe(
      "管理者権限がありません"
    );
  });

  it("ignores unknown error codes", () => {
    expect(getAdminLoginErrorMessage("管理者権限がありません")).toBeUndefined();
    expect(getAdminLoginErrorMessage(undefined)).toBeUndefined();
  });
});

describe("buildAdminLoginErrorPath", () => {
  it("uses an ASCII error code in the redirect URL", () => {
    expect(buildAdminLoginErrorPath("not_admin", "/admin/bills")).toBe(
      "/admin/login?error=not_admin&next=%2Fadmin%2Fbills"
    );
  });

  it("drops non-admin next paths", () => {
    expect(buildAdminLoginErrorPath("login_failed", "/")).toBe(
      "/admin/login?error=login_failed"
    );
  });
});
