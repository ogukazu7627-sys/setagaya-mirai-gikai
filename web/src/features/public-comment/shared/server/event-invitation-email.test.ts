import { describe, expect, it } from "vitest";
import {
  PUBLIC_COMMENT_EVENT_INVITATION_HTML,
  PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT,
  PUBLIC_COMMENT_EVENT_INVITATION_TEXT,
} from "./event-invitation-email";

describe("public comment event invitation email", () => {
  it("keeps the event details and application link in both formats", () => {
    for (const content of [
      PUBLIC_COMMENT_EVENT_INVITATION_TEXT,
      PUBLIC_COMMENT_EVENT_INVITATION_HTML,
    ]) {
      expect(content).toContain("若者と地域を語る会");
      expect(content).toContain("2026年10月3日（土）");
      expect(content).toContain("太子堂区民センター 第二会議室");
      expect(content).toContain("参加費");
      expect(content).toContain("無料");
      expect(content).toContain("https://forms.gle/sx7BdN5ZgWEk1cSKA");
    }
  });

  it("offers the application CTA near the opening and again below the details", () => {
    expect(
      PUBLIC_COMMENT_EVENT_INVITATION_HTML.match(/参加を申し込む/g)
    ).toHaveLength(2);
    expect(PUBLIC_COMMENT_EVENT_INVITATION_HTML).toContain("<!doctype html>");
    expect(PUBLIC_COMMENT_EVENT_INVITATION_SUBJECT).toContain("10/3開催");
  });
});
