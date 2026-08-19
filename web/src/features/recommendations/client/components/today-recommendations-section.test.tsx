// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BillCardData } from "@/features/bills/shared/types";
import {
  RECOMMENDATION_SMALL_TAGS,
  type RecommendationSmallTag,
} from "../../shared/constants/recommendation-taxonomy";
import type { RecommendationAvailability } from "../../shared/types/recommendation";
import { getJstDateKey } from "../../shared/utils/jst-date";
import {
  RECOMMENDATION_ONBOARDING_DISMISSED_STORAGE_KEY,
  RECOMMENDATION_PROFILE_STORAGE_KEY,
} from "../utils/recommendation-storage";
import {
  TODAY_RECOMMENDATIONS_CACHE_KEY,
  writeTodayRecommendationsCache,
} from "../utils/today-recommendations-cache";

const mocks = vi.hoisted(() => ({
  fetchRecommendationAvailability: vi.fn(),
  fetchTodayRecommendations: vi.fn(),
  fetchRandomRecommendations: vi.fn(),
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
    fetchRecommendationAvailability: mocks.fetchRecommendationAvailability,
    fetchTodayRecommendations: mocks.fetchTodayRecommendations,
    fetchRandomRecommendations: mocks.fetchRandomRecommendations,
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
  BillCard: ({ bill }: { bill: BillCardData }) => (
    <div>案件カード: {bill.bill_content?.title}</div>
  ),
}));

import { TodayRecommendationsSection } from "./today-recommendations-section";

describe("TodayRecommendationsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.fetchRecommendationAvailability.mockResolvedValue(
      availabilityWith(["不登校支援", "学校改築", "防災情報"])
    );
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

  it("shows onboarding only when the versioned local profile is absent", async () => {
    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    expect(
      await screen.findByRole("dialog", { name: "興味のある分野を選ぶ" })
    ).toBeVisible();
    expect(mocks.fetchRecommendationAvailability).toHaveBeenCalledTimes(1);
    expect(mocks.fetchTodayRecommendations).not.toHaveBeenCalled();
  });

  it("興味分野を選ばずに閉じたときはランダムなおすすめを表示する", async () => {
    const user = userEvent.setup();
    mocks.fetchRandomRecommendations.mockResolvedValue({
      bills: [
        {
          id: "33333333-3333-4333-8333-333333333333",
          name: "ランダム案件",
          bill_content: { title: "ランダム案件タイトル" },
          tags: [],
        } as unknown as BillCardData,
      ],
    });

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    const dialog = await screen.findByRole("dialog", {
      name: "興味のある分野を選ぶ",
    });
    await user.click(
      within(dialog).getByRole("button", { name: "今は選ばない" })
    );

    expect(
      await screen.findByText("案件カード: ランダム案件タイトル")
    ).toBeVisible();
    expect(
      screen.getByText(
        "興味分野が未設定のため、公開中の案件からランダムに表示しています。"
      )
    ).toBeVisible();
    expect(mocks.fetchTodayRecommendations).not.toHaveBeenCalled();
    expect(mocks.savePreferences).not.toHaveBeenCalled();
  });

  it("一度閉じた利用者には再訪時もモーダルを出さない", async () => {
    window.localStorage.setItem(
      RECOMMENDATION_ONBOARDING_DISMISSED_STORAGE_KEY,
      "1"
    );
    mocks.fetchRandomRecommendations.mockResolvedValue({
      bills: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          name: "再訪ランダム案件",
          bill_content: { title: "再訪ランダム案件タイトル" },
          tags: [],
        } as unknown as BillCardData,
      ],
    });

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    expect(
      await screen.findByText("案件カード: 再訪ランダム案件タイトル")
    ).toBeVisible();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.fetchRecommendationAvailability).not.toHaveBeenCalled();
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
        } as unknown as BillCardData,
      ],
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
      selectedParentCategoryIds: ["education", "disaster-prevention"],
      preferenceVersion: 1,
      pushEnabled: false,
      vapidPublicKey: null,
    });

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

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
    expect(mocks.fetchRecommendationAvailability).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "興味分野を変更" }));
    expect(
      await screen.findByRole("dialog", { name: "興味分野を変更" })
    ).toBeVisible();
    expect(mocks.fetchRecommendationAvailability).toHaveBeenCalledTimes(1);
    await waitFor(
      () => {
        expect(mocks.recordRecommendationImpressions).toHaveBeenCalledWith(
          "11111111-1111-4111-8111-111111111111",
          ["22222222-2222-4222-8222-222222222222"]
        );
      },
      { timeout: 2000 }
    );
  });

  it("新しい当日キャッシュを即表示し、API呼び出しも省略する", async () => {
    const installationId = "11111111-1111-4111-8111-111111111111";
    const profile = {
      installationId,
      selectedParentCategoryIds: ["education", "disaster-prevention"] as const,
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"] as const,
      completedAt: "2026-07-25T00:00:00.000Z",
      preferenceVersion: 1,
    };
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify(profile)
    );
    writeTodayRecommendationsCache(
      window.localStorage,
      {
        installationId,
        preferenceVersion: 1,
        difficultyLevel: "normal",
      },
      {
        recommendationDate: getJstDateKey(),
        bills: [
          {
            id: "33333333-3333-4333-8333-333333333333",
            name: "キャッシュ案件",
            bill_content: { title: "キャッシュから即表示" },
            tags: [],
          } as unknown as BillCardData,
        ],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        preferenceVersion: 1,
        pushEnabled: false,
        vapidPublicKey: null,
      }
    );
    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    expect(
      await screen.findByText("案件カード: キャッシュから即表示")
    ).toBeVisible();
    expect(mocks.fetchTodayRecommendations).not.toHaveBeenCalled();
    expect(
      screen.queryByText("おすすめを読み込んでいます...")
    ).not.toBeInTheDocument();
  });

  it("古い当日キャッシュを即表示しながら裏で再検証する", async () => {
    const installationId = "11111111-1111-4111-8111-111111111111";
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify({
        installationId,
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        completedAt: "2026-07-25T00:00:00.000Z",
        preferenceVersion: 1,
      })
    );
    writeTodayRecommendationsCache(
      window.localStorage,
      {
        installationId,
        preferenceVersion: 1,
        difficultyLevel: "normal",
      },
      {
        recommendationDate: getJstDateKey(),
        bills: [
          {
            id: "44444444-4444-4444-8444-444444444444",
            name: "再検証案件",
            bill_content: { title: "古いキャッシュを先に表示" },
            tags: [],
          } as unknown as BillCardData,
        ],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        preferenceVersion: 1,
        pushEnabled: false,
        vapidPublicKey: null,
      }
    );
    const stored = JSON.parse(
      window.localStorage.getItem(TODAY_RECOMMENDATIONS_CACHE_KEY) ?? "{}"
    ) as Record<string, unknown>;
    stored.cachedAt = "2000-01-01T00:00:00.000Z";
    window.localStorage.setItem(
      TODAY_RECOMMENDATIONS_CACHE_KEY,
      JSON.stringify(stored)
    );
    mocks.fetchTodayRecommendations.mockReturnValue(new Promise(() => {}));

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    expect(
      await screen.findByText("案件カード: 古いキャッシュを先に表示")
    ).toBeVisible();
    expect(mocks.fetchTodayRecommendations).toHaveBeenCalledWith(
      installationId
    );
    expect(
      screen.queryByText("おすすめを読み込んでいます...")
    ).not.toBeInTheDocument();
  });

  it("古い再検証結果で新しい難易度の表示を上書きしない", async () => {
    const installationId = "11111111-1111-4111-8111-111111111111";
    window.localStorage.setItem(
      RECOMMENDATION_PROFILE_STORAGE_KEY,
      JSON.stringify({
        installationId,
        selectedParentCategoryIds: ["education", "disaster-prevention"],
        selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
        completedAt: "2026-07-25T00:00:00.000Z",
        preferenceVersion: 1,
      })
    );
    let resolveFirstRequest: (
      value: ReturnType<typeof recommendationResponse>
    ) => void = () => {};
    const firstRequest = new Promise<ReturnType<typeof recommendationResponse>>(
      (resolve) => {
        resolveFirstRequest = resolve;
      }
    );
    mocks.fetchTodayRecommendations
      .mockReturnValueOnce(firstRequest)
      .mockResolvedValueOnce(recommendationResponse("難しい表示"));

    const { rerender } = render(
      <TodayRecommendationsSection currentDifficulty="normal" />
    );
    await waitFor(() => {
      expect(mocks.fetchTodayRecommendations).toHaveBeenCalledTimes(1);
    });

    rerender(<TodayRecommendationsSection currentDifficulty="hard" />);
    expect(await screen.findByText("案件カード: 難しい表示")).toBeVisible();

    await act(async () => {
      resolveFirstRequest(recommendationResponse("古い普通表示"));
      await firstRequest;
    });
    expect(
      screen.queryByText("案件カード: 古い普通表示")
    ).not.toBeInTheDocument();
    expect(screen.getByText("案件カード: 難しい表示")).toBeVisible();
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
        } as unknown as BillCardData,
      ],
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

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

    await waitFor(
      () => {
        expect(mocks.recordRecommendationImpressions).toHaveBeenCalledTimes(1);
      },
      { timeout: 2000 }
    );
    await user.click(screen.getByRole("button", { name: "設定" }));
    await user.click(
      screen.getByRole("button", { name: "表示履歴をリセット" })
    );
    await user.click(screen.getByRole("button", { name: "リセットする" }));

    await waitFor(
      () => {
        expect(mocks.recordRecommendationImpressions).toHaveBeenCalledTimes(2);
      },
      { timeout: 2000 }
    );
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
      selectedSmallTags: ["不登校支援", "学校改築", "防災情報"],
      selectedParentCategoryIds: ["education", "disaster-prevention"],
      preferenceVersion: 1,
      pushEnabled: true,
      vapidPublicKey: "AQID",
    });

    render(<TodayRecommendationsSection currentDifficulty="normal" />);

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

function recommendationResponse(title: string) {
  return {
    recommendationDate: getJstDateKey(),
    bills: [
      {
        id: "55555555-5555-4555-8555-555555555555",
        name: title,
        bill_content: { title },
        tags: [],
      } as unknown as BillCardData,
    ],
    selectedSmallTags: ["不登校支援", "学校改築", "防災情報"] as const,
    selectedParentCategoryIds: ["education", "disaster-prevention"] as const,
    preferenceVersion: 1,
    pushEnabled: false,
    vapidPublicKey: null,
  };
}
