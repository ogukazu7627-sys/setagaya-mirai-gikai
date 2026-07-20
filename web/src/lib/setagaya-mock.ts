import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { DifficultyLevelEnum } from "@/features/bill-difficulty/shared/types";
import type {
  BillContent,
  BillSource,
  BillsByMajorCategory,
  BillWithContent,
  ComingSoonBill,
  MiraiStance,
} from "@/features/bills/shared/types";
import { MAJOR_CATEGORY_OPTIONS } from "@/features/bills/shared/types";
import type { DietSession } from "@/features/diet-sessions/shared/types";

export const isSetagayaMockMode =
  process.env.NEXT_PUBLIC_SETAGAYA_MOCK_MODE === "true" ||
  process.env.SETAGAYA_MOCK_MODE === "true";

type CsvRow = Record<string, string>;

let cache:
  | {
      session: DietSession;
      bills: BillWithContent[];
    }
  | undefined;

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift() ?? [];
  return rows
    .filter((values) => values.some(Boolean))
    .map((values) =>
      Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      )
    );
}

function readCsv(dataDir: string, fileName: string): CsvRow[] {
  return parseCsv(fs.readFileSync(path.join(dataDir, fileName), "utf-8"));
}

function resolveDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "packages/seed/csv/data"),
    path.resolve(process.cwd(), "../packages/seed/csv/data"),
  ];
  const found = candidates.find((candidate) =>
    fs.existsSync(path.join(candidate, "bills_rows.csv"))
  );
  if (!found) {
    throw new Error("Setagaya mock CSV data was not found.");
  }
  return found;
}

function bool(value: string | undefined): boolean {
  return value === "true";
}

function boolDefaultTrue(value: string | undefined): boolean {
  return value !== "false";
}

function parseSources(value: string | undefined): BillSource[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function statusOrder(status: string): number {
  if (status === "enacted") return 0;
  if (status === "rejected") return 1;
  if (status === "in_receiving_house") return 2;
  if (status === "in_originating_house") return 3;
  if (status === "introduced") return 4;
  return 5;
}

function loadMockData() {
  if (cache) return cache;

  const dataDir = resolveDataDir();
  const sessionRow = readCsv(dataDir, "diet_sessions_rows.csv")[0];
  const billRows = readCsv(dataDir, "bills_rows.csv");
  const contentRows = readCsv(dataDir, "bill_contents_rows.csv");
  const tagRows = readCsv(dataDir, "tags_rows.csv");
  const billTagRows = readCsv(dataDir, "bills_tags_rows.csv");

  const session: DietSession = {
    id: sessionRow.id,
    name: sessionRow.name,
    slug: sessionRow.slug || null,
    shugiin_url: sessionRow.shugiin_url || null,
    start_date: sessionRow.start_date,
    end_date: sessionRow.end_date,
    is_active: bool(sessionRow.is_active),
    created_at: sessionRow.created_at,
    updated_at: sessionRow.updated_at,
  };

  const contentsByBill = new Map<string, BillContent[]>();
  for (const row of contentRows) {
    const content: BillContent = {
      id: row.id,
      bill_id: row.bill_id,
      difficulty_level: row.difficulty_level as DifficultyLevelEnum,
      title: row.title,
      summary: row.summary,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
    contentsByBill.set(row.bill_id, [
      ...(contentsByBill.get(row.bill_id) ?? []),
      content,
    ]);
  }

  const tags = tagRows.map((row) => ({
    id: row.id,
    label: row.label,
    major_category: row.major_category || "教育🏫",
  }));
  const tagById = new Map(tags.map((tag) => [tag.id, tag]));
  const tagsByBill = new Map<string, typeof tags>();
  for (const row of billTagRows) {
    const tag = tagById.get(row.tag_id);
    if (!tag) continue;
    tagsByBill.set(row.bill_id, [...(tagsByBill.get(row.bill_id) ?? []), tag]);
  }

  const bills = billRows.map((row) => {
    const billStatusOrder = statusOrder(row.status);
    const bill: BillWithContent = {
      id: row.id,
      name: row.name,
      item_type: (row.item_type || "bill") as BillWithContent["item_type"],
      originating_house: row.originating_house as "HR" | "HC",
      status: row.status as BillWithContent["status"],
      status_label: row.status_label || null,
      status_note: row.status_note || null,
      submitted_date: row.submitted_date || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
      thumbnail_url: row.thumbnail_url || null,
      publish_status: row.publish_status as BillWithContent["publish_status"],
      is_featured: bool(row.is_featured),
      major_category: row.major_category || null,
      interview_enabled: boolDefaultTrue(row.interview_enabled),
      share_thumbnail_url: row.share_thumbnail_url || null,
      shugiin_url: row.shugiin_url || null,
      diet_session_id: row.diet_session_id || null,
      diet_session: row.diet_session_id
        ? {
            id: session.id,
            name: session.name,
            slug: session.slug,
          }
        : null,
      sources: parseSources(row.sources),
      knowledge_source: row.knowledge_source || null,
      use_knowledge_source_in_chat: bool(row.use_knowledge_source_in_chat),
      is_review_completed: true,
      published_at: row.created_at,
      publish_status_order: 0,
      slug: null,
      status_order: billStatusOrder,
      bill_content:
        contentsByBill
          .get(row.id)
          ?.find((content) => content.difficulty_level === "normal") ??
        contentsByBill.get(row.id)?.[0],
      tags:
        tagsByBill.get(row.id)?.map(({ id, label, major_category }) => ({
          id,
          label,
          major_category,
        })) ?? [],
      mirai_stance: undefined as MiraiStance | undefined,
      hasPublicInterview: false,
    };
    return bill;
  });

  cache = { session, bills };
  return cache;
}

export function getSetagayaMockSession(): DietSession {
  return loadMockData().session;
}

export function getSetagayaMockBills(
  difficultyLevel: DifficultyLevelEnum = "normal"
): BillWithContent[] {
  const { bills } = loadMockData();
  return bills.map((bill) => ({
    ...bill,
    bill_content:
      readContentsForBill(bill.id).find(
        (content) => content.difficulty_level === difficultyLevel
      ) ?? bill.bill_content,
  }));
}

export function getSetagayaMockBillById(
  id: string,
  difficultyLevel: DifficultyLevelEnum = "normal"
): BillWithContent | null {
  return (
    getSetagayaMockBills(difficultyLevel).find((bill) => bill.id === id) ?? null
  );
}

export function getSetagayaMockBillsByMajorCategory(
  difficultyLevel: DifficultyLevelEnum = "normal"
): BillsByMajorCategory[] {
  const bills = getSetagayaMockBills(difficultyLevel);
  return MAJOR_CATEGORY_OPTIONS.map((category) => ({
    category,
    bills: bills.filter((bill) => bill.major_category === category.label),
  })).filter(({ bills }) => bills.length > 0);
}

export function getSetagayaMockComingSoonBills(): ComingSoonBill[] {
  return [];
}

function readContentsForBill(billId: string): BillContent[] {
  const dataDir = resolveDataDir();
  return readCsv(dataDir, "bill_contents_rows.csv")
    .filter((row) => row.bill_id === billId)
    .map((row) => ({
      id: row.id,
      bill_id: row.bill_id,
      difficulty_level: row.difficulty_level as DifficultyLevelEnum,
      title: row.title,
      summary: row.summary,
      content: row.content,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
}
