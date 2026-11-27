import { randomUUID } from "node:crypto";
import {
  cleanupTestDietSession,
  createTestDietSession,
} from "@test-utils/utils";
import { afterAll, describe, expect, it, vi } from "vitest";
import type { AdminDietSessionApiItem } from "@/features/admin/server/diet-session-admin-api";
import { GET, POST } from "./route";

vi.hoisted(() => {
  process.env.ADMIN_API_TOKEN = "test-admin-api-token";
  process.env.NEXT_PUBLIC_SUPABASE_URL =
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL ??
    "http://127.0.0.1:54421";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "test-publishable-key";
  delete process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE;
  delete process.env.SETAGAYA_MOCK_MODE;
});

const ADMIN_API_TOKEN = "test-admin-api-token";

type DietSessionApiResponse = {
  success: boolean;
  mode?: "created";
  dietSession?: AdminDietSessionApiItem;
  dietSessions?: AdminDietSessionApiItem[];
  error?: string;
  code?: string;
};

const sessionIds: string[] = [];

function uniqueName(label: string): string {
  return `テスト会期 ${label} ${randomUUID()}`;
}

function buildRequest(
  method: "GET" | "POST",
  body?: unknown,
  token: string | null = ADMIN_API_TOKEN
): Request {
  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request("http://localhost/api/admin/diet-sessions", {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : typeof body === "string"
          ? body
          : JSON.stringify(body),
  });
}

async function readJson(response: Response): Promise<DietSessionApiResponse> {
  return (await response.json()) as DietSessionApiResponse;
}

afterAll(async () => {
  await Promise.all(sessionIds.map((id) => cleanupTestDietSession(id)));
});

describe("GET /api/admin/diet-sessions", () => {
  it("トークンが無ければ401を返す", async () => {
    const response = await GET(buildRequest("GET", undefined, null));

    expect(response.status).toBe(401);
  });

  it("登録済みの会期を開始日の新しい順に返す", async () => {
    const older = await createTestDietSession({
      name: uniqueName("古い"),
      slug: `test-older-${randomUUID()}`,
      start_date: "2001-01-01",
      end_date: "2001-01-31",
    });
    const newer = await createTestDietSession({
      name: uniqueName("新しい"),
      slug: `test-newer-${randomUUID()}`,
      start_date: "2001-02-01",
      end_date: "2001-02-28",
    });
    sessionIds.push(older.id, newer.id);

    const response = await GET(buildRequest("GET"));
    const json = await readJson(response);

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    const ids = (json.dietSessions ?? []).map((session) => session.id);
    expect(ids).toContain(older.id);
    expect(ids).toContain(newer.id);
    expect(ids.indexOf(newer.id)).toBeLessThan(ids.indexOf(older.id));
  });
});

describe("POST /api/admin/diet-sessions", () => {
  it("トークンが違えば401を返し、登録しない", async () => {
    const response = await POST(
      buildRequest(
        "POST",
        {
          name: uniqueName("認証"),
          start_date: "2026-09-01",
          end_date: "2026-09-30",
        },
        "wrong-token"
      )
    );

    expect(response.status).toBe(401);
  });

  it("会期を登録し、is_activeはfalseのまま201を返す", async () => {
    const name = uniqueName("登録");
    const response = await POST(
      buildRequest("POST", {
        name,
        start_date: "2026-09-01",
        end_date: "2026-09-30",
      })
    );
    const json = await readJson(response);
    if (json.dietSession) sessionIds.push(json.dietSession.id);

    expect(response.status).toBe(201);
    expect(json.success).toBe(true);
    expect(json.mode).toBe("created");
    expect(json.dietSession).toMatchObject({
      name,
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      slug: null,
      is_active: false,
    });
  });

  it("空白の違いだけの同名の会期があれば登録せず409で既存の会期を返す", async () => {
    const suffix = randomUUID();
    const existing = await createTestDietSession({
      name: `令和1年1月　テスト重複常任委員会 ${suffix}`,
      slug: `test-duplicate-${randomUUID()}`,
      start_date: "2019-01-01",
      end_date: "2019-01-31",
    });
    sessionIds.push(existing.id);

    const response = await POST(
      buildRequest("POST", {
        name: `令和１年１月 テスト重複常任委員会 ${suffix}`,
        start_date: "2019-01-01",
        end_date: "2019-01-31",
      })
    );
    const json = await readJson(response);
    const listJson = await readJson(await GET(buildRequest("GET")));

    expect(response.status).toBe(409);
    expect(json.code).toBe("diet_session_name_conflict");
    expect(json.dietSession?.id).toBe(existing.id);
    expect(
      (listJson.dietSessions ?? []).filter((session) =>
        session.name.includes(suffix)
      )
    ).toHaveLength(1);
  });

  it("名前が違ってもslugが既存の会期と重なれば409を返す", async () => {
    const slug = `test-slug-conflict-${randomUUID()}`;
    const existing = await createTestDietSession({
      name: uniqueName("slug既存"),
      slug,
    });
    sessionIds.push(existing.id);

    const response = await POST(
      buildRequest("POST", {
        name: uniqueName("slug新規"),
        start_date: "2026-09-01",
        end_date: "2026-09-30",
        slug,
      })
    );
    const json = await readJson(response);

    expect(response.status).toBe(409);
    expect(json.code).toBe("diet_session_slug_conflict");
  });

  it("終了日が開始日より前なら400を返す", async () => {
    const response = await POST(
      buildRequest("POST", {
        name: uniqueName("日付"),
        start_date: "2026-09-30",
        end_date: "2026-09-01",
      })
    );
    const json = await readJson(response);

    expect(response.status).toBe(400);
    expect(json.code).toBe("invalid_diet_session");
  });

  it("JSONとして読めない本文なら400を返す", async () => {
    const response = await POST(buildRequest("POST", "{not json"));
    const json = await readJson(response);

    expect(response.status).toBe(400);
    expect(json.code).toBe("invalid_json");
  });
});
