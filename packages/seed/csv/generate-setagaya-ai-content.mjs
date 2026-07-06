import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const vaultRoot = path.resolve(repoRoot, "../..");
const cardsRoot = path.join(
  vaultRoot,
  "10_Products",
  "みらい議会",
  "令和8年第2回区議会定例会"
);
const dataDir = path.join(__dirname, "data");
const cachePath = path.join(dataDir, "setagaya_ai_bill_contents.json");
const envPath = path.join(repoRoot, ".env");

const REQUIRED_HEADINGS = [
  "審議ステータス",
  "この議案のポイント",
  "この議案が必要な理由",
  "意見が分かれるところ",
  "よくある質問",
  "影響を受ける人",
  "関連リンク",
];

const BANNED_PATTERNS = [
  /公式PDF本文を確認してください/,
  /詳しい根拠は、?公式PDF/,
  /詳しくはPDF/,
  /PDFを見てください/,
  /このプレビューでは賛否の評価は行わず/,
  /次のような内容が確認できます/,
  /既存カード/,
];

function loadEnvFile() {
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

function deterministicUuid(input) {
  const hash = crypto.createHash("sha1").update(input).digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

function readCards(limitArg) {
  const limit = limitArg ? Number(limitArg) : undefined;
  const files = fs
    .readdirSync(cardsRoot)
    .filter((name) => /^議案第\d+号_.*\.md$/.test(name))
    .sort(
      (a, b) =>
        Number(a.match(/議案第(\d+)号/)?.[1] ?? 0) -
        Number(b.match(/議案第(\d+)号/)?.[1] ?? 0)
    )
    .slice(0, limit);

  return files.map((file) => {
    const fullPath = path.join(cardsRoot, file);
    const text = fs.readFileSync(fullPath, "utf-8");
    const frontmatter = text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
    return {
      file,
      text,
      ...parseFrontmatter(frontmatter),
      sourceExcerpt: extractSection(text, "根拠抜粋"),
      detailText: readDetailText(frontmatter),
      billId: deterministicUuid(
        `setagaya-bill-${parseFrontmatter(frontmatter).bill_number}`
      ),
    };
  });
}

function parseFrontmatter(frontmatter) {
  const result = {};
  const lines = frontmatter.split("\n");
  let currentKey = null;

  for (const line of lines) {
    const keyMatch = line.match(/^([A-Za-z0-9_]+):(?:\s*(.*))?$/);
    if (keyMatch) {
      currentKey = keyMatch[1];
      const value = keyMatch[2] ?? "";
      if (value === "") {
        result[currentKey] = [];
      } else if (value === "true" || value === "false") {
        result[currentKey] = value === "true";
      } else {
        result[currentKey] = unquote(value);
      }
      continue;
    }

    const listMatch = line.match(/^\s+-\s*(.*)$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(unquote(listMatch[1]));
    }
  }

  return result;
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === "[]") return [];
  return trimmed;
}

function extractSection(text, heading) {
  const pattern = new RegExp(`## ${heading}\\n\\n([\\s\\S]*?)(?=\\n## |$)`);
  return (text.match(pattern)?.[1] ?? "").trim();
}

function readDetailText(frontmatter) {
  const detailNote = frontmatter.match(/^detail_source_note:\s*"([^"]+)"/m)?.[1];
  if (!detailNote) return "";
  const detailPath = path.join(
    cardsRoot,
    "公式PDF抽出テキスト",
    `${detailNote}.md`
  );
  if (!fs.existsSync(detailPath)) return "";
  const detail = fs.readFileSync(detailPath, "utf-8");
  return detail.match(/```text\n([\s\S]*?)\n```/)?.[1]?.trim() ?? "";
}

function compactText(text, maxLength = 12000) {
  return text
    .replace(/\s+/g, " ")
    .replace(/－\d+－/g, "")
    .trim()
    .slice(0, maxLength);
}

function buildPrompt(card) {
  return `あなたは、世田谷区政を区民にわかりやすく届ける編集者です。
公式資料から言えることだけを使い、本家みらい議会風の読みやすい議案解説を作ってください。

制約:
- 断定できる事実は、公式PDF抽出テキスト・公式メタデータ・整理済みメタデータに含まれるものだけにする。
- 推測や評価は避ける。ただし「意見が分かれるところ」では、確認観点として費用、優先順位、工期、対象者、地域影響などを整理してよい。
- 「詳しくはPDFを見てください」「公式PDF本文を確認してください」のような投げやりな表現は禁止。
- 「既存カード」「入力」「下書き」など、制作・レビュー用の内部語を本文やレビュー用メモに入れない。
- 公式PDFの抜粋を長く貼らない。編集して、読み物として自然な文章にする。
- normalは中学生にも読める。hardは数字・契約条件・条例の変更点をより詳しく整理する。
- Markdown本文は必ず # タイトル から始め、次のh2をこの順番・表記で全て含める:
${REQUIRED_HEADINGS.map((heading) => `  - ${heading}`).join("\n")}
- 関連リンクには、議案PDFと審議結果ページを必ず含める。

公式メタデータ:
議案番号: ${card.bill_number}
件名: ${card.title}
会期: ${card.session}
審議ステータス: ${card.bill_status}
付託先: ${card.committee}
議決日: ${card.vote_date}
結果: ${card.result}
カテゴリ: ${(Array.isArray(card.categories) ? card.categories : []).join(", ")}
公式PDF: ${card.official_pdf_url}
審議結果: ${card.result_page_url}

整理済み要約:
${card.summary_plain || ""}

整理済み要点:
${(Array.isArray(card.key_points) ? card.key_points : []).map((x) => `- ${x}`).join("\n")}

影響しそうな範囲:
${card.impact_scope || ""}

公式PDF抽出テキスト:
${compactText(card.detailText || card.sourceExcerpt || "")}

JSONで返してください。`;
}

function responseSchema() {
  const contentDescription =
    "Markdown. Begins with # title and includes all required h2 headings in order.";
  return {
    type: "object",
    additionalProperties: false,
    required: [
      "bill_number",
      "title",
      "normal_summary",
      "normal_content",
      "hard_summary",
      "hard_content",
      "review_notes",
    ],
    properties: {
      bill_number: { type: "string" },
      title: { type: "string" },
      normal_summary: { type: "string" },
      normal_content: { type: "string", description: contentDescription },
      hard_summary: { type: "string" },
      hard_content: { type: "string", description: contentDescription },
      review_notes: {
        type: "array",
        items: { type: "string" },
      },
    },
  };
}

async function callOpenAI(card, apiKey, model) {
  const body = {
    model,
    input: [
      {
        role: "system",
        content:
          "あなたは地方議会の公式資料を区民向けに翻訳する編集者です。事実性を守り、読みやすく、過度な評価を避けてください。",
      },
      { role: "user", content: buildPrompt(card) },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "setagaya_bill_content",
        strict: true,
        schema: responseSchema(),
      },
    },
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  const text =
    data.output_text ??
    data.output
      ?.flatMap((item) => item.content ?? [])
      ?.map((content) => content.text)
      ?.filter(Boolean)
      ?.join("\n");

  if (!text) {
    throw new Error("OpenAI response did not include output text.");
  }

  return JSON.parse(text);
}

function validateContent(card, generated) {
  const errors = [];
  for (const key of ["normal_content", "hard_content"]) {
    const content = generated[key] || "";
    for (const heading of REQUIRED_HEADINGS) {
      if (!content.includes(`## ${heading}`)) {
        errors.push(`${key} is missing heading: ${heading}`);
      }
    }
    for (const pattern of BANNED_PATTERNS) {
      if (pattern.test(content)) {
        errors.push(`${key} includes banned expression: ${pattern}`);
      }
    }
    if (!content.startsWith(`# ${card.title}`)) {
      errors.push(`${key} must start with "# ${card.title}"`);
    }
    if (!content.includes(card.official_pdf_url)) {
      errors.push(`${key} is missing official_pdf_url`);
    }
    if (!content.includes(card.result_page_url)) {
      errors.push(`${key} is missing result_page_url`);
    }
  }
  if (generated.bill_number !== card.bill_number) {
    errors.push(`bill_number mismatch: ${generated.bill_number}`);
  }
  if (generated.title !== card.title) {
    errors.push(`title mismatch: ${generated.title}`);
  }
  return errors;
}

function normalizeGeneratedContent(card, generated) {
  const normalized = { ...generated, bill_number: card.bill_number, title: card.title };
  for (const key of ["normal_content", "hard_content"]) {
    const content = normalized[key] || "";
    normalized[key] = content.replace(/^# .*(\n|$)/, `# ${card.title}\n`);
    if (!normalized[key].startsWith(`# ${card.title}`)) {
      normalized[key] = `# ${card.title}\n\n${normalized[key]}`;
    }
  }
  return normalized;
}

async function generateOne(card, apiKey, model) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const generated = normalizeGeneratedContent(
        card,
        await callOpenAI(card, apiKey, model)
      );
      const errors = validateContent(card, generated);
      if (errors.length > 0) {
        throw new Error(errors.join("; "));
      }
      return {
        bill_number: card.bill_number,
        bill_id: card.billId,
        title: card.title,
        model,
        generated_at: new Date().toISOString(),
        source: {
          official_pdf_url: card.official_pdf_url,
          result_page_url: card.result_page_url,
          source_checked_at: card.source_checked_at,
        },
        ...generated,
      };
    } catch (error) {
      lastError = error;
      console.error(
        `[${card.bill_number}] attempt ${attempt} failed: ${error.message}`
      );
    }
  }
  throw lastError;
}

function readCache() {
  if (!fs.existsSync(cachePath)) {
    return { generated_at: null, bills: [] };
  }
  return JSON.parse(fs.readFileSync(cachePath, "utf-8"));
}

function writeCache(cache) {
  fs.writeFileSync(cachePath, `${JSON.stringify(cache, null, 2)}\n`);
}

async function main() {
  loadEnvFile();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required. Set it in .env.");
  }
  const model = process.env.SETAGAYA_CONTENT_MODEL || "gpt-5.2";
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
  const limit = limitArg?.split("=")[1];
  const force = process.argv.includes("--force");
  const cards = readCards(limit);
  const cache = readCache();
  const byBillNumber = new Map(
    cache.bills.map((bill) => [bill.bill_number, bill])
  );

  for (const card of cards) {
    if (!force && byBillNumber.has(card.bill_number)) {
      console.log(`Skipping ${card.bill_number}: cached`);
      continue;
    }
    console.log(`Generating ${card.bill_number}: ${card.title}`);
    const generated = await generateOne(card, apiKey, model);
    byBillNumber.set(card.bill_number, generated);
    writeCache({
      generated_at: new Date().toISOString(),
      model,
      bills: [...byBillNumber.values()].sort(
        (a, b) =>
          Number(a.bill_number.match(/\d+/)?.[0] ?? 0) -
          Number(b.bill_number.match(/\d+/)?.[0] ?? 0)
      ),
    });
  }

  console.log(`Generated AI content for ${cards.length} bill(s).`);
  console.log(`Cache: ${cachePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
