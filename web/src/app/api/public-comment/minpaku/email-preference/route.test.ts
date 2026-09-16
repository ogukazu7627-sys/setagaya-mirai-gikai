import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), save: vi.fn() }));
vi.mock("@/features/public-comment/minpaku/server/auth", () => ({
  getPublicCommentUser: mocks.getUser,
}));
vi.mock(
  "@/features/public-comment/minpaku/server/email-preference-repository",
  () => ({ savePublicCommentEmailPreference: mocks.save })
);

import { DELETE } from "./route";

describe("案内メール配信停止", () => {
  beforeEach(() => vi.resetAllMocks());
  it("未ログインでは保存しない", async () => {
    mocks.getUser.mockResolvedValue(null);
    expect((await DELETE()).status).toBe(401);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("インタビューを作らず本人の配信だけ停止する", async () => {
    mocks.getUser.mockResolvedValue({ id: "google-user" });
    const response = await DELETE();
    expect(response.status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("google-user", false);
    expect(await response.json()).toEqual({ optedIn: false });
  });
  it("保存に失敗したら成功とは返さない", async () => {
    mocks.getUser.mockResolvedValue({ id: "google-user" });
    mocks.save.mockRejectedValue(new Error("failed"));
    expect((await DELETE()).status).toBe(500);
  });
});
