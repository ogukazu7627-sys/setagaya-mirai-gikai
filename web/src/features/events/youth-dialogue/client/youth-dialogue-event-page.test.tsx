// @vitest-environment jsdom

import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ensureAttribution: vi.fn() }));

vi.mock(
  "@/features/public-comment/shared/client/use-public-comment-attribution",
  () => ({
    usePublicCommentAttribution: () => ({
      ensureAttribution: mocks.ensureAttribution,
    }),
  })
);

import { YouthDialogueEventPage } from "./youth-dialogue-event-page";

describe("YouthDialogueEventPage", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.ensureAttribution.mockResolvedValue(
      "11111111-1111-4111-8111-111111111111"
    );
  });

  it("申込は計測ルートを経由し、サイト内では個人情報を受け取らない", async () => {
    render(<YouthDialogueEventPage />);

    await waitFor(() => {
      const applyLinks = screen.getAllByRole("link", {
        name: /参加を申し込む/u,
      });
      expect(applyLinks).toHaveLength(2);
      for (const link of applyLinks) {
        expect(link.getAttribute("href")).toBe(
          "/events/youth-dialogue-2026-10-03/apply?attribution=11111111-1111-4111-8111-111111111111"
        );
      }
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("メールアドレス")).toBeNull();
  });
});
