import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCommitteeBills } from "./load-committee-bills";

// @ts-expect-error Vitest supports virtual mocks for Next's server-only marker.
vi.mock("server-only", () => ({}), { virtual: true });

const mocks = vi.hoisted(() => ({
  findDietSessionsStartingBetween: vi.fn(),
  findPublishedBillsByCommitteeSearchTerm: vi.fn(),
  buildBillsWithContent: vi.fn(),
}));

vi.mock(
  "@/features/diet-sessions/server/repositories/diet-session-repository",
  () => ({
    findDietSessionsStartingBetween: mocks.findDietSessionsStartingBetween,
  })
);

vi.mock("@/features/bills/server/repositories/bill-repository", () => ({
  findPublishedBillsByCommitteeSearchTerm:
    mocks.findPublishedBillsByCommitteeSearchTerm,
}));

vi.mock("@/features/bills/server/utils/build-bills-with-content", () => ({
  buildBillsWithContent: mocks.buildBillsWithContent,
}));

vi.mock("@/lib/setagaya-mock", () => ({
  getSetagayaMockBills: vi.fn(),
  isSetagayaMockMode: false,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findDietSessionsStartingBetween.mockResolvedValue([
    { id: "session-2026-a" },
    { id: "session-2026-b" },
  ]);
  mocks.findPublishedBillsByCommitteeSearchTerm.mockResolvedValue([
    { id: "bill-row" },
  ]);
  mocks.buildBillsWithContent.mockResolvedValue([{ id: "bill-2026" }]);
});

describe("loadCommitteeBills", () => {
  it("loads committee cases only from sessions starting this year", async () => {
    const result = await loadCommitteeBills(
      "文教常任委員会",
      "normal",
      new Date("2026-07-26T12:00:00+09:00")
    );

    expect(mocks.findDietSessionsStartingBetween).toHaveBeenCalledWith(
      "2026-01-01",
      "2026-12-31"
    );
    expect(mocks.findPublishedBillsByCommitteeSearchTerm).toHaveBeenCalledWith(
      "文教",
      "normal",
      ["session-2026-a", "session-2026-b"],
      6
    );
    expect(result).toEqual([{ id: "bill-2026" }]);
  });
});
