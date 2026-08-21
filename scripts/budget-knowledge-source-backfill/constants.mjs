import path from "node:path";

export const SESSION_ID = "d5291935-ab17-4bd5-b328-e3eb78b968a8";
export const PUBLICATION_CATEGORY = "budget";
export const EXPECTED_TOTAL = 441;
export const EXPECTED_PAYLOAD_TOTAL = 440;
export const EXPECTED_PAYLOAD_FILE_COUNT = 27;
export const INITIAL_Q2_TOPIC_ID = "a23ba1aa-82da-403e-94ad-9df633d6545d";
export const INITIAL_Q2_TOPIC_TITLE =
  "基金が減っても財政は大丈夫なのでしょうか";

export const DEFAULT_BASE_URL = "https://civictech-setagaya.org";
export const DEFAULT_ENDPOINT = "/api/admin/bills/knowledge-source";
export const DEFAULT_EXPORT_ENDPOINT =
  "/api/admin/bills/draft?export=knowledge_sources&item_type=report";
export const DEFAULT_BATCH_SIZE = 25;
export const MIN_BATCH_SIZE = 10;
export const MAX_BATCH_SIZE = 25;
export const DEFAULT_TIMEOUT_MS = 30_000;
export const MAX_KNOWLEDGE_SOURCE_UTF16_LENGTH = 200_000;

export const MANIFEST_TYPE = "budget_knowledge_source_backfill_manifest";
export const SNAPSHOT_TYPE = "budget_knowledge_source_admin_snapshot";
export const SCHEMA_VERSION = 1;

export const EXPECTED_ISSUE_COUNTS = Object.freeze({
  Q2: 53,
  Q3: 60,
  Q4: 72,
  Q5: 70,
  Q6: 60,
  Q7: 64,
  Q8: 62,
});

export const EXPECTED_DATE_COUNTS = Object.freeze({
  "2026-03-05": 53,
  "2026-03-06": 60,
  "2026-03-10": 72,
  "2026-03-12": 70,
  "2026-03-16": 60,
  "2026-03-18": 64,
  "2026-03-23": 62,
});

export const EXPECTED_CATEGORY_COUNTS = Object.freeze({
  全体: 12,
  "教育🏫": 55,
  "子育て👶": 30,
  "福祉🤝": 71,
  "まちづくり🏗️": 57,
  "防災☔": 34,
  "行財政🏛️": 61,
  "文化・スポーツ📚": 36,
  "産業💡": 29,
  "環境問題🌿": 22,
  "暮らし🙋": 34,
});

const REPOSITORY_ROOT = path.resolve(import.meta.dirname, "..", "..");

export const DEFAULT_VAULT_ROOT = path.resolve(
  REPOSITORY_ROOT,
  "..",
  "..",
  "10_Products",
  "みらい議会",
  "記事作成",
  "原文抽出",
  "予算特別委員会",
  "2026_令和08年"
);

export function expectedPayloadFiles(payloadDirectory) {
  const files = [];
  for (const suffix of ["a", "b", "c"]) {
    files.push(path.join(payloadDirectory, `budget_payloads_${suffix}.json`));
  }
  for (const suffix of ["a", "b", "c"]) {
    files.push(
      path.join(payloadDirectory, `budget_33_payloads_${suffix}.json`)
    );
  }
  for (let issue = 2; issue <= 8; issue += 1) {
    for (const suffix of ["a", "b", "c"]) {
      files.push(
        path.join(payloadDirectory, `budget_all_q${issue}_${suffix}.json`)
      );
    }
  }
  return files;
}
