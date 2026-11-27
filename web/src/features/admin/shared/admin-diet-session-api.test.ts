import { describe, expect, it } from "vitest";
import {
  adminDietSessionCreateApiSchema,
  dietSessionFormSchema,
  findDietSessionByComparableName,
} from "./admin-diet-session-api";

describe("adminDietSessionCreateApiSchema", () => {
  it("会期名・開始日・終了日を受け付け、slugを省略するとnullにする", () => {
    const result = adminDietSessionCreateApiSchema.parse({
      name: " 令和８年９月 都市整備常任委員会 ",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
    });

    expect(result).toEqual({
      name: "令和８年９月 都市整備常任委員会",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      slug: null,
    });
  });

  it("空文字のslugはnullにする", () => {
    const result = adminDietSessionCreateApiSchema.parse({
      name: "令和8年第3回世田谷区議会定例会",
      start_date: "2026-09-15",
      end_date: "2026-10-20",
      slug: "  ",
    });

    expect(result.slug).toBeNull();
  });

  it("終了日が開始日より前なら拒否する", () => {
    const result = adminDietSessionCreateApiSchema.safeParse({
      name: "令和８年９月 都市整備常任委員会",
      start_date: "2026-09-30",
      end_date: "2026-09-01",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(["end_date"]);
  });

  it("日付の形が違えば拒否する", () => {
    const result = adminDietSessionCreateApiSchema.safeParse({
      name: "令和８年９月 都市整備常任委員会",
      start_date: "2026/09/01",
      end_date: "2026-09-30",
    });

    expect(result.success).toBe(false);
  });

  it("存在しない日付なら拒否する", () => {
    const result = adminDietSessionCreateApiSchema.safeParse({
      name: "令和８年２月 都市整備常任委員会",
      start_date: "2026-02-01",
      end_date: "2026-02-30",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("存在しない日付です");
  });

  it("会期名が空なら拒否する", () => {
    const result = adminDietSessionCreateApiSchema.safeParse({
      name: "   ",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
    });

    expect(result.success).toBe(false);
  });

  it("is_activeやidなどAPIで扱わない項目が来たら拒否する", () => {
    for (const extra of [
      { is_active: true },
      { id: "6f1c2b9e-1f7a-4c1d-9a51-0f1f2e3d4c5b" },
    ]) {
      const result = adminDietSessionCreateApiSchema.safeParse({
        name: "令和８年９月 都市整備常任委員会",
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        ...extra,
      });

      expect(result.success).toBe(false);
    }
  });
});

describe("dietSessionFormSchema", () => {
  it("管理画面のフォームでは更新用のidを受け付ける", () => {
    const result = dietSessionFormSchema.parse({
      id: "6f1c2b9e-1f7a-4c1d-9a51-0f1f2e3d4c5b",
      name: "令和８年９月 都市整備常任委員会",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      slug: null,
    });

    expect(result.id).toBe("6f1c2b9e-1f7a-4c1d-9a51-0f1f2e3d4c5b");
    expect(result.slug).toBeNull();
  });

  it("管理画面のフォームでも終了日が開始日より前なら拒否する", () => {
    const result = dietSessionFormSchema.safeParse({
      name: "令和８年９月 都市整備常任委員会",
      start_date: "2026-09-30",
      end_date: "2026-09-01",
      slug: null,
    });

    expect(result.success).toBe(false);
  });
});

describe("findDietSessionByComparableName", () => {
  const sessions = [
    { id: "a", name: "令和８年５月 都市整備常任委員会" },
    { id: "b", name: "令和８年５月　区民生活常任委員会" },
  ];

  it("半角・全角の空白の違いを無視して既存の会期を見つける", () => {
    expect(
      findDietSessionByComparableName(
        sessions,
        "令和８年５月 区民生活常任委員会"
      )?.id
    ).toBe("b");
  });

  it("全角数字と半角数字の違いを無視して既存の会期を見つける", () => {
    expect(
      findDietSessionByComparableName(sessions, "令和8年5月都市整備常任委員会")
        ?.id
    ).toBe("a");
  });

  it("月や委員会名が違えばundefinedを返す", () => {
    expect(
      findDietSessionByComparableName(
        sessions,
        "令和８年９月 都市整備常任委員会"
      )
    ).toBeUndefined();
    expect(
      findDietSessionByComparableName(sessions, "令和８年５月 文教常任委員会")
    ).toBeUndefined();
  });
});
