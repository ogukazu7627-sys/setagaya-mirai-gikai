// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

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

  it("申込ボタンはすべて同じラベルで計測ルートを経由し、サイト内では個人情報を受け取らない", async () => {
    render(<YouthDialogueEventPage registrationStatus="open" />);
    expect(
      screen.getAllByText("世田谷のみらいを語る会").length
    ).toBeGreaterThan(0);

    await waitFor(() => {
      const applyLinks = screen.getAllByRole("link", {
        name: "参加を申し込む",
      });
      expect(applyLinks).toHaveLength(3);
      for (const link of applyLinks) {
        expect(link.getAttribute("href")).toBe(
          "/events/youth-dialogue-2026-10-03/apply?attribution=11111111-1111-4111-8111-111111111111"
        );
        expect(link).toHaveAccessibleDescription(
          "申込はGoogleフォームで受け付けます（新しいタブで開きます）"
        );
      }
    });

    expect(screen.queryByRole("textbox")).toBeNull();
    expect(screen.queryByLabelText("メールアドレス")).toBeNull();
  });

  it("受付を終えたら申込ボタンを出さず、理由を表示する", async () => {
    render(<YouthDialogueEventPage registrationStatus="full" />);

    await waitFor(() => {
      expect(mocks.ensureAttribution).toHaveBeenCalled();
    });
    expect(screen.queryByRole("link", { name: "参加を申し込む" })).toBeNull();
    expect(
      screen.getAllByText("定員に達したため、申込の受付を終了しました。")
    ).toHaveLength(2);
  });
});
