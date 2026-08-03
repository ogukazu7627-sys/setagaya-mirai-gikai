import { afterEach, describe, expect, it } from "vitest";
import type {
  BudgetTopicReviewSiteOptions,
  BudgetTopicReviewSiteSnapshot,
} from "./budget-topic-review-site";
import { startBudgetTopicReviewServer } from "./budget-topic-review-site-server";
import { createBudgetTopicReviewSiteTestFixture } from "./budget-topic-review-site-test-fixture";

const fixtureCleanup: Array<() => void> = [];

function createOptions(autoApprove = true): BudgetTopicReviewSiteOptions {
  const fixture = createBudgetTopicReviewSiteTestFixture({ autoApprove });
  fixtureCleanup.push(fixture.remove);
  return fixture.options;
}

afterEach(() => {
  for (const remove of fixtureCleanup.splice(0)) {
    remove();
  }
});

describe("budget topic review local server", () => {
  it("静的画面と全topic候補のAPIをlocalhostだけへ返す", async () => {
    const started = await startBudgetTopicReviewServer(createOptions(), 0);
    try {
      const page = await fetch(started.url);
      expect(page.status).toBe(200);
      expect(page.headers.get("content-security-policy")).toContain(
        "connect-src 'self'"
      );
      expect(page.headers.get("x-frame-options")).toBe("DENY");
      expect(await page.text()).toContain("課題と予算事業の候補レビュー");

      const response = await fetch(`${started.url}/api/review`);
      expect(response.status).toBe(200);
      const body = (await response.json()) as BudgetTopicReviewSiteSnapshot;
      expect(body.summary).toMatchObject({
        total: 2_312,
        pending: 0,
        automaticallyApproved: 582,
        manualReviewTotal: 0,
        manualPending: 0,
      });
    } finally {
      await started.close();
    }
  }, 10_000);

  it("外部originを拒否し、同一originの保存だけを受け付ける", async () => {
    const started = await startBudgetTopicReviewServer(createOptions(false), 0);
    try {
      const snapshotResponse = await fetch(`${started.url}/api/review`);
      const snapshot =
        (await snapshotResponse.json()) as BudgetTopicReviewSiteSnapshot;
      const target = snapshot.rows.find((row) => row.reviewDecision === "");
      expect(target).toBeDefined();
      if (!target) {
        throw new Error("未判断候補がありません");
      }
      const request = {
        revision: snapshot.revision,
        changes: [
          {
            reviewFile: target.reviewFile,
            budgetProgramIdentityId: target.budgetProgramIdentityId,
            reviewDecision: "reject",
            reviewNote: "対象外",
            proposedRelationType: target.proposedRelationType,
            proposedExplanation: target.proposedExplanation,
          },
        ],
      };

      const rejected = await fetch(`${started.url}/api/review`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: "https://example.com",
        },
        body: JSON.stringify(request),
      });
      expect(rejected.status).toBe(403);

      const saved = await fetch(`${started.url}/api/review`, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          origin: started.url,
        },
        body: JSON.stringify(request),
      });
      expect(saved.status).toBe(200);
      const body = (await saved.json()) as BudgetTopicReviewSiteSnapshot;
      expect(body.summary).toMatchObject({
        pending: 2_295,
        reject: 7,
        manualPending: 2_295,
        manualReject: 0,
      });
    } finally {
      await started.close();
    }
  });
});
