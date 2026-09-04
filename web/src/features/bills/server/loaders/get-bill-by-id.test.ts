import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMiraiStanceByBillId: vi.fn(),
  findPublishedBillById: vi.fn(),
  findTagsByBillId: vi.fn(),
  getBillContentWithDifficulty: vi.fn(),
  getDifficultyLevel: vi.fn(),
  getSetagayaMockBillById: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
}));

vi.mock(
  "@/features/bill-difficulty/server/loaders/get-difficulty-level",
  () => ({ getDifficultyLevel: mocks.getDifficultyLevel })
);

vi.mock("@/lib/setagaya-mock", () => ({
  getSetagayaMockBillById: mocks.getSetagayaMockBillById,
  isSetagayaMockMode: false,
}));

vi.mock("../repositories/bill-repository", () => ({
  findMiraiStanceByBillId: mocks.findMiraiStanceByBillId,
  findPublishedBillById: mocks.findPublishedBillById,
  findTagsByBillId: mocks.findTagsByBillId,
}));

vi.mock("./helpers/get-bill-content", () => ({
  getBillContentWithDifficulty: mocks.getBillContentWithDifficulty,
}));

import { getBillById } from "./get-bill-by-id";

const BILL_ID = "123e4567-e89b-42d3-a456-426614174000";

describe("getBillById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getDifficultyLevel.mockResolvedValue("normal");
    mocks.findMiraiStanceByBillId.mockResolvedValue(null);
    mocks.getBillContentWithDifficulty.mockResolvedValue(null);
    mocks.findTagsByBillId.mockResolvedValue([]);
  });

  it("UUIDではないパスはDBやcookieを読まずnullを返す", async () => {
    await expect(getBillById("not-a-uuid")).resolves.toBeNull();

    expect(mocks.getDifficultyLevel).not.toHaveBeenCalled();
    expect(mocks.findPublishedBillById).not.toHaveBeenCalled();
  });

  it("案件が存在しない場合は関連テーブルを照会せずnullを返す", async () => {
    mocks.findPublishedBillById.mockResolvedValue(null);

    await expect(getBillById(BILL_ID)).resolves.toBeNull();

    expect(mocks.findPublishedBillById).toHaveBeenCalledWith(BILL_ID);
    expect(mocks.findMiraiStanceByBillId).not.toHaveBeenCalled();
    expect(mocks.getBillContentWithDifficulty).not.toHaveBeenCalled();
    expect(mocks.findTagsByBillId).not.toHaveBeenCalled();
  });

  it("案件が存在する場合だけ本文・見解・タグをまとめて返す", async () => {
    mocks.findPublishedBillById.mockResolvedValue({
      id: BILL_ID,
      name: "テスト案件",
    });
    mocks.findMiraiStanceByBillId.mockResolvedValue({ stance: "neutral" });
    mocks.getBillContentWithDifficulty.mockResolvedValue({
      title: "テストタイトル",
    });
    mocks.findTagsByBillId.mockResolvedValue([
      {
        tags: {
          id: "tag-1",
          label: "教育DX",
          major_category: "教育🏫",
        },
      },
    ]);

    await expect(getBillById(BILL_ID)).resolves.toMatchObject({
      id: BILL_ID,
      bill_content: { title: "テストタイトル" },
      mirai_stance: { stance: "neutral" },
      tags: [{ id: "tag-1", label: "教育DX" }],
    });
  });

  it("実際のDB取得失敗は404扱いにせず呼び出し元へ伝える", async () => {
    mocks.findPublishedBillById.mockRejectedValue(
      new Error("database unavailable")
    );

    await expect(getBillById(BILL_ID)).rejects.toThrow("database unavailable");
  });
});
