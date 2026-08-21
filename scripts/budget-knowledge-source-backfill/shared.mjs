import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const SECRET_VALUES = new Set();

export class BackfillError extends Error {
  constructor(code, message, detail = {}) {
    super(message);
    this.name = "BackfillError";
    this.code = code;
    this.detail = detail;
  }
}

export function invariant(condition, code, message, detail = {}) {
  if (!condition) throw new BackfillError(code, message, detail);
}

export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function textMetrics(rawText) {
  const trimmedText = rawText.trim();
  return {
    raw_sha256: sha256(rawText),
    raw_utf16_length: rawText.length,
    raw_utf8_bytes: Buffer.byteLength(rawText, "utf8"),
    trimmed_sha256: sha256(trimmedText),
    trimmed_utf16_length: trimmedText.length,
    trimmed_utf8_bytes: Buffer.byteLength(trimmedText, "utf8"),
  };
}

export function unicodeLength(value) {
  return [...String(value)].length;
}

export function readJson(file) {
  let raw;
  try {
    raw = fs.readFileSync(file, "utf8");
  } catch (error) {
    throw new BackfillError("file_read_failed", `JSONを読めません: ${file}`, {
      cause: safeErrorCode(error),
    });
  }
  try {
    return { value: JSON.parse(raw), raw };
  } catch {
    throw new BackfillError("invalid_json", `JSONが不正です: ${file}`);
  }
}

export function writeJsonExclusive(file, value, overwrite = false) {
  const output = `${JSON.stringify(value, null, 2)}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, output, {
    encoding: "utf8",
    flag: overwrite ? "w" : "wx",
    mode: 0o600,
  });
  fs.chmodSync(file, 0o600);
  return sha256(output);
}

export function canonicalExistingPath(file) {
  invariant(
    typeof file === "string" && file.length > 0,
    "source_path_missing",
    "source_pathがありません"
  );
  try {
    return fs.realpathSync.native(path.resolve(file));
  } catch (error) {
    throw new BackfillError(
      "source_path_not_found",
      `原文ファイルが見つかりません: ${file}`,
      { cause: safeErrorCode(error) }
    );
  }
}

export function pathKey(file) {
  return file.normalize("NFC");
}

export function duplicateValues(values) {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([value, count]) => ({ value, count }));
}

export function countBy(items, selector) {
  const counts = {};
  for (const item of items) {
    const key = String(selector(item));
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) =>
      left.localeCompare(right, "ja")
    )
  );
}

export function assertCounts(actual, expected, code) {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)]);
  const mismatches = [...keys]
    .sort((left, right) => left.localeCompare(right, "ja"))
    .flatMap((key) => {
      const actualCount = actual[key] ?? 0;
      const expectedCount = expected[key] ?? 0;
      return actualCount === expectedCount
        ? []
        : [{ key, expected: expectedCount, actual: actualCount }];
    });
  invariant(mismatches.length === 0, code, `${code}の件数が一致しません`, {
    mismatches,
  });
}

export function addSecret(value) {
  if (typeof value === "string" && value.length > 0) SECRET_VALUES.add(value);
}

export function redact(value) {
  let result = String(value ?? "");
  for (const secret of SECRET_VALUES) {
    result = result.split(secret).join("[REDACTED]");
  }
  return result.replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/giu, "Bearer [REDACTED]");
}

export function safeError(error) {
  if (error instanceof BackfillError) {
    return {
      code: error.code,
      message: redact(error.message),
      detail: sanitizeDetail(error.detail),
    };
  }
  return {
    code: "unexpected_error",
    message: redact(error instanceof Error ? error.message : String(error)),
  };
}

export function safeErrorCode(error) {
  if (error && typeof error === "object" && "code" in error) {
    return String(error.code).slice(0, 80);
  }
  return "unknown";
}

function sanitizeDetail(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(sanitizeDetail);
  if (typeof value !== "object") return redact(value);
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (/token|authorization|knowledge_source|body|content/iu.test(key)) {
      output[key] = "[OMITTED]";
    } else {
      output[key] = sanitizeDetail(item);
    }
  }
  return output;
}

export function requireAdminToken() {
  const token = process.env.ADMIN_API_TOKEN?.trim();
  invariant(
    Boolean(token),
    "admin_token_missing",
    "ADMIN_API_TOKENを環境変数で設定してください"
  );
  addSecret(token);
  return token;
}

export function assertSha256(value, label) {
  invariant(
    typeof value === "string" && /^[a-f0-9]{64}$/u.test(value),
    "invalid_sha256",
    `${label}は64桁の小文字SHA-256で指定してください`
  );
}

export function assertUuid(value, label) {
  invariant(
    typeof value === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
        value
      ),
    "invalid_uuid",
    `${label}がUUIDではありません`,
    { value }
  );
}

export function appendJournal(file, event) {
  const forbidden = JSON.stringify(event);
  invariant(
    !/"(?:knowledge_source|source_text|raw_text|trimmed_text|content|token|authorization)"\s*:/iu.test(
      forbidden
    ),
    "unsafe_journal_event",
    "journalへ本文またはtokenを書こうとしました"
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${forbidden}\n`, {
    encoding: "utf8",
    mode: 0o600,
  });
}

export function readJournal(file) {
  if (!fs.existsSync(file)) return [];
  const raw = fs.readFileSync(file, "utf8");
  invariant(
    !/Bearer\s|"(?:knowledge_source|source_text|raw_text|trimmed_text|content|token|authorization)"\s*:/iu.test(
      raw
    ),
    "unsafe_existing_journal",
    "既存journalに本文または認証情報らしき値があります"
  );
  const lines = raw.split("\n");
  if (lines.at(-1) === "") lines.pop();
  return lines.map((line, index) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new BackfillError(
        "journal_corrupt",
        `journalの${index + 1}行目が不正です。追記を中止します`
      );
    }
  });
}

export function acquireLock(journalFile) {
  const lockFile = `${journalFile}.lock`;
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  let descriptor;
  try {
    descriptor = fs.openSync(lockFile, "wx", 0o600);
    try {
      fs.writeFileSync(
        descriptor,
        `${JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() })}\n`
      );
    } catch (error) {
      fs.closeSync(descriptor);
      descriptor = undefined;
      fs.unlinkSync(lockFile);
      throw error;
    }
  } catch (error) {
    throw new BackfillError(
      "journal_locked",
      `別の実行中プロセスがある可能性があります: ${lockFile}`,
      { cause: safeErrorCode(error) }
    );
  }
  return () => {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    try {
      fs.unlinkSync(lockFile);
    } catch {
      // 自分が作成した一時lockだけを解除する。失敗時は次回が安全側で停止する。
    }
  };
}
