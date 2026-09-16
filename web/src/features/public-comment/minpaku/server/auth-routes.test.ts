import { beforeEach, describe, expect, it, vi } from "vitest";
import { MINPAKU_ORDINANCES } from "../shared/campaign";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  findSession: vi.fn(),
  generate: vi.fn(),
}));
vi.mock("@/features/chat/server/utils/supabase-server", () => ({
  getChatSupabaseUser: mocks.getUser,
}));
vi.mock("@/lib/telemetry/register", () => ({ registerNodeTelemetry: vi.fn() }));
vi.mock("@/features/chat/server/services/system-cost-guard", () => ({
  checkSystemDailyCostLimit: vi.fn(),
  checkSystemMonthlyCostLimit: vi.fn(),
}));
vi.mock("./ai", () => ({
  generateInterviewResponse: mocks.generate,
  generatePublicCommentDraft: mocks.generate,
}));
vi.mock("./repository", () => ({
  findSessionForUser: mocks.findSession,
  appendMessage: vi.fn(),
  findMessages: vi.fn(),
  findDraft: vi.fn(),
  updateDraft: vi.fn(),
  upsertDraft: vi.fn(),
  completeSession: vi.fn(),
}));

import { POST as chat } from "@/app/api/public-comment/minpaku/chat/route";
import { POST as complete } from "@/app/api/public-comment/minpaku/complete/route";
import {
  POST as draft,
  PATCH as updateDraft,
} from "@/app/api/public-comment/minpaku/draft/route";
import { POST as receipt } from "@/app/api/public-comment/minpaku/receipt/route";
import { PUBLIC_COMMENT_CONSENT_VERSION } from "../shared/consent";

const endpoints = [
  {
    name: "chat",
    handler: chat,
    body: { sessionId: "session-1", content: "回答" },
  },
  {
    name: "draft",
    handler: draft,
    body: { sessionId: "session-1", targetOrdinances: [...MINPAKU_ORDINANCES] },
  },
  {
    name: "updateDraft",
    handler: updateDraft,
    body: {
      sessionId: "session-1",
      targetOrdinances: [...MINPAKU_ORDINANCES],
      finalBody: "本文",
    },
  },
  {
    name: "complete",
    handler: complete,
    body: {
      sessionId: "session-1",
      publicationRequested: false,
      receiptOptIn: true,
      consentVersion: PUBLIC_COMMENT_CONSENT_VERSION,
    },
  },
  { name: "receipt", handler: receipt, body: { sessionId: "session-1" } },
];

describe.each(endpoints)("民泊APIの認可: $name", ({ name, handler, body }) => {
  beforeEach(() => vi.resetAllMocks());
  it.each([
    null,
    { id: "anonymous", is_anonymous: true },
    {
      id: "password",
      email: "user@example.com",
      app_metadata: { provider: "email" },
    },
  ])("Google以外はDBやAIへ進めない: %j", async (user) => {
    mocks.getUser.mockResolvedValue({ data: { user }, error: null });
    const response = await handler(
      new Request(`http://localhost/api/public-comment/minpaku/${name}`, {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    expect(response.status).toBe(401);
    expect(mocks.findSession).not.toHaveBeenCalled();
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("Googleログイン後も別人のセッションは利用できない", async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: "google-user",
          email: "user@example.com",
          app_metadata: { provider: "google" },
        },
      },
      error: null,
    });
    mocks.findSession.mockResolvedValue(null);
    const response = await handler(
      new Request(`http://localhost/api/public-comment/minpaku/${name}`, {
        method: "POST",
        body: JSON.stringify(body),
      })
    );
    expect(response.status).toBe(404);
    expect(mocks.findSession).toHaveBeenCalledWith("session-1", "google-user");
    expect(mocks.generate).not.toHaveBeenCalled();
  });
});
