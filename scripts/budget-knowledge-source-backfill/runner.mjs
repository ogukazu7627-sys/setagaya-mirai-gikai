import crypto from "node:crypto";
import {
  DEFAULT_BATCH_SIZE,
  DEFAULT_ENDPOINT,
  DEFAULT_EXPORT_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  EXPECTED_TOTAL,
  MAX_BATCH_SIZE,
  MIN_BATCH_SIZE,
  PUBLICATION_CATEGORY,
  SESSION_ID,
} from "./constants.mjs";
import { readAndVerifySource } from "./manifest.mjs";
import {
  appendJournal,
  assertSha256,
  assertUuid,
  BackfillError,
  invariant,
  readJournal,
  requireAdminToken,
  sha256,
} from "./shared.mjs";

const MAX_API_RESPONSE_BYTES = 5_000_000;

function validateBaseUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new BackfillError("invalid_base_url", "base URLが不正です");
  }
  const local = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  const production = url.origin === "https://civictech-setagaya.org";
  invariant(
    production || (local && ["http:", "https:"].includes(url.protocol)),
    "unsafe_base_url",
    "base URLは本番origin（localhostのみ検証可）に限定されています"
  );
  invariant(
    !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      url.pathname === "/",
    "unsafe_base_url",
    "base URLへ認証情報・query・fragmentを含めないでください"
  );
  return url;
}

function apiUrl(baseUrl, endpoint, query = {}) {
  const url = new URL(endpoint, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url;
}

function validateEndpoint(value, label) {
  invariant(
    typeof value === "string" &&
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !value.includes("\\"),
    "unsafe_api_endpoint",
    `${label}は同一originの絶対pathで指定してください`
  );
  const parsed = new URL(value, "https://endpoint.invalid");
  invariant(
    parsed.origin === "https://endpoint.invalid" && !parsed.hash,
    "unsafe_api_endpoint",
    `${label}は同一originのpath/queryだけを指定してください`
  );
  return `${parsed.pathname}${parsed.search}`;
}

async function readResponseText(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_API_RESPONSE_BYTES) {
      await reader.cancel();
      throw new BackfillError(
        "api_response_too_large",
        "Admin API応答が上限を超えました",
        { status: response.status }
      );
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

function apiTransportError(error, method, url) {
  return new BackfillError("api_transport_error", "Admin API通信に失敗しました", {
    method,
    path: url.pathname,
    cause:
      error && typeof error === "object" && "name" in error
        ? String(error.name)
        : "unknown",
  });
}

function assertWithinDeadline(deadline, method, url) {
  if (Date.now() > deadline) {
    throw apiTransportError({ name: "TimeoutError" }, method, url);
  }
}

export async function fetchJson({
  token,
  url,
  method = "GET",
  body,
  timeoutMs,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const deadline = Date.now() + timeoutMs;
  try {
    const response = await fetch(url, {
      method,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
      redirect: "error",
      signal: controller.signal,
    });
    assertWithinDeadline(deadline, method, url);
    const declaredLength = Number(response.headers.get("content-length"));
    invariant(
      !Number.isFinite(declaredLength) ||
        declaredLength <= MAX_API_RESPONSE_BYTES,
      "api_response_too_large",
      "Admin API応答が上限を超えました",
      { status: response.status, declared_bytes: declaredLength }
    );
    const text = await readResponseText(response);
    assertWithinDeadline(deadline, method, url);
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new BackfillError(
        "api_invalid_json",
        "Admin API応答がJSONではありません",
        {
          status: response.status,
          method,
          path: url.pathname,
        }
      );
    }
    assertWithinDeadline(deadline, method, url);
    if (!response.ok) {
      const apiCode =
        typeof parsed?.code === "string" &&
        /^[a-z0-9_-]{1,80}$/iu.test(parsed.code)
          ? parsed.code
          : "unknown";
      throw new BackfillError("api_http_error", "Admin APIがエラーを返しました", {
        status: response.status,
        method,
        path: url.pathname,
        api_code: apiCode,
      });
    }
    return parsed;
  } catch (error) {
    if (error instanceof BackfillError) throw error;
    throw apiTransportError(error, method, url);
  } finally {
    clearTimeout(timer);
  }
}

function normalizeKnowledgeSource(value) {
  invariant(
    value === null || typeof value === "string",
    "api_invalid_knowledge_source",
    "Admin APIのknowledge_source型が不正です"
  );
  return value;
}

function validateReportedSourceMetrics(body, source) {
  const expectedHash = source === null ? null : sha256(source);
  const expectedLength = source === null ? 0 : source.length;
  const expectedBytes = source === null ? 0 : Buffer.byteLength(source, "utf8");
  invariant(
    body.knowledge_source_sha256 === expectedHash,
    "api_source_hash_mismatch",
    "Admin APIのknowledge_source SHA-256が本文と一致しません"
  );
  invariant(
    body.knowledge_source_length === expectedLength,
    "api_source_length_mismatch",
    "Admin APIのknowledge_source UTF-16長が本文と一致しません"
  );
  invariant(
    body.knowledge_source_bytes === expectedBytes,
    "api_source_bytes_mismatch",
    "Admin APIのknowledge_source UTF-8 byte数が本文と一致しません"
  );
}

function normalizeGetResponse(body) {
  invariant(
    body?.success === true,
    "api_get_unsuccessful",
    "Admin API GETのsuccessがtrueではありません"
  );
  assertUuid(body.bill_id, "GET bill_id");
  const source = normalizeKnowledgeSource(body.knowledge_source);
  validateReportedSourceMetrics(body, source);
  return {
    id: body.bill_id,
    name: body.name,
    diet_session_id: body.diet_session_id,
    publication_category: body.publication_category,
    publish_status: body.publish_status,
    updated_at: body.updated_at,
    published_at: body.published_at,
    knowledge_source: source,
    knowledge_source_sha256: body.knowledge_source_sha256,
    knowledge_source_length: body.knowledge_source_length,
    knowledge_source_bytes: body.knowledge_source_bytes,
  };
}

async function getRecord(client, id) {
  assertUuid(id, "GET id");
  const body = await fetchJson({
    token: client.token,
    url: apiUrl(client.baseUrl, client.endpoint, {
      id,
      diet_session_id: SESSION_ID,
    }),
    timeoutMs: client.timeoutMs,
  });
  const record = normalizeGetResponse(body);
  invariant(
    record.id === id,
    "api_get_id_mismatch",
    "Admin API GETが別IDを返しました"
  );
  return record;
}

function assertPublishedMetadata(record, entry) {
  invariant(
    record.id === entry.id &&
      record.name === entry.title &&
      record.diet_session_id === SESSION_ID &&
      record.publication_category === PUBLICATION_CATEGORY &&
      record.publish_status === "published" &&
      record.published_at === entry.published_at,
    "published_metadata_conflict",
    `公開記事メタデータがmanifestから変わりました: ${entry.issue}/${entry.topic_number}`,
    {
      id: entry.id,
      name_match: record.name === entry.title,
      session_match: record.diet_session_id === SESSION_ID,
      category_match: record.publication_category === PUBLICATION_CATEGORY,
      status: record.publish_status,
      published_at_match: record.published_at === entry.published_at,
    }
  );
}

function assertTargetRecord(record, entry, trimmedText) {
  assertPublishedMetadata(record, entry);
  invariant(
    record.knowledge_source_sha256 === entry.trimmed_sha256 &&
      record.knowledge_source_length === entry.trimmed_utf16_length &&
      record.knowledge_source_bytes === entry.trimmed_utf8_bytes &&
      record.knowledge_source === trimmedText,
    "target_verification_failed",
    `GET監査で原文とknowledge_sourceが一致しません: ${entry.issue}/${entry.topic_number}`
  );
}

function assertNullRecord(record, entry) {
  assertPublishedMetadata(record, entry);
  invariant(
    record.knowledge_source === null &&
      record.knowledge_source_sha256 === null &&
      record.knowledge_source_length === 0 &&
      record.knowledge_source_bytes === 0,
    "rollback_verification_failed",
    `GET監査でknowledge_sourceがnullではありません: ${entry.issue}/${entry.topic_number}`
  );
}

function normalizePatchSnapshot(value, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    "api_patch_snapshot_missing",
    `PATCH応答の${label}がありません`
  );
  const hash = value.knowledge_source_sha256;
  if (hash !== null) assertSha256(hash, `PATCH ${label} SHA-256`);
  invariant(
    Number.isInteger(value.knowledge_source_length) &&
      value.knowledge_source_length >= 0 &&
      Number.isInteger(value.knowledge_source_bytes) &&
      value.knowledge_source_bytes >= 0,
    "api_patch_snapshot_metrics",
    `PATCH応答の${label}長さ指標が不正です`
  );
  return value;
}

function validatePatchResponse(
  body,
  entry,
  previousRecord,
  targetHash,
  targetLength,
  targetBytes,
  expectedChange
) {
  invariant(
    body?.success === true &&
      body.bill_id === entry.id &&
      body.name === entry.title &&
      body.diet_session_id === SESSION_ID &&
      body.publication_category === PUBLICATION_CATEGORY &&
      body.publish_status === "published" &&
      body.dry_run === false &&
      body.updated === expectedChange &&
      body.would_update === expectedChange,
    "api_patch_result_mismatch",
    `PATCH応答がcommit結果と一致しません: ${entry.issue}/${entry.topic_number}`
  );
  const previous = normalizePatchSnapshot(body.previous, "previous");
  const current = normalizePatchSnapshot(body.current, "current");
  const candidate = normalizePatchSnapshot(body.candidate, "candidate");
  invariant(
    previous.updated_at === previousRecord.updated_at &&
      previous.published_at === entry.published_at &&
      previous.knowledge_source_sha256 ===
        previousRecord.knowledge_source_sha256 &&
      previous.knowledge_source_length ===
        previousRecord.knowledge_source_length &&
      previous.knowledge_source_bytes ===
        previousRecord.knowledge_source_bytes &&
      current.published_at === entry.published_at &&
      (expectedChange || current.updated_at === previousRecord.updated_at),
    "api_patch_previous_mismatch",
    `PATCH応答のprevious/current guardがGET結果と違います: ${entry.issue}/${entry.topic_number}`
  );
  invariant(
    current.knowledge_source_sha256 === targetHash &&
      current.knowledge_source_length === targetLength &&
      current.knowledge_source_bytes === targetBytes &&
      candidate.knowledge_source_sha256 === targetHash &&
      candidate.knowledge_source_length === targetLength &&
      candidate.knowledge_source_bytes === targetBytes,
    "api_patch_target_mismatch",
    `PATCH応答のcurrent/candidateが期待値と違います: ${entry.issue}/${entry.topic_number}`
  );
  invariant(
    Array.isArray(body.warnings) &&
      body.warnings.every(
        (warning) =>
          warning &&
          typeof warning === "object" &&
          warning.code === "cache_revalidation_failed"
      ),
    "api_patch_warnings_invalid",
    "PATCH応答のwarnings形式が不正です"
  );
  return body.warnings.map((warning) => warning.code);
}

async function patchRecord(
  client,
  entry,
  current,
  knowledgeSource,
  allowClear
) {
  const body = await fetchJson({
    token: client.token,
    url: apiUrl(client.baseUrl, client.endpoint),
    method: "PATCH",
    body: {
      id: entry.id,
      expected_name: entry.title,
      diet_session_id: SESSION_ID,
      expected_updated_at: current.updated_at,
      expected_published_at: entry.published_at,
      expected_knowledge_source_sha256: current.knowledge_source_sha256,
      knowledge_source: knowledgeSource,
      ...(allowClear ? { allow_clear: true } : {}),
      dry_run: false,
    },
    timeoutMs: client.timeoutMs,
  });
  const targetHash = knowledgeSource === null ? null : sha256(knowledgeSource);
  const targetLength = knowledgeSource === null ? 0 : knowledgeSource.length;
  const targetBytes =
    knowledgeSource === null ? 0 : Buffer.byteLength(knowledgeSource, "utf8");
  const expectedChange = current.knowledge_source !== knowledgeSource;
  return validatePatchResponse(
    body,
    entry,
    current,
    targetHash,
    targetLength,
    targetBytes,
    expectedChange
  );
}

export function createClient(options) {
  const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE;
  invariant(
    Number.isInteger(batchSize) &&
      batchSize >= MIN_BATCH_SIZE &&
      batchSize <= MAX_BATCH_SIZE,
    "invalid_batch_size",
    `batch sizeは${MIN_BATCH_SIZE}〜${MAX_BATCH_SIZE}の整数で指定してください`
  );
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  invariant(
    Number.isInteger(timeoutMs) && timeoutMs >= 5_000 && timeoutMs <= 120_000,
    "invalid_timeout",
    "timeoutは5000〜120000msの整数で指定してください"
  );
  const baseUrl = validateBaseUrl(options.baseUrl);
  const endpoint = validateEndpoint(
    options.endpoint ?? DEFAULT_ENDPOINT,
    "endpoint"
  );
  const exportEndpoint = validateEndpoint(
    options.exportEndpoint ?? DEFAULT_EXPORT_ENDPOINT,
    "export endpoint"
  );
  return {
    token: requireAdminToken(),
    baseUrl,
    endpoint,
    exportEndpoint,
    batchSize,
    timeoutMs,
  };
}

function normalizeExportPage(body, requestedOffset, requestedLimit, totalCount) {
  invariant(
    body?.success === true &&
      body.item_type === "report" &&
      Array.isArray(body.records) &&
      Number.isInteger(body.count) &&
      body.count >= 0 &&
      body.offset === requestedOffset &&
      body.limit === requestedLimit &&
      Number.isInteger(body.returned_count) &&
      body.returned_count === body.records.length &&
      body.returned_count <= requestedLimit &&
      typeof body.has_more === "boolean" &&
      typeof body.truncated_by_response_size === "boolean",
    "invalid_export_pagination_metadata",
    "Admin exportのpagination metadataが不正です"
  );
  if (totalCount !== null) {
    invariant(
      body.count === totalCount,
      "export_count_changed",
      "Admin exportのpage間でcountが変わりました",
      { expected: totalCount, actual: body.count, offset: requestedOffset }
    );
  }
  const expectedNextOffset = requestedOffset + body.records.length;
  const expectedHasMore = expectedNextOffset < body.count;
  invariant(
    body.has_more === expectedHasMore &&
      body.next_offset === (expectedHasMore ? expectedNextOffset : null),
    "invalid_export_pagination_metadata",
    "Admin exportのhas_moreとnext_offsetが件数に一致しません",
    {
      offset: requestedOffset,
      returned_count: body.records.length,
      count: body.count,
    }
  );
  invariant(
    !expectedHasMore || body.records.length > 0,
    "export_pagination_stalled",
    "Admin exportが未完了のまま空pageを返しました"
  );
  return {
    records: body.records,
    count: body.count,
    nextOffset: body.next_offset,
  };
}

export async function listExportRows(client, onProgress) {
  const rows = [];
  let offset = 0;
  const limit = 100;
  let totalCount = null;
  const seenOffsets = new Set();
  const seenIds = new Set();
  while (true) {
    invariant(
      !seenOffsets.has(offset),
      "export_pagination_loop",
      "Admin exportのpaginationが進みません"
    );
    seenOffsets.add(offset);
    const url = apiUrl(client.baseUrl, client.exportEndpoint, {
      offset,
      limit,
    });
    const body = await fetchJson({
      token: client.token,
      url,
      timeoutMs: client.timeoutMs,
    });
    const page = normalizeExportPage(body, offset, limit, totalCount);
    totalCount ??= page.count;
    for (const row of page.records) {
      invariant(
        row && typeof row === "object" && !Array.isArray(row),
        "invalid_export_record",
        "Admin exportのrecordがobjectではありません"
      );
      assertUuid(row.id, "Admin export record id");
      invariant(
        !seenIds.has(row.id),
        "export_duplicate_id",
        "Admin exportのpage間でIDが重複しました",
        { id: row.id, offset }
      );
      seenIds.add(row.id);
      rows.push(row);
    }
    onProgress?.({
      event: "snapshot_export_page",
      offset,
      returned: page.records.length,
    });
    if (page.nextOffset === null) break;
    offset = page.nextOffset;
  }
  invariant(
    rows.length === totalCount,
    "export_row_count_mismatch",
    "Admin exportの取得件数がcountと一致しません",
    { expected: totalCount, actual: rows.length }
  );
  return rows;
}

export async function collectAdminSnapshot(options, onProgress) {
  const client = createClient(options);
  const exportRows = await listExportRows(client, onProgress);
  const targets = exportRows.filter(
    (row) =>
      row?.diet_session_id === SESSION_ID &&
      row?.publication_category === PUBLICATION_CATEGORY
  );
  invariant(
    targets.length === EXPECTED_TOTAL,
    "snapshot_export_target_count",
    "Admin export内の対象budget記事が441件ではありません",
    { expected: EXPECTED_TOTAL, actual: targets.length }
  );
  const records = [];
  for (let start = 0; start < targets.length; start += client.batchSize) {
    const batch = targets.slice(start, start + client.batchSize);
    for (const row of batch) {
      const record = await getRecord(client, row.id);
      invariant(
        record.name === row.name &&
          record.updated_at === row.updated_at &&
          record.diet_session_id === row.diet_session_id &&
          record.publication_category === row.publication_category &&
          record.publish_status === row.publish_status,
        "snapshot_export_get_conflict",
        `Admin exportと個別GETが一致しません: ${row.id}`
      );
      records.push({
        ...record,
        submitted_date: row.submitted_date,
        major_category: row.major_category,
      });
    }
    onProgress?.({
      event: "snapshot_get_progress",
      completed: records.length,
      total: targets.length,
    });
  }
  return records;
}

function journalHasCanary(events, manifestSha256, operation, canaryId) {
  return events.some(
    (event) =>
      event?.event === "canary_verified" &&
      event?.manifest_sha256 === manifestSha256 &&
      event?.operation === operation &&
      event?.id === canaryId
  );
}

export function journalHasBlockingCacheWarning(
  events,
  manifestSha256,
  operation
) {
  return events.some(
    (event) =>
      event?.manifest_sha256 === manifestSha256 &&
      event?.operation === operation &&
      ((event?.event === "record_cache_revalidation_failed" &&
        Array.isArray(event.warning_codes) &&
        event.warning_codes.includes("cache_revalidation_failed")) ||
        (event?.event === "record_applied" &&
          Array.isArray(event.warning_codes) &&
          event.warning_codes.includes("cache_revalidation_failed")))
  );
}

function selectCanary(entries, canaryId) {
  if (!canaryId) return entries[0];
  assertUuid(canaryId, "canary id");
  const entry = entries.find((candidate) => candidate.id === canaryId);
  invariant(
    entry,
    "canary_not_in_manifest",
    "指定canary IDがmanifestにありません"
  );
  return entry;
}

export function validateExecutionRangeOptions({
  apply,
  phase,
  fromOrdinal,
  toOrdinal,
}) {
  const hasFrom = fromOrdinal !== undefined;
  const hasTo = toOrdinal !== undefined;
  const rollout = apply === true && phase === "rollout";
  if (!rollout) {
    invariant(
      !hasFrom && !hasTo,
      "ordinal_range_not_allowed",
      "ordinal範囲はapply rolloutでだけ指定できます"
    );
    return null;
  }
  invariant(
    hasFrom && hasTo,
    "rollout_ordinal_range_required",
    "apply rolloutでは--from-ordinalと--to-ordinalが必要です"
  );
  invariant(
    Number.isInteger(fromOrdinal) &&
      Number.isInteger(toOrdinal) &&
      fromOrdinal >= 1 &&
      fromOrdinal <= toOrdinal &&
      toOrdinal <= EXPECTED_TOTAL,
    "invalid_rollout_ordinal_range",
    `rollout範囲は1〜${EXPECTED_TOTAL}の連続したordinalで指定してください`
  );
  const length = toOrdinal - fromOrdinal + 1;
  invariant(
    length <= MAX_BATCH_SIZE &&
      (length >= MIN_BATCH_SIZE || toOrdinal === EXPECTED_TOTAL),
    "invalid_rollout_ordinal_range_size",
    `rollout範囲は${MIN_BATCH_SIZE}〜${MAX_BATCH_SIZE}件（${EXPECTED_TOTAL}終端の最終範囲のみ${MIN_BATCH_SIZE}件未満可）で指定してください`
  );
  return { fromOrdinal, toOrdinal, length };
}

export function selectExecutionEntries(entries, options, canary) {
  const range = validateExecutionRangeOptions(options);
  if (options.apply !== true) return entries;
  if (options.phase === "canary") return [canary];
  const selected = entries.slice(range.fromOrdinal - 1, range.toOrdinal);
  invariant(
    selected.length === range.length &&
      selected[0]?.ordinal === range.fromOrdinal &&
      selected.at(-1)?.ordinal === range.toOrdinal,
    "manifest_ordinal_range_mismatch",
    "manifestのordinalと指定rollout範囲が一致しません"
  );
  return selected;
}

async function inspectBackfillRecord(client, entry) {
  const { trimmedText } = readAndVerifySource(entry);
  const current = await getRecord(client, entry.id);
  assertPublishedMetadata(current, entry);
  if (current.knowledge_source_sha256 === entry.trimmed_sha256) {
    assertTargetRecord(current, entry, trimmedText);
    return { state: "target", current, trimmedText };
  }
  invariant(
    current.knowledge_source === null &&
      current.knowledge_source_sha256 ===
        entry.expected_current_knowledge_source_sha256,
    "knowledge_source_conflict",
    `knowledge_sourceが初期nullでも対象原文でもありません: ${entry.issue}/${entry.topic_number}`
  );
  invariant(
    current.updated_at === entry.expected_updated_at,
    "updated_at_conflict",
    `updated_atがmanifestから変わりました: ${entry.issue}/${entry.topic_number}`
  );
  return { state: "baseline", current, trimmedText };
}

async function inspectRollbackRecord(client, entry) {
  const { trimmedText } = readAndVerifySource(entry);
  const current = await getRecord(client, entry.id);
  assertPublishedMetadata(current, entry);
  if (current.knowledge_source === null) {
    assertNullRecord(current, entry);
    return { state: "null", current, trimmedText };
  }
  assertTargetRecord(current, entry, trimmedText);
  return { state: "target", current, trimmedText };
}

async function processEntry({
  client,
  entry,
  operation,
  apply,
  journalFile,
  manifestSha256,
  runId,
}) {
  const inspected =
    operation === "backfill"
      ? await inspectBackfillRecord(client, entry)
      : await inspectRollbackRecord(client, entry);

  if (!apply) {
    appendJournal(journalFile, {
      event: "record_dry_run",
      at: new Date().toISOString(),
      run_id: runId,
      manifest_sha256: manifestSha256,
      operation,
      id: entry.id,
      issue: entry.issue,
      topic_number: entry.topic_number,
      current_state: inspected.state,
    });
    return inspected.state === (operation === "backfill" ? "target" : "null")
      ? "already_done"
      : "ready";
  }

  const completedState = operation === "backfill" ? "target" : "null";
  const alreadyCompleted = inspected.state === completedState;

  let warningCodes;
  if (operation === "backfill") {
    warningCodes = await patchRecord(
      client,
      entry,
      inspected.current,
      inspected.trimmedText,
      false
    );
  } else {
    warningCodes = await patchRecord(
      client,
      entry,
      inspected.current,
      null,
      true
    );
  }

  const verified = await getRecord(client, entry.id);
  if (operation === "backfill") {
    assertTargetRecord(verified, entry, inspected.trimmedText);
  } else {
    assertNullRecord(verified, entry);
  }
  if (warningCodes.length > 0) {
    appendJournal(journalFile, {
      event: "record_cache_revalidation_failed",
      at: new Date().toISOString(),
      run_id: runId,
      manifest_sha256: manifestSha256,
      operation,
      id: entry.id,
      issue: entry.issue,
      topic_number: entry.topic_number,
      state: completedState,
      target_sha256: operation === "backfill" ? entry.trimmed_sha256 : null,
      warning_codes: warningCodes,
    });
    throw new BackfillError(
      "cache_revalidation_warning",
      `更新後のcache再検証に失敗したため停止します: ${entry.issue}/${entry.topic_number}`,
      { id: entry.id, warning_codes: warningCodes }
    );
  }
  if (alreadyCompleted) {
    appendJournal(journalFile, {
      event: "record_idempotent",
      at: new Date().toISOString(),
      run_id: runId,
      manifest_sha256: manifestSha256,
      operation,
      id: entry.id,
      issue: entry.issue,
      topic_number: entry.topic_number,
      state: completedState,
    });
    return "already_done";
  }
  appendJournal(journalFile, {
    event: "record_applied",
    at: new Date().toISOString(),
    run_id: runId,
    manifest_sha256: manifestSha256,
    operation,
    id: entry.id,
    issue: entry.issue,
    topic_number: entry.topic_number,
    state: completedState,
    target_sha256: operation === "backfill" ? entry.trimmed_sha256 : null,
    warning_codes: warningCodes,
  });
  return "applied";
}

async function finalAudit(client, entries, expectedState, onProgress) {
  let verified = 0;
  for (let start = 0; start < entries.length; start += client.batchSize) {
    const batch = entries.slice(start, start + client.batchSize);
    for (const entry of batch) {
      const record = await getRecord(client, entry.id);
      if (expectedState === "target") {
        const { trimmedText } = readAndVerifySource(entry);
        assertTargetRecord(record, entry, trimmedText);
      } else {
        assertNullRecord(record, entry);
      }
      verified += 1;
    }
    onProgress?.({ event: "final_get_audit", verified, total: entries.length });
  }
  return verified;
}

export async function executeManifest(
  { manifest, manifestSha256 },
  options,
  onProgress
) {
  const operation = options.operation;
  invariant(
    operation === "backfill" || operation === "rollback",
    "invalid_operation",
    "operationはbackfillまたはrollbackです"
  );
  const apply = options.apply === true;
  if (apply) {
    assertSha256(options.confirmedManifestSha256, "--manifest-sha256");
    invariant(
      options.confirmedManifestSha256 === manifestSha256,
      "manifest_sha_mismatch",
      "指定manifest SHA-256が実ファイルと一致しません"
    );
    invariant(
      options.phase === "canary" || options.phase === "rollout",
      "apply_phase_required",
      "apply時は--phase canaryまたは--phase rolloutが必要です"
    );
  } else {
    invariant(
      options.phase === undefined,
      "dry_run_phase_forbidden",
      "dry-runでは--phaseを指定しないでください"
    );
  }

  const client = createClient(options);
  const journalFile = options.journalFile;
  const events = readJournal(journalFile);
  const canary = selectCanary(manifest.entries, options.canaryId);
  if (apply) {
    invariant(
      !journalHasBlockingCacheWarning(
        events,
        manifestSha256,
        operation
      ),
      "journal_cache_revalidation_unresolved",
      "同じmanifest・operationのjournalに未解決cache再検証警告があります"
    );
  }
  if (apply && options.phase === "rollout") {
    invariant(
      journalHasCanary(events, manifestSha256, operation, canary.id),
      "canary_not_verified",
      "同じmanifest・operationのcanary成功記録がありません"
    );
  }
  const selectedEntries = selectExecutionEntries(
    manifest.entries,
    {
      apply,
      phase: options.phase,
      fromOrdinal: options.fromOrdinal,
      toOrdinal: options.toOrdinal,
    },
    canary
  );
  const fromOrdinal = selectedEntries[0]?.ordinal ?? null;
  const toOrdinal = selectedEntries.at(-1)?.ordinal ?? null;
  const runId = crypto.randomUUID();
  appendJournal(journalFile, {
    event: "run_started",
    at: new Date().toISOString(),
    run_id: runId,
    manifest_sha256: manifestSha256,
    operation,
    apply,
    phase: apply ? options.phase : "dry-run",
    batch_size: client.batchSize,
    target_count: selectedEntries.length,
    canary_id: canary.id,
    from_ordinal: fromOrdinal,
    to_ordinal: toOrdinal,
  });

  const counts = { ready: 0, applied: 0, already_done: 0 };
  try {
    if (apply && options.phase === "rollout") {
      const inspectedCanary =
        operation === "backfill"
          ? await inspectBackfillRecord(client, canary)
          : await inspectRollbackRecord(client, canary);
      const expectedCanaryState = operation === "backfill" ? "target" : "null";
      invariant(
        inspectedCanary.state === expectedCanaryState,
        "canary_state_not_verified",
        "rollout直前GETでcanaryの期待状態を確認できません"
      );
      appendJournal(journalFile, {
        event: "rollout_canary_preflight",
        at: new Date().toISOString(),
        run_id: runId,
        manifest_sha256: manifestSha256,
        operation,
        id: canary.id,
        state: expectedCanaryState,
      });
    }
    let processed = 0;
    for (
      let start = 0;
      start < selectedEntries.length;
      start += client.batchSize
    ) {
      const batch = selectedEntries.slice(start, start + client.batchSize);
      appendJournal(journalFile, {
        event: "batch_started",
        at: new Date().toISOString(),
        run_id: runId,
        manifest_sha256: manifestSha256,
        operation,
        start_ordinal: batch[0].ordinal,
        end_ordinal: batch.at(-1).ordinal,
        batch_count: batch.length,
      });
      for (const entry of batch) {
        const result = await processEntry({
          client,
          entry,
          operation,
          apply,
          journalFile,
          manifestSha256,
          runId,
        });
        counts[result] += 1;
        processed += 1;
      }
      appendJournal(journalFile, {
        event: "batch_completed",
        at: new Date().toISOString(),
        run_id: runId,
        manifest_sha256: manifestSha256,
        operation,
        processed,
        total: selectedEntries.length,
      });
      onProgress?.({
        event: "run_progress",
        operation,
        apply,
        processed,
        total: selectedEntries.length,
        counts: { ...counts },
      });
    }

    let audited = 0;
    if (apply) {
      audited = await finalAudit(
        client,
        selectedEntries,
        operation === "backfill" ? "target" : "null",
        onProgress
      );
      if (options.phase === "canary") {
        appendJournal(journalFile, {
          event: "canary_verified",
          at: new Date().toISOString(),
          run_id: runId,
          manifest_sha256: manifestSha256,
          operation,
          id: canary.id,
          target_sha256:
            operation === "backfill" ? canary.trimmed_sha256 : null,
        });
      }
    }
    appendJournal(journalFile, {
      event: "run_completed",
      at: new Date().toISOString(),
      run_id: runId,
      manifest_sha256: manifestSha256,
      operation,
      apply,
      phase: apply ? options.phase : "dry-run",
      counts,
      final_get_audited: audited,
      from_ordinal: fromOrdinal,
      to_ordinal: toOrdinal,
    });
    return {
      run_id: runId,
      operation,
      apply,
      phase: apply ? options.phase : "dry-run",
      target_count: selectedEntries.length,
      counts,
      final_get_audited: audited,
      canary_id: canary.id,
      from_ordinal: fromOrdinal,
      to_ordinal: toOrdinal,
    };
  } catch (error) {
    appendJournal(journalFile, {
      event: "run_failed",
      at: new Date().toISOString(),
      run_id: runId,
      manifest_sha256: manifestSha256,
      operation,
      apply,
      phase: apply ? options.phase : "dry-run",
      from_ordinal: fromOrdinal,
      to_ordinal: toOrdinal,
      error_code:
        error instanceof BackfillError ? error.code : "unexpected_error",
    });
    throw error;
  }
}

export async function auditManifest({ manifest }, options, onProgress) {
  invariant(
    options.fromOrdinal === undefined && options.toOrdinal === undefined,
    "audit_ordinal_range_forbidden",
    "auditはordinal範囲を指定せず全manifestを対象にします"
  );
  invariant(
    options.expectedState === "target" || options.expectedState === "null",
    "invalid_audit_state",
    "auditの期待状態はtargetまたはnullです"
  );
  const client = createClient(options);
  return finalAudit(
    client,
    manifest.entries,
    options.expectedState,
    onProgress
  );
}
