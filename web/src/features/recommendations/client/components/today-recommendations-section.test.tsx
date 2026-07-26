// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillWithContent } from "@/features/bills/shared/types";
import {
  RECOMMENDATION_SMALL_TAGS,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { RecommendationAvailability } from "../../shared/types/recommendation";
import { RECOMMENDATION_PROFILE_STORAGE_KEY } from "../utils/recommendation-storage";

const mocks = vi.hoisted(() => ({
  fetchTodayRecommendations: vi.fn(),
  recordRecommendationImpressions: vi.fn(),
  savePreferences: vi.fn(),
  resetRecommendationHistory: vi.fn(),
  deleteRecommendationData: vi.fn(),
}));

vi.mock("../utils/recommendation-api-client", async () => {
  const actual = await vi.importActual<
    typeof import("../utils/recommendation-api-client")
  >("../utils/recommendation-api-client");
  return {
    ...actual,
    fetchTodayRecommendations: mocks.fetchTodayRecommendations,
    recordRecommendationImpressions: mocks.recordRecommendationImpressions,
    savePreferences: mocks.savePreferences,
    resetRecommendationHistory: mocks.resetRecommendationHistory,
    deleteRecommendationData: mocks.deleteRecommendationData,
  };
});

vi.mock("../utils/web-push-client", () => ({
  getPushSupport: () => ({ supported: false, reason: "unsupported" }),
  enableWebPush: vi.fn(),
  disableWebPush: vi.fn(),
}));

vi.mock("@/features/bills/client/components/bill-list/bill-card", () => ({
  BillCard: ({ bill }: { bill: BillWithContent }) => (
    <div>案件カード: {bill.bill_content?.title}</div>
  ),
}));

import { TodayRecommendationsSection } from "./today-recommendations-section";

describe("TodayRecommendationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.recordRecommendationImpressions.mockResolvedValue({ success: true });
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    window.IntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
    window.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    }));
  });

  it("shows onboarding only when the versioned local profile is absent", () => {
    render(
      <TodayRecommendationsSection
        availability={availabilityWith(["不登校支援", "学校改築", "防災情報"])}
      />
    );

    expect(
      screen.getByRole("dialog", { name: "興味のある分野を選ぶ" })
    ).toBeVisible();
    expect(mocks.fetchTodayRecommendations).not.toHaveBeenCalled();
  });

  it("loads saved recommendations and keeps notification-unsupported browsers usable", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify({
        installationId: "11111111-1111-4111-8111-111111111111",
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        completedAt: "2026-07-25T00:00:00.000Z",
        preferenceVersion: 1,
      })
    );
    mocks.fetchTodayRecommendations.mockResolvedValue({
      recommendationDate: "2026-07-25",
      bills: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "テスト案件",
          bill_content: { title: "テスト案件タイトル" },
          tags: [],
        } as unknown as BillWithContent,
      ],
      hasRemainingCandidates: false,
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
      selectedParentCategoryIds: ["education", "disaster-prevention"],
      preferenceVersion: 1,
      pushEnabled: false,
      vapidPublicKey: null,
    });

    render(
      <TodayRecommendationsSection
        availability={availabilityWith(["不登校支援", "学校改築", "防災情報"])}
      />
    );

    expect(
      await screen.findByText("案件カード: テスト案件タイトル")
    ).toBeVisible();
    expect(
      screen.getByRole("region", { name: "今日のおすすめ案件" })
    ).toBeVisible();
    expect(
      screen.queryByText("不登校支援・学校改築・防災情報")
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "このブラウザでは通知を利用できません。今日のおすすめはサイト内で確認できます。"
      )
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(
      screen.getByRole("button", { name: "毎朝、おすすめを受け取る" })
    ).toBeDisabled();
    await waitFor(() => {
      expect(mocks.recordRecommendationImpressions).toHaveBeenCalledWith(
        "11111111-1111-4111-8111-111111111111",
        ["22222222-2222-4222-8222-222222222222"]
      );
    });
  });

  it("records the same rendered bills again after a history reset changes the preference version", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify({
        installationId: "11111111-1111-4111-8111-111111111111",
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        completedAt: "2026-07-25T00:00:00.000Z",
        preferenceVersion: 1,
      })
    );
    const response = {
      recommendationDate: "2026-07-25",
      bills: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "テスト案件",
          bill_content: { title: "テスト案件タイトル" },
          tags: [],
        } as unknown as BillWithContent,
      ],
      hasRemainingCandidates: false,
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
      selectedParentCategoryIds: ["education", "disaster-prevention"],
      pushEnabled: false,
      vapidPublicKey: null,
    };
    mocks.fetchTodayRecommendations
      .mockResolvedValueOnce({ ...response, preferenceVersion: 1 })
      .mockResolvedValueOnce({ ...response, preferenceVersion: 2 });
    mocks.resetRecommendationHistory.mockResolvedValue({
      preferenceVersion: 2,
    });

    render(
      <TodayRecommendationsSection
        availability={availabilityWith(["不登校支援", "学校改築", "防災情報"])}
      />
    );

    await waitFor(() => {
      expect(mocks.recordRecommendationImpressions).toHaveBeenCalledTimes(1);
    });
    await user.click(screen.getByRole("button", { name: "設定" }));
    await user.click(
      screen.getByRole("button", { name: "表示履歴をリセット" })
    );
    await user.click(screen.getByRole("button", { name: "リセットする" }));

    await waitFor(() => {
      expect(mocks.recordRecommendationImpressions).toHaveBeenCalledTimes(2);
    });
  });

  it("keeps the notification stop action available when no recommendations remain", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify({
        installationId: "11111111-1111-4111-8111-111111111111",
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        completedAt: "2026-07-25T00:00:00.000Z",
        preferenceVersion: 1,
      })
    );
    mocks.fetchTodayRecommendations.mockResolvedValue({
      recommendationDate: "2026-07-25",
      bills: [],
      hasRemainingCandidates: false,
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
      selectedParentCategoryIds: ["education", "disaster-prevention"],
      preferenceVersion: 1,
      pushEnabled: true,
      vapidPublicKey: "AQID",
    });

    render(
      <TodayRecommendationsSection
        availability={availabilityWith(["不登校支援", "学校改築", "防災情報"])}
      />
    );

    expect(
      await screen.findByText(/新しくおすすめできる案件がありません/)
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "設定" }));
    expect(screen.getByRole("button", { name: "通知を停止" })).toBeVisible();
    expect(
      screen.getByRole("button", { name: "表示履歴をリセット" })
    ).toBeVisible();
  });
});

function availabilityWith(
  availableTags: RecommendationSmallTag[]
): RecommendationAvailability {
  return Object.fromEntries(
    RECOMMENDATION_SMALL_TAGS.map((tag) => [
      tag,
      availableTags.includes(tag) ? 1 : 0,
    ])
  ) as RecommendationAvailability;
}
