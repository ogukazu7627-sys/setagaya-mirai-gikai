import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { runBudgetTopicPublishCli } from "./publish-reviewed-budget-topic-cli";

const reviewedCandidatesPath = fileURLToPath(
  new URL(
    "../../../data/budget/editorial/review/education-school-aging-candidates.csv",
    import.meta.url
  )
);

describe("runBudgetTopicPublishCli", () => {
  it("既定ではdry-runとなりSupabaseへ書き込まない", async () => {
    const applyPayload = vi.fn();
    const stdout: string[] = [];

    const exitCode = await runBudgetTopicPublishCli(
      ["--input-file", reviewedCandidatesPath],
      {
        applyPayload,
        stdout: (message) => stdout.push(message),
      }
    );

    expect(exitCode).toBe(0);
    expect(applyPayload).not.toHaveBeenCalled();
    expect(stdout).toEqual(
      expect.arrayContaining([
        expect.stringContaining("approve=13"),
        expect.stringContaining("dry-run completed"),
      ])
    );
  });

  it("--applyではレビュー情報付きで13件を登録する", async () => {
    const applyPayload = vi.fn().mockResolvedValue({
      datasetId: "11111111-1111-4111-8111-111111111111",
      categoryId: "22222222-2222-4222-8222-222222222222",
      topicId: "33333333-3333-4333-8333-333333333333",
      publishedRelationCount: 13,
      removedRelationCount: 0,
      status: "published",
    });

    const exitCode = await runBudgetTopicPublishCli(
      [
        "--input-file",
        reviewedCandidatesPath,
        "--reviewed-by",
        "11111111-1111-4111-8111-111111111111",
        "--reviewed-at",
        "2026-07-30T16:33:02+09:00",
        "--apply",
      ],
      { applyPayload }
    );

    expect(exitCode).toBe(0);
    expect(applyPayload).toHaveBeenCalledTimes(1);
    expect(applyPayload.mock.calls[0]?.[0]).toMatchObject({
      reviewer: {
        id: "11111111-1111-4111-8111-111111111111",
        reviewedAt: "2026-07-30T16:33:02+09:00",
      },
    });
    expect(applyPayload.mock.calls[0]?.[0].relations).toHaveLength(13);
    expect(
      applyPayload.mock.calls[0]?.[0].excludedBudgetProgramIdentityIds
    ).toHaveLength(3);
  });

  it("--applyでレビュー情報が欠けていれば非0にする", async () => {
    const applyPayload = vi.fn();

    const exitCode = await runBudgetTopicPublishCli(
      ["--input-file", reviewedCandidatesPath, "--apply"],
      {
        applyPayload,
        stderr: () => undefined,
      }
    );

    expect(exitCode).toBe(1);
    expect(applyPayload).not.toHaveBeenCalled();
  });
});
