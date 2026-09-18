import { describe, expect, it, vi } from "vitest";
import { QUESTION_PRESENTATIONS } from "@/features/public-comment/shared/question-presentations";

// Only checks route wiring; actual persistence/authorization is covered with real DB integration tests.
vi.mock("@/features/public-comment/shared/server/interview-routes", () => ({
  createInterviewRoutes: (key: string) => ({
    session: async () => Response.json({ key, kind: "session" }),
    chat: async () => Response.json({ key, kind: "chat" }),
  }),
}));

describe.each(
  Object.keys(QUESTION_PRESENTATIONS)
)("%s の共通進行への接続", (key) => {
  it.each([
    "chat",
    "session",
  ])("%s は正しいキャンペーンに委譲する", async (kind) => {
    const { POST } = await import(`./${key}/${kind}/route`);
    expect(await (await POST(new Request("http://localhost"))).json()).toEqual({
      key,
      kind,
    });
  });
});
