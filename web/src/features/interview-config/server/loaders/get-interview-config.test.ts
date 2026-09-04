import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findPublicInterviewConfigByBillId: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache: (callback: unknown) => callback,
}));

vi.mock("@/lib/setagaya-mock", () => ({
  isSetagayaMockMode: false,
}));

vi.mock("../repositories/interview-config-repository", () => ({
  findPublicInterviewConfigByBillId: mocks.findPublicInterviewConfigByBillId,
}));

import { getInterviewConfig } from "./get-interview-config";

describe("getInterviewConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UUIDではない案件IDはDBを照会せずnullを返す", async () => {
    await expect(getInterviewConfig("not-a-uuid")).resolves.toBeNull();

    expect(mocks.findPublicInterviewConfigByBillId).not.toHaveBeenCalled();
  });
});
