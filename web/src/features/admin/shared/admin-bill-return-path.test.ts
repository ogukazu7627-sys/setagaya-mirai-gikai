import { describe, expect, it } from "vitest";
import {
  appendAdminBillsReturnPath,
  normalizeAdminBillsReturnPath,
} from "./admin-bill-return-path";

describe("normalizeAdminBillsReturnPath", () => {
  it("keeps admin bills list query params", () => {
    expect(
      normalizeAdminBillsReturnPath(
        "/admin/bills?page=2&sort_by=updated_at&sort_order=asc&publish_status=draft"
      )
    ).toBe(
      "/admin/bills?page=2&sort_by=updated_at&sort_order=asc&publish_status=draft"
    );
  });

  it("rejects external and non-list paths", () => {
    expect(
      normalizeAdminBillsReturnPath("https://example.com/admin/bills")
    ).toBe("/admin/bills");
    expect(normalizeAdminBillsReturnPath("/admin/bills/123/edit")).toBe(
      "/admin/bills"
    );
    expect(normalizeAdminBillsReturnPath("/admin/reports")).toBe(
      "/admin/bills"
    );
  });
});

describe("appendAdminBillsReturnPath", () => {
  it("adds encoded return_path while preserving existing href params", () => {
    expect(
      appendAdminBillsReturnPath(
        "/admin/bills/bill-1/edit?saved=1",
        "/admin/bills?page=3&q=子育て"
      )
    ).toBe(
      "/admin/bills/bill-1/edit?saved=1&return_path=%2Fadmin%2Fbills%3Fpage%3D3%26q%3D%25E5%25AD%2590%25E8%2582%25B2%25E3%2581%25A6"
    );
  });
});
