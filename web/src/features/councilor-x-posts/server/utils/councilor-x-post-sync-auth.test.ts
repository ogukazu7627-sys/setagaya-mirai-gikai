import { afterEach, describe, expect, it, vi } from "vitest";
import {
  hasExpectedCouncilorXPostSyncGithubClaims,
  isCouncilorXPostSyncRequestAuthorized,
} from "./councilor-x-post-sync-auth";

const endpoint = "https://civictech-setagaya.org/api/cron/councilor-x-posts";

describe("isCouncilorXPostSyncRequestAuthorized", () => {
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("既存のCRON_SECRETを受け付ける", async () => {
    process.env.CRON_SECRET = "test-cron-secret";
    const verifyGithubActionsToken = vi.fn();

    const authorized = await isCouncilorXPostSyncRequestAuthorized(
      new Request(endpoint, {
        headers: { Authorization: "Bearer test-cron-secret" },
      }),
      { verifyGithubActionsToken }
    );

    expect(authorized).toBe(true);
    expect(verifyGithubActionsToken).not.toHaveBeenCalled();
  });

  it("GitHub Actions OIDCの検証に成功したトークンを受け付ける", async () => {
    const verifyGithubActionsToken = vi.fn().mockResolvedValue(true);

    const authorized = await isCouncilorXPostSyncRequestAuthorized(
      new Request(endpoint, {
        headers: { Authorization: "Bearer github-oidc-token" },
      }),
      { verifyGithubActionsToken }
    );

    expect(authorized).toBe(true);
    expect(verifyGithubActionsToken).toHaveBeenCalledWith("github-oidc-token");
  });

  it("認証情報なし、検証失敗、検証例外を拒否する", async () => {
    const verifyGithubActionsToken = vi.fn().mockResolvedValue(false);

    await expect(
      isCouncilorXPostSyncRequestAuthorized(new Request(endpoint), {
        verifyGithubActionsToken,
      })
    ).resolves.toBe(false);
    await expect(
      isCouncilorXPostSyncRequestAuthorized(
        new Request(endpoint, {
          headers: { Authorization: "Bearer invalid-token" },
        }),
        { verifyGithubActionsToken }
      )
    ).resolves.toBe(false);
    await expect(
      isCouncilorXPostSyncRequestAuthorized(
        new Request(endpoint, {
          headers: { Authorization: "Bearer invalid-token" },
        }),
        {
          verifyGithubActionsToken: vi
            .fn()
            .mockRejectedValue(new Error("verification failed")),
        }
      )
    ).resolves.toBe(false);
  });
});

describe("hasExpectedCouncilorXPostSyncGithubClaims", () => {
  const validClaims = {
    repository: "ogukazu7627-sys/setagaya-mirai-gikai",
    repository_id: "1291369822",
    repository_owner_id: "272612047",
    ref: "refs/heads/main",
    workflow_ref:
      "ogukazu7627-sys/setagaya-mirai-gikai/.github/workflows/councilor_x_posts.yml@refs/heads/main",
    sub: "repo:ogukazu7627-sys/setagaya-mirai-gikai:ref:refs/heads/main",
    event_name: "schedule",
  };

  it("main上の専用workflowだけを許可する", () => {
    expect(hasExpectedCouncilorXPostSyncGithubClaims(validClaims)).toBe(true);
    expect(
      hasExpectedCouncilorXPostSyncGithubClaims({
        ...validClaims,
        ref: "refs/heads/feature",
      })
    ).toBe(false);
    expect(
      hasExpectedCouncilorXPostSyncGithubClaims({
        ...validClaims,
        repository_id: "different-repository-id",
      })
    ).toBe(false);
    expect(
      hasExpectedCouncilorXPostSyncGithubClaims({
        ...validClaims,
        workflow_ref:
          "ogukazu7627-sys/setagaya-mirai-gikai/.github/workflows/other.yml@refs/heads/main",
      })
    ).toBe(false);
  });

  it("定期実行と手動実行だけを許可する", () => {
    expect(
      hasExpectedCouncilorXPostSyncGithubClaims({
        ...validClaims,
        event_name: "workflow_dispatch",
      })
    ).toBe(true);
    expect(
      hasExpectedCouncilorXPostSyncGithubClaims({
        ...validClaims,
        event_name: "pull_request",
      })
    ).toBe(false);
  });
});
