import { beforeEach, describe, expect, it, vi } from "vitest";
import { CACHE_TAGS } from "@/lib/cache-tags";

const mocks = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  const from = vi.fn(() => query);
  return {
    createAdminClient: vi.fn(() => ({ from })),
    from,
    maybeSingle,
    query,
    reactCache: vi.fn((loader: (...args: never[]) => unknown) => loader),
    unstableCache: vi.fn((loader: (...args: never[]) => unknown) => loader),
  };
});

vi.mock("@mirai-gikai/supabase", () => ({
  createAdminClient: mocks.createAdminClient,
}));

vi.mock("next/cache", () => ({
  unstable_cache: mocks.unstableCache,
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return { ...actual, cache: mocks.reactCache };
});

vi.mock("@/lib/setagaya-mock", () => ({
  isSetagayaMockMode: false,
}));

import { getPublishedBillRedirectReference } from "./get-published-bill-redirect-reference";

describe("getPublishedBillRedirectReference", () => {
  beforeEach(() => {
    mocks.createAdminClient.mockClear();
    mocks.from.mockClear();
    mocks.query.select.mockClear();
    mocks.query.eq.mockClear();
    mocks.maybeSingle.mockReset();
  });

  it("returns a budget category redirect from one bill query", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        publication_category: "budget",
        major_category: "教育🏫",
        diet_session: null,
      },
      error: null,
    });

    await expect(getPublishedBillRedirectReference("bill-1")).resolves.toEqual({
      kind: "budget",
      categorySlug: "education",
    });
    expect(mocks.from).toHaveBeenCalledOnce();
    expect(mocks.from).toHaveBeenCalledWith("bills");
  });

  it("returns a general question category and session year", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        publication_category: "general_question",
        major_category: "教育🏫",
        diet_session: { start_date: "2026-02-18" },
      },
      error: null,
    });

    await expect(getPublishedBillRedirectReference("bill-2")).resolves.toEqual({
      kind: "general_question",
      categoryId: "education",
      year: 2026,
    });
  });

  it("returns null for a regular report", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        publication_category: "report",
        major_category: "教育🏫",
        diet_session: null,
      },
      error: null,
    });

    await expect(
      getPublishedBillRedirectReference("bill-3")
    ).resolves.toBeNull();
  });

  it("defines a bill-tagged ten minute cache", () => {
    expect(mocks.unstableCache).toHaveBeenCalledWith(
      expect.any(Function),
      ["published-bill-redirect-reference"],
      {
        revalidate: 600,
        tags: [CACHE_TAGS.BILLS],
      }
    );
  });
});
