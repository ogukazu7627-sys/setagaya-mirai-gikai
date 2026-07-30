import { describe, expect, it } from "vitest";

import {
  extractBillIdFromPath,
  hasPersistentChatSidebar,
  isInterviewPage,
  isInterviewSection,
  isMainPage,
  isWidePage,
} from "./page-layout-utils";

describe("isMainPage", () => {
  it("returns true for the top page", () => {
    expect(isMainPage("/")).toBe(true);
  });

  it("returns true for a bill detail page", () => {
    expect(isMainPage("/bills/abc-123")).toBe(true);
  });

  it("returns false for a bill sub-page", () => {
    expect(isMainPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for an unrelated path", () => {
    expect(isMainPage("/about")).toBe(false);
  });

  it("returns true for the council top page", () => {
    expect(isMainPage("/bills")).toBe(true);
    expect(isMainPage("/bills/")).toBe(true);
  });
});

describe("hasPersistentChatSidebar", () => {
  it("returns true for pages with an always-visible desktop chat panel", () => {
    expect(hasPersistentChatSidebar("/bills/abc-123")).toBe(true);
    expect(hasPersistentChatSidebar("/preview/bills/abc-123")).toBe(true);
  });

  it("returns false for pages without the persistent chat panel", () => {
    expect(hasPersistentChatSidebar("/")).toBe(false);
    expect(hasPersistentChatSidebar("/bills")).toBe(false);
    expect(hasPersistentChatSidebar("/bills/")).toBe(false);
    expect(hasPersistentChatSidebar("/committees")).toBe(false);
    expect(hasPersistentChatSidebar("/bills/abc-123/interview")).toBe(false);
  });
});

describe("isWidePage", () => {
  it("returns true for the budget and learn pages", () => {
    expect(isWidePage("/budget")).toBe(true);
    expect(isWidePage("/budget/programs/bpi-1")).toBe(true);
    expect(isWidePage("/learn")).toBe(true);
    expect(isWidePage("/learn/bill-process")).toBe(true);
  });

  it("returns false for other routes", () => {
    expect(isWidePage("/")).toBe(false);
    expect(isWidePage("/bills")).toBe(false);
  });
});

describe("isInterviewPage", () => {
  it("returns true for an interview chat page", () => {
    expect(isInterviewPage("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns false for an interview page without /chat", () => {
    expect(isInterviewPage("/bills/abc-123/interview")).toBe(false);
  });

  it("returns false for a bill detail page", () => {
    expect(isInterviewPage("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewPage("/")).toBe(false);
  });
});

describe("isInterviewSection", () => {
  it("returns true for the interview LP page", () => {
    expect(isInterviewSection("/bills/abc-123/interview")).toBe(true);
  });

  it("returns true for the interview chat page", () => {
    expect(isInterviewSection("/bills/abc-123/interview/chat")).toBe(true);
  });

  it("returns false for a bill detail page", () => {
    expect(isInterviewSection("/bills/abc-123")).toBe(false);
  });

  it("returns false for the top page", () => {
    expect(isInterviewSection("/")).toBe(false);
  });

  it("returns false for unrelated paths", () => {
    expect(isInterviewSection("/about")).toBe(false);
  });
});

describe("extractBillIdFromPath", () => {
  it("extracts bill ID from a bill detail path", () => {
    expect(extractBillIdFromPath("/bills/abc-123")).toBe("abc-123");
  });

  it("extracts bill ID from a bill sub-path", () => {
    expect(extractBillIdFromPath("/bills/abc-123/interview/chat")).toBe(
      "abc-123"
    );
  });

  it("returns null when path does not contain /bills/", () => {
    expect(extractBillIdFromPath("/about")).toBeNull();
  });

  it("returns null for the top page", () => {
    expect(extractBillIdFromPath("/")).toBeNull();
  });
});
