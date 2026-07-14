import {
  cleanupTestDietSession,
  createTestDietSession,
} from "@test-utils/utils";
import { afterEach, describe, expect, it } from "vitest";
import {
  findActiveDietSession,
  findCurrentDietSession,
  findDietSessionBySlug,
  findDietSessionsStartingBefore,
  findDietSessionsStartingBetween,
  findPreviousDietSession,
} from "./diet-session-repository";

describe("diet-session-repository 統合テスト", () => {
  const sessionIds: string[] = [];

  afterEach(async () => {
    for (const id of sessionIds) {
      await cleanupTestDietSession(id);
    }
    sessionIds.length = 0;
  });

  describe("findActiveDietSession", () => {
    it("is_active=true の会期を返す", async () => {
      const session = await createTestDietSession({ is_active: true });
      sessionIds.push(session.id);

      const result = await findActiveDietSession();

      expect(result).not.toBeNull();
      expect(result?.is_active).toBe(true);
    });
  });

  describe("findCurrentDietSession", () => {
    it("指定日が範囲内の会期を返す", async () => {
      const session = await createTestDietSession({
        start_date: "2028-04-01",
        end_date: "2028-09-30",
        is_active: false,
      });
      sessionIds.push(session.id);

      const result = await findCurrentDietSession("2028-06-15");

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session.id);
    });

    it("開始日ちょうどの日付で会期を返す", async () => {
      const session = await createTestDietSession({
        start_date: "2028-04-01",
        end_date: "2028-09-30",
        is_active: false,
      });
      sessionIds.push(session.id);

      const result = await findCurrentDietSession("2028-04-01");

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session.id);
    });

    it("終了日ちょうどの日付で会期を返す", async () => {
      const session = await createTestDietSession({
        start_date: "2028-04-01",
        end_date: "2028-09-30",
        is_active: false,
      });
      sessionIds.push(session.id);

      const result = await findCurrentDietSession("2028-09-30");

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session.id);
    });

    it("同じ日に複数の会期があっても該当会期を返す", async () => {
      const timestamp = Date.now();
      const first = await createTestDietSession({
        name: "テスト同日会期A",
        start_date: "2034-05-27",
        end_date: "2034-05-27",
        slug: `test-overlap-a-${timestamp}`,
        is_active: false,
      });
      const second = await createTestDietSession({
        name: "テスト同日会期B",
        start_date: "2034-05-27",
        end_date: "2034-05-27",
        slug: `test-overlap-b-${timestamp}`,
        is_active: false,
      });
      sessionIds.push(first.id, second.id);

      const result = await findCurrentDietSession("2034-05-27");

      expect(result).not.toBeNull();
      expect([first.id, second.id]).toContain(result?.id);
    });

    it("範囲外の日付では該当会期を返さない", async () => {
      const session = await createTestDietSession({
        start_date: "2032-04-01",
        end_date: "2032-09-30",
        is_active: false,
      });
      sessionIds.push(session.id);

      const result = await findCurrentDietSession("2032-10-01");

      if (result) {
        expect(result.id).not.toBe(session.id);
      } else {
        expect(result).toBeNull();
      }
    });
  });

  describe("findDietSessionBySlug", () => {
    it("slug で会期を取得できる", async () => {
      const slug = `test-repo-slug-${Date.now()}`;
      const session = await createTestDietSession({ slug });
      sessionIds.push(session.id);

      const result = await findDietSessionBySlug(slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(session.id);
      expect(result?.slug).toBe(slug);
    });

    it("存在しない slug では null を返す", async () => {
      const result = await findDietSessionBySlug("non-existent-slug-999999999");

      expect(result).toBeNull();
    });
  });

  describe("findDietSessionsStartingBetween", () => {
    it("指定期間に開始した会期だけを返す", async () => {
      const inside = await createTestDietSession({
        start_date: "2030-04-01",
        end_date: "2030-06-30",
        is_active: false,
      });
      const outside = await createTestDietSession({
        start_date: "2031-04-01",
        end_date: "2031-06-30",
        is_active: false,
      });
      sessionIds.push(inside.id, outside.id);

      const result = await findDietSessionsStartingBetween(
        "2030-04-01",
        "2031-03-31"
      );

      expect(result.map((session) => session.id)).toContain(inside.id);
      expect(result.map((session) => session.id)).not.toContain(outside.id);
    });
  });

  describe("findDietSessionsStartingBefore", () => {
    it("指定日より前に開始した会期だけを返す", async () => {
      const previous = await createTestDietSession({
        start_date: "2033-03-31",
        end_date: "2033-06-30",
        is_active: false,
      });
      const current = await createTestDietSession({
        start_date: "2033-04-01",
        end_date: "2033-06-30",
        is_active: false,
      });
      sessionIds.push(previous.id, current.id);

      const result = await findDietSessionsStartingBefore("2033-04-01");

      expect(result.map((session) => session.id)).toContain(previous.id);
      expect(result.map((session) => session.id)).not.toContain(current.id);
    });
  });

  describe("findPreviousDietSession", () => {
    it("指定日より前の直近の会期を返す", async () => {
      const session = await createTestDietSession({
        start_date: "2027-01-01",
        end_date: "2027-06-30",
        is_active: false,
      });
      sessionIds.push(session.id);

      const result = await findPreviousDietSession("2028-01-01");

      expect(result).not.toBeNull();
      // biome-ignore lint/style/noNonNullAssertion: toBeNull 後に安全
      expect(new Date(result!.start_date) < new Date("2028-01-01")).toBe(true);
    });

    it("指定日より前の会期がない場合は null を返す", async () => {
      const result = await findPreviousDietSession("1900-01-01");

      expect(result).toBeNull();
    });
  });
});
