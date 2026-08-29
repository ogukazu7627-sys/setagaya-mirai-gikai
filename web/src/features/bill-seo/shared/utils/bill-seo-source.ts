import { createHash } from "node:crypto";
import type { BillSeoSourceData } from "../types";

export function createBillSeoSourceHash(source: BillSeoSourceData): string {
  const stableSource = {
    ...source,
    tags: [...source.tags].sort((left, right) =>
      left.localeCompare(right, "ja")
    ),
    sources: [...source.sources].sort((left, right) =>
      `${left.title}|${left.url ?? ""}`.localeCompare(
        `${right.title}|${right.url ?? ""}`,
        "ja"
      )
    ),
  };

  return createHash("sha256")
    .update(JSON.stringify(stableSource))
    .digest("hex");
}

export function getTokyoDayStartIso(now: Date): string {
  const tokyoNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return new Date(
    Date.UTC(
      tokyoNow.getUTCFullYear(),
      tokyoNow.getUTCMonth(),
      tokyoNow.getUTCDate()
    ) -
      9 * 60 * 60 * 1000
  ).toISOString();
}
