import fs from "node:fs";
import path from "node:path";
import {
  EXPECTED_CATEGORY_COUNTS,
  EXPECTED_DATE_COUNTS,
  EXPECTED_ISSUE_COUNTS,
  EXPECTED_PAYLOAD_FILE_COUNT,
  EXPECTED_PAYLOAD_TOTAL,
  EXPECTED_TOTAL,
  expectedPayloadFiles,
  INITIAL_Q2_TOPIC_ID,
  INITIAL_Q2_TOPIC_TITLE,
  MANIFEST_TYPE,
  MAX_KNOWLEDGE_SOURCE_UTF16_LENGTH,
  PUBLICATION_CATEGORY,
  SCHEMA_VERSION,
  SESSION_ID,
  SNAPSHOT_TYPE,
} from "./constants.mjs";
import {
  assertCounts,
  assertSha256,
  assertUuid,
  canonicalExistingPath,
  countBy,
  duplicateValues,
  invariant,
  pathKey,
  readJson,
  sha256,
  textMetrics,
  unicodeLength,
} from "./shared.mjs";

const TOPIC_FILE_PATTERN = /^\d{3}_.+\.txt$/u;
const ISSUE_DIRECTORY_PATTERN = /^\d{4}-\d{2}-\d{2}_第0?([2-8])号$/u;

const SNAPSHOT_TOP_LEVEL_KEYS = [
  "snapshot_type",
  "schema_version",
  "generated_at",
  "diet_session_id",
  "publication_category",
  "record_count",
  "records",
];
const SNAPSHOT_ROW_KEYS = [
  "id",
  "name",
  "diet_session_id",
  "publication_category",
  "publish_status",
  "submitted_date",
  "major_category",
  "published_at",
  "updated_at",
  "knowledge_source_sha256",
];
const MANIFEST_TOP_LEVEL_KEYS = [
  "manifest_type",
  "schema_version",
  "generated_at",
  "diet_session_id",
  "publication_category",
  "normalization",
  "encoding",
  "target_count",
  "payload_file_count",
  "payload_entry_count",
  "payload_files",
  "admin_snapshot_path",
  "admin_snapshot_sha256",
  "vault_root",
  "issue_counts",
  "date_counts",
  "category_counts",
  "entries",
];
const MANIFEST_ENTRY_KEYS = [
  "ordinal",
  "id",
  "title",
  "diet_session_id",
  "publication_category",
  "publish_status",
  "submitted_date",
  "major_category",
  "published_at",
  "expected_updated_at",
  "expected_current_knowledge_source_sha256",
  "source_path",
  "source_relative_path",
  "issue",
  "topic_number",
  "questioner",
  "mapping_origin",
  "raw_sha256",
  "raw_utf16_length",
  "raw_utf8_bytes",
  "trimmed_sha256",
  "trimmed_utf16_length",
  "trimmed_utf8_bytes",
];

function assertExactKeys(value, expectedKeys, label) {
  invariant(
    value && typeof value === "object" && !Array.isArray(value),
    "invalid_object_shape",
    `${label}がobjectではありません`
  );
  const actual = Object.keys(value).sort();
  const expected = [...expectedKeys].sort();
  invariant(
    JSON.stringify(actual) === JSON.stringify(expected),
    "unexpected_object_keys",
    `${label}のkey集合が契約と一致しません`,
    {
      missing: expected.filter((key) => !actual.includes(key)),
      extra: actual.filter((key) => !expected.includes(key)),
    }
  );
}

function walkTopicFiles(directory) {
  const files = [];
  invariant(
    fs.existsSync(directory),
    "vault_root_missing",
    `Vault原文ディレクトリがありません: ${directory}`
  );
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkTopicFiles(fullPath));
    } else if (entry.isFile() && TOPIC_FILE_PATTERN.test(entry.name)) {
      files.push(canonicalExistingPath(fullPath));
    }
  }
  return files;
}

function normalizeCategory(vaultCategory) {
  return vaultCategory === "予算全体" ? "全体" : vaultCategory;
}

function normalizeQuestioner(value) {
  return String(value)
    .replace(/\s+(?:委員|議員)$/u, "")
    .trim();
}

export function validateKnowledgeSourceMetrics(metrics, origin) {
  invariant(
    Number.isInteger(metrics?.trimmed_utf16_length) &&
      metrics.trimmed_utf16_length >= 1 &&
      metrics.trimmed_utf16_length <= MAX_KNOWLEDGE_SOURCE_UTF16_LENGTH,
    "invalid_knowledge_source_length",
    `trim後の原文長は1〜${MAX_KNOWLEDGE_SOURCE_UTF16_LENGTH} UTF-16 code unitである必要があります: ${origin}`,
    { trimmed_utf16_length: metrics?.trimmed_utf16_length }
  );
}

function sourceMetadata(file, vaultRoot) {
  const rawText = fs.readFileSync(file, "utf8");
  const metrics = textMetrics(rawText);
  const relativePath = path.relative(vaultRoot, file);
  const parts = relativePath.split(path.sep);
  const directoryMatch = parts[0]?.match(ISSUE_DIRECTORY_PATTERN);
  const fileTopic = path.basename(file).match(/^(\d{3})_/u)?.[1] ?? null;
  const headerTopic =
    rawText.match(/^トピック番号:\s*(\d{3})\s*$/mu)?.[1] ?? null;
  const submittedDate = rawText.match(/^(\d{4}-\d{2}-\d{2})\s+/u)?.[1] ?? null;
  const headerCategory = rawText.match(/^分類:\s*(.+?)\s*$/mu)?.[1] ?? null;
  const questioner = rawText.match(/^質問者:\s*(.+?)\s*$/mu)?.[1] ?? null;

  invariant(
    parts.length >= 3 && directoryMatch,
    "invalid_source_path_shape",
    `原文パスから号数を読めません: ${relativePath}`
  );
  invariant(
    fileTopic && headerTopic && fileTopic === headerTopic,
    "source_topic_mismatch",
    `原文のファイル名とトピック番号が一致しません: ${relativePath}`,
    { file_topic: fileTopic, header_topic: headerTopic }
  );
  invariant(
    submittedDate,
    "source_date_missing",
    `原文1行目から日付を読めません: ${relativePath}`
  );
  invariant(
    headerCategory && parts[1] === headerCategory,
    "source_category_mismatch",
    `原文のフォルダと分類が一致しません: ${relativePath}`,
    { folder: parts[1], header: headerCategory }
  );
  invariant(
    questioner,
    "source_questioner_missing",
    `原文から質問者を読めません: ${relativePath}`
  );
  validateKnowledgeSourceMetrics(metrics, relativePath);

  const issueNumber = Number(directoryMatch[1]);
  return {
    absolute_path: file,
    path_key: pathKey(file),
    relative_path: relativePath.split(path.sep).join("/"),
    issue: `Q${issueNumber}`,
    issue_number: issueNumber,
    topic_number: fileTopic,
    submitted_date: submittedDate,
    vault_category: headerCategory,
    major_category: normalizeCategory(headerCategory),
    questioner,
    ...metrics,
  };
}

function validateTitle(title, origin) {
  invariant(
    typeof title === "string" && title.length > 0,
    "title_missing",
    `記事名がありません: ${origin}`
  );
  invariant(
    unicodeLength(title) <= 20 &&
      title.endsWith("か") &&
      !/[?？]$/u.test(title),
    "invalid_title",
    `記事名が20字以内・末尾「か」の質問文ではありません: ${origin}`,
    { title, unicode_length: unicodeLength(title) }
  );
}

function validatePayload(item, source, origin) {
  invariant(
    item && typeof item === "object" && !Array.isArray(item),
    "invalid_payload_item",
    `payload要素がobjectではありません: ${origin}`
  );
  validateTitle(item.name, origin);
  invariant(
    item.publication_category === PUBLICATION_CATEGORY,
    "payload_publication_mismatch",
    `payloadのpublication_categoryがbudgetではありません: ${origin}`
  );
  invariant(
    item.diet_session_id === SESSION_ID,
    "payload_session_mismatch",
    `payloadの会期UUIDが一致しません: ${origin}`
  );
  invariant(
    item.submitted_date === source.submitted_date,
    "payload_date_mismatch",
    `payloadと原文の日付が一致しません: ${origin}`,
    { payload: item.submitted_date, source: source.submitted_date }
  );
  invariant(
    item.major_category === source.major_category,
    "payload_category_mismatch",
    `payloadと原文の分類が一致しません: ${origin}`,
    { payload: item.major_category, source: source.major_category }
  );
  if (item.issue !== undefined) {
    invariant(
      item.issue === source.issue,
      "payload_issue_mismatch",
      `payloadと原文の号が一致しません: ${origin}`
    );
  }
  if (item.source_topic_number !== undefined) {
    invariant(
      String(item.source_topic_number).padStart(3, "0") === source.topic_number,
      "payload_topic_mismatch",
      `payloadと原文のトピック番号が一致しません: ${origin}`
    );
  }
  if (item.questioner !== undefined) {
    invariant(
      normalizeQuestioner(item.questioner) ===
        normalizeQuestioner(source.questioner),
      "payload_questioner_mismatch",
      `payloadと原文の質問者が一致しません: ${origin}`,
      { payload: item.questioner, source: source.questioner }
    );
  }
}

function readPayloadEntries(payloadDirectory, sourcesByPath) {
  const files = expectedPayloadFiles(payloadDirectory);
  invariant(
    files.length === EXPECTED_PAYLOAD_FILE_COUNT,
    "payload_file_contract_error",
    "期待payloadファイル一覧が27件ではありません"
  );

  const entries = [];
  const fileMetadata = [];
  for (const file of files) {
    const absoluteFile = path.resolve(file);
    const { value, raw } = readJson(absoluteFile);
    invariant(
      Array.isArray(value),
      "payload_not_array",
      `payloadがJSON配列ではありません: ${absoluteFile}`
    );
    fileMetadata.push({
      path: absoluteFile,
      sha256: sha256(raw),
      entries: value.length,
    });
    value.forEach((item, index) => {
      const origin = `${absoluteFile}#${index}`;
      const sourcePath = canonicalExistingPath(item?.source_path);
      const source = sourcesByPath.get(pathKey(sourcePath));
      invariant(
        source,
        "payload_source_outside_vault",
        `payloadの原文が対象Vault 441件にありません: ${origin}`,
        { source_path: sourcePath }
      );
      validatePayload(item, source, origin);
      entries.push({
        title: item.name,
        source,
        payload_file: absoluteFile,
        payload_index: index,
      });
    });
  }

  invariant(
    entries.length === EXPECTED_PAYLOAD_TOTAL,
    "payload_total_mismatch",
    "27 payloadの合計が440件ではありません",
    { expected: EXPECTED_PAYLOAD_TOTAL, actual: entries.length }
  );
  const duplicateSources = duplicateValues(
    entries.map((entry) => entry.source.path_key)
  );
  const duplicateTitles = duplicateValues(entries.map((entry) => entry.title));
  invariant(
    duplicateSources.length === 0,
    "duplicate_payload_source",
    "payload内で原文が重複しています",
    { duplicates: duplicateSources }
  );
  invariant(
    duplicateTitles.length === 0,
    "duplicate_payload_title",
    "payload内で記事名が重複しています",
    { duplicates: duplicateTitles }
  );
  return { entries, fileMetadata };
}

function validateSnapshotRow(row, origin) {
  invariant(
    row && typeof row === "object" && !Array.isArray(row),
    "invalid_snapshot_row",
    `snapshot rowがobjectではありません: ${origin}`
  );
  assertExactKeys(row, SNAPSHOT_ROW_KEYS, origin);
  assertUuid(row.id, `${origin}.id`);
  validateTitle(row.name, origin);
  invariant(
    row.diet_session_id === SESSION_ID,
    "snapshot_session_mismatch",
    `snapshot rowの会期UUIDが一致しません: ${origin}`
  );
  invariant(
    row.publication_category === PUBLICATION_CATEGORY,
    "snapshot_publication_mismatch",
    `snapshot rowがbudgetではありません: ${origin}`
  );
  invariant(
    row.publish_status === "published",
    "snapshot_not_published",
    `snapshot rowがpublishedではありません: ${origin}`
  );
  invariant(
    typeof row.published_at === "string" && row.published_at.length > 0,
    "snapshot_published_at_missing",
    `snapshot rowにpublished_atがありません: ${origin}`
  );
  invariant(
    typeof row.updated_at === "string" && row.updated_at.length > 0,
    "snapshot_updated_at_missing",
    `snapshot rowにupdated_atがありません: ${origin}`
  );
  invariant(
    row.knowledge_source_sha256 === null,
    "snapshot_existing_knowledge_source",
    `backfill前snapshotに既存knowledge_sourceがあります: ${origin}`
  );
}

export function sanitizeSnapshotRows(
  rows,
  generatedAt = new Date().toISOString()
) {
  invariant(
    Array.isArray(rows),
    "snapshot_records_not_array",
    "snapshot元recordsが配列ではありません"
  );
  const filtered = rows.filter(
    (row) =>
      row?.diet_session_id === SESSION_ID &&
      row?.publication_category === PUBLICATION_CATEGORY
  );
  invariant(
    filtered.length === EXPECTED_TOTAL,
    "snapshot_target_count_mismatch",
    "対象会期のbudget記事が441件ではありません",
    { expected: EXPECTED_TOTAL, actual: filtered.length }
  );

  const sanitizedRows = filtered.map((row, index) => {
    const sourceValue = row.knowledge_source;
    const sourceHash =
      sourceValue === null || sourceValue === undefined
        ? (row.knowledge_source_sha256 ?? null)
        : sha256(String(sourceValue));
    const sanitized = {
      id: row.id,
      name: row.name,
      diet_session_id: row.diet_session_id,
      publication_category: row.publication_category,
      publish_status: row.publish_status,
      submitted_date: row.submitted_date,
      major_category: row.major_category,
      published_at: row.published_at,
      updated_at: row.updated_at,
      knowledge_source_sha256: sourceHash,
    };
    validateSnapshotRow(sanitized, `records[${index}]`);
    return sanitized;
  });
  return {
    snapshot_type: SNAPSHOT_TYPE,
    schema_version: SCHEMA_VERSION,
    generated_at: generatedAt,
    diet_session_id: SESSION_ID,
    publication_category: PUBLICATION_CATEGORY,
    record_count: sanitizedRows.length,
    records: sanitizedRows,
  };
}

function loadSnapshot(snapshotFile) {
  const absoluteFile = path.resolve(snapshotFile);
  const { value, raw } = readJson(absoluteFile);
  invariant(
    value?.snapshot_type === SNAPSHOT_TYPE &&
      value?.schema_version === SCHEMA_VERSION,
    "invalid_snapshot_type",
    "指定JSONはこのツールのAdmin metadata snapshotではありません"
  );
  assertExactKeys(value, SNAPSHOT_TOP_LEVEL_KEYS, "snapshot");
  invariant(
    value.diet_session_id === SESSION_ID &&
      value.publication_category === PUBLICATION_CATEGORY,
    "snapshot_scope_mismatch",
    "snapshotの会期または公開種別が一致しません"
  );
  invariant(
    value.record_count === EXPECTED_TOTAL &&
      Array.isArray(value.records) &&
      value.records.length === EXPECTED_TOTAL,
    "snapshot_count_mismatch",
    "snapshotが441件ではありません"
  );
  value.records.forEach((row, index) => {
    validateSnapshotRow(row, `records[${index}]`);
  });
  const duplicateIds = duplicateValues(value.records.map((row) => row.id));
  const duplicateTitles = duplicateValues(value.records.map((row) => row.name));
  invariant(
    duplicateIds.length === 0,
    "duplicate_snapshot_id",
    "snapshotに重複IDがあります",
    { duplicates: duplicateIds }
  );
  invariant(
    duplicateTitles.length === 0,
    "duplicate_snapshot_title",
    "snapshotに重複記事名があります",
    { duplicates: duplicateTitles }
  );
  return { rows: value.records, file: absoluteFile, sha256: sha256(raw) };
}

function manifestEntry(adminRow, mapping, ordinal) {
  const source = mapping.source;
  return {
    ordinal,
    id: adminRow.id,
    title: adminRow.name,
    diet_session_id: SESSION_ID,
    publication_category: PUBLICATION_CATEGORY,
    publish_status: "published",
    submitted_date: source.submitted_date,
    major_category: source.major_category,
    published_at: adminRow.published_at,
    expected_updated_at: adminRow.updated_at,
    expected_current_knowledge_source_sha256: null,
    source_path: source.absolute_path,
    source_relative_path: source.relative_path,
    issue: source.issue,
    topic_number: source.topic_number,
    questioner: source.questioner,
    mapping_origin: mapping.mapping_origin,
    raw_sha256: source.raw_sha256,
    raw_utf16_length: source.raw_utf16_length,
    raw_utf8_bytes: source.raw_utf8_bytes,
    trimmed_sha256: source.trimmed_sha256,
    trimmed_utf16_length: source.trimmed_utf16_length,
    trimmed_utf8_bytes: source.trimmed_utf8_bytes,
  };
}

export function buildManifest({ payloadDirectory, vaultRoot, snapshotFile }) {
  const canonicalVaultRoot = canonicalExistingPath(vaultRoot);
  const vaultFiles = walkTopicFiles(canonicalVaultRoot).sort((left, right) =>
    left.localeCompare(right, "ja")
  );
  invariant(
    vaultFiles.length === EXPECTED_TOTAL,
    "vault_topic_count_mismatch",
    "対象Vaultの原文txtが441件ではありません",
    { expected: EXPECTED_TOTAL, actual: vaultFiles.length }
  );
  const sources = vaultFiles.map((file) =>
    sourceMetadata(file, canonicalVaultRoot)
  );
  const sourceDuplicates = duplicateValues(
    sources.map((source) => `${source.issue}/${source.topic_number}`)
  );
  invariant(
    sourceDuplicates.length === 0,
    "duplicate_issue_topic",
    "原文の号・トピック番号が重複しています",
    { duplicates: sourceDuplicates }
  );
  assertCounts(
    countBy(sources, (source) => source.issue),
    EXPECTED_ISSUE_COUNTS,
    "vault_issue"
  );
  assertCounts(
    countBy(sources, (source) => source.submitted_date),
    EXPECTED_DATE_COUNTS,
    "vault_date"
  );
  assertCounts(
    countBy(sources, (source) => source.major_category),
    EXPECTED_CATEGORY_COUNTS,
    "vault_category"
  );

  const sourcesByPath = new Map(
    sources.map((source) => [source.path_key, source])
  );
  const { entries: payloadEntries, fileMetadata } = readPayloadEntries(
    payloadDirectory,
    sourcesByPath
  );
  const payloadSourceKeys = new Set(
    payloadEntries.map((entry) => entry.source.path_key)
  );
  const initialSources = sources.filter(
    (source) => source.issue === "Q2" && source.topic_number === "001"
  );
  invariant(
    initialSources.length === 1,
    "initial_source_count_mismatch",
    "Q2/001原文がちょうど1件ではありません"
  );
  const initialSource = initialSources[0];
  invariant(
    !payloadSourceKeys.has(initialSource.path_key),
    "initial_source_in_payloads",
    "Q2/001が27 payload側にも含まれています"
  );
  const expectedSourceKeys = new Set([
    ...payloadSourceKeys,
    initialSource.path_key,
  ]);
  invariant(
    expectedSourceKeys.size === EXPECTED_TOTAL &&
      expectedSourceKeys.size === sourcesByPath.size,
    "source_set_count_mismatch",
    "27 payload + Q2/001とVault 441件の集合サイズが一致しません"
  );
  const missingSources = sources
    .filter((source) => !expectedSourceKeys.has(source.path_key))
    .map((source) => source.relative_path);
  invariant(
    missingSources.length === 0,
    "source_set_mismatch",
    "27 payload + Q2/001とVault 441件の集合が一致しません",
    { unexpected_vault_sources: missingSources }
  );

  const snapshot = loadSnapshot(snapshotFile);
  assertCounts(
    countBy(snapshot.rows, (row) => row.submitted_date),
    EXPECTED_DATE_COUNTS,
    "snapshot_date"
  );
  assertCounts(
    countBy(snapshot.rows, (row) => row.major_category),
    EXPECTED_CATEGORY_COUNTS,
    "snapshot_category"
  );
  const adminByTitle = new Map(snapshot.rows.map((row) => [row.name, row]));
  const mappings = payloadEntries.map((entry) => {
    const adminRow = adminByTitle.get(entry.title);
    invariant(
      adminRow,
      "payload_title_not_in_snapshot",
      `payload記事名に一致する管理記事がありません: ${entry.title}`
    );
    invariant(
      adminRow.submitted_date === entry.source.submitted_date &&
        adminRow.major_category === entry.source.major_category,
      "payload_admin_metadata_mismatch",
      `payload原文と管理記事のメタデータが一致しません: ${entry.title}`,
      {
        source_date: entry.source.submitted_date,
        admin_date: adminRow.submitted_date,
        source_category: entry.source.major_category,
        admin_category: adminRow.major_category,
      }
    );
    return {
      adminRow,
      source: entry.source,
      mapping_origin: `${entry.payload_file}#${entry.payload_index}`,
    };
  });
  const payloadTitles = new Set(payloadEntries.map((entry) => entry.title));
  const unmatchedRows = snapshot.rows.filter(
    (row) => !payloadTitles.has(row.name)
  );
  invariant(
    unmatchedRows.length === 1,
    "initial_admin_row_count_mismatch",
    "Q2/001に割り当てる未一致の管理記事が1件ではありません",
    { unmatched_titles: unmatchedRows.map((row) => row.name) }
  );
  const initialAdminRow = unmatchedRows[0];
  invariant(
    initialAdminRow.id === INITIAL_Q2_TOPIC_ID &&
      initialAdminRow.name === INITIAL_Q2_TOPIC_TITLE,
    "initial_admin_identity_mismatch",
    "Q2/001の既知IDまたは正式タイトルが一致しません",
    {
      expected_id: INITIAL_Q2_TOPIC_ID,
      actual_id: initialAdminRow.id,
      expected_title: INITIAL_Q2_TOPIC_TITLE,
      actual_title: initialAdminRow.name,
    }
  );
  invariant(
    initialAdminRow.submitted_date === initialSource.submitted_date &&
      initialAdminRow.major_category === initialSource.major_category,
    "initial_admin_metadata_mismatch",
    "Q2/001原文と未一致管理記事のメタデータが一致しません",
    {
      title: initialAdminRow.name,
      source_date: initialSource.submitted_date,
      admin_date: initialAdminRow.submitted_date,
      source_category: initialSource.major_category,
      admin_category: initialAdminRow.major_category,
    }
  );
  mappings.push({
    adminRow: initialAdminRow,
    source: initialSource,
    mapping_origin: "initial:Q2/001",
  });
  invariant(
    mappings.length === EXPECTED_TOTAL,
    "mapping_count_mismatch",
    "管理記事と原文のmappingが441件ではありません"
  );

  mappings.sort(
    (left, right) =>
      left.source.issue_number - right.source.issue_number ||
      left.source.topic_number.localeCompare(right.source.topic_number)
  );
  const entries = mappings.map((mapping, index) =>
    manifestEntry(mapping.adminRow, mapping, index + 1)
  );
  const duplicateManifestIds = duplicateValues(
    entries.map((entry) => entry.id)
  );
  const duplicateManifestSources = duplicateValues(
    entries.map((entry) => pathKey(entry.source_path))
  );
  invariant(
    duplicateManifestIds.length === 0 && duplicateManifestSources.length === 0,
    "manifest_mapping_not_one_to_one",
    "manifestのIDまたは原文が重複しています",
    {
      duplicate_ids: duplicateManifestIds,
      duplicate_sources: duplicateManifestSources,
    }
  );

  return {
    manifest_type: MANIFEST_TYPE,
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    diet_session_id: SESSION_ID,
    publication_category: PUBLICATION_CATEGORY,
    normalization: "String.prototype.trim()",
    encoding: "utf8",
    target_count: entries.length,
    payload_file_count: fileMetadata.length,
    payload_entry_count: payloadEntries.length,
    payload_files: fileMetadata,
    admin_snapshot_path: snapshot.file,
    admin_snapshot_sha256: snapshot.sha256,
    vault_root: canonicalVaultRoot,
    issue_counts: countBy(entries, (entry) => entry.issue),
    date_counts: countBy(entries, (entry) => entry.submitted_date),
    category_counts: countBy(entries, (entry) => entry.major_category),
    entries,
  };
}

export function loadAndValidateManifest(manifestFile) {
  const absoluteFile = path.resolve(manifestFile);
  const { value, raw } = readJson(absoluteFile);
  invariant(
    value?.manifest_type === MANIFEST_TYPE &&
      value?.schema_version === SCHEMA_VERSION,
    "invalid_manifest_type",
    "指定JSONはこのツールのmanifestではありません"
  );
  assertExactKeys(value, MANIFEST_TOP_LEVEL_KEYS, "manifest");
  invariant(
    value.diet_session_id === SESSION_ID &&
      value.publication_category === PUBLICATION_CATEGORY,
    "manifest_scope_mismatch",
    "manifestの会期または公開種別が一致しません"
  );
  invariant(
    value.target_count === EXPECTED_TOTAL &&
      Array.isArray(value.entries) &&
      value.entries.length === EXPECTED_TOTAL,
    "manifest_count_mismatch",
    "manifestが441件ではありません"
  );
  invariant(
    value.normalization === "String.prototype.trim()" &&
      value.encoding === "utf8" &&
      value.payload_file_count === EXPECTED_PAYLOAD_FILE_COUNT &&
      value.payload_entry_count === EXPECTED_PAYLOAD_TOTAL &&
      Array.isArray(value.payload_files) &&
      value.payload_files.length === EXPECTED_PAYLOAD_FILE_COUNT,
    "manifest_contract_mismatch",
    "manifestの生成契約またはpayload件数が一致しません"
  );
  value.payload_files.forEach((file, index) => {
    assertExactKeys(
      file,
      ["path", "sha256", "entries"],
      `payload_files[${index}]`
    );
    assertSha256(file.sha256, `payload_files[${index}].sha256`);
    invariant(
      typeof file.path === "string" &&
        Number.isInteger(file.entries) &&
        file.entries >= 0,
      "invalid_manifest_payload_file",
      `payload_files[${index}]が不正です`
    );
  });
  assertSha256(value.admin_snapshot_sha256, "admin_snapshot_sha256");
  const canonicalVaultRoot = canonicalExistingPath(value.vault_root);
  assertCounts(value.issue_counts, EXPECTED_ISSUE_COUNTS, "manifest_issue");
  assertCounts(value.date_counts, EXPECTED_DATE_COUNTS, "manifest_date");
  assertCounts(
    value.category_counts,
    EXPECTED_CATEGORY_COUNTS,
    "manifest_category"
  );
  assertCounts(
    countBy(value.entries, (entry) => entry.issue),
    EXPECTED_ISSUE_COUNTS,
    "manifest_entry_issue"
  );
  assertCounts(
    countBy(value.entries, (entry) => entry.submitted_date),
    EXPECTED_DATE_COUNTS,
    "manifest_entry_date"
  );
  assertCounts(
    countBy(value.entries, (entry) => entry.major_category),
    EXPECTED_CATEGORY_COUNTS,
    "manifest_entry_category"
  );
  value.entries.forEach((entry, index) => {
    assertExactKeys(entry, MANIFEST_ENTRY_KEYS, `entries[${index}]`);
    invariant(
      entry.ordinal === index + 1,
      "manifest_ordinal_mismatch",
      `manifestのordinalが連続していません: ${index}`
    );
    assertUuid(entry.id, `entries[${index}].id`);
    validateTitle(entry.title, `entries[${index}]`);
    invariant(
      entry.diet_session_id === SESSION_ID &&
        entry.publication_category === PUBLICATION_CATEGORY &&
        entry.publish_status === "published" &&
        typeof entry.published_at === "string" &&
        entry.published_at.length > 0 &&
        typeof entry.expected_updated_at === "string" &&
        entry.expected_updated_at.length > 0 &&
        /^Q[2-8]$/u.test(entry.issue) &&
        /^\d{3}$/u.test(entry.topic_number) &&
        typeof entry.questioner === "string" &&
        entry.questioner.length > 0 &&
        typeof entry.mapping_origin === "string" &&
        entry.mapping_origin.length > 0,
      "invalid_manifest_entry_metadata",
      `manifest entryの公開メタデータが不正です: entries[${index}]`
    );
    invariant(
      entry.expected_current_knowledge_source_sha256 === null,
      "manifest_non_null_baseline",
      `manifestの初期knowledge_sourceがnullではありません: ${entry.id}`
    );
    for (const key of ["raw_sha256", "trimmed_sha256"]) {
      assertSha256(entry[key], `entries[${index}].${key}`);
    }
    for (const key of [
      "raw_utf16_length",
      "raw_utf8_bytes",
      "trimmed_utf16_length",
      "trimmed_utf8_bytes",
    ]) {
      invariant(
        Number.isInteger(entry[key]) && entry[key] >= 0,
        "invalid_manifest_length",
        `manifestの長さ指標が不正です: entries[${index}].${key}`
      );
    }
    validateKnowledgeSourceMetrics(entry, `entries[${index}]`);
    const canonicalSource = canonicalExistingPath(entry.source_path);
    const relative = path.relative(canonicalVaultRoot, canonicalSource);
    invariant(
      relative.length > 0 &&
        !relative.startsWith(`..${path.sep}`) &&
        relative !== ".." &&
        !path.isAbsolute(relative) &&
        relative.split(path.sep).join("/") === entry.source_relative_path,
      "manifest_source_outside_vault",
      `manifest原文が固定Vault外または相対パス不一致です: entries[${index}]`
    );
  });
  invariant(
    duplicateValues(value.entries.map((entry) => entry.id)).length === 0,
    "duplicate_manifest_id",
    "manifestに重複IDがあります"
  );
  invariant(
    duplicateValues(value.entries.map((entry) => entry.title)).length === 0,
    "duplicate_manifest_title",
    "manifestに重複記事名があります"
  );
  invariant(
    duplicateValues(value.entries.map((entry) => pathKey(entry.source_path)))
      .length === 0,
    "duplicate_manifest_source",
    "manifestに重複原文があります"
  );
  return {
    manifest: value,
    file: absoluteFile,
    sha256: sha256(raw),
  };
}

export function readAndVerifySource(entry) {
  const canonicalPath = canonicalExistingPath(entry.source_path);
  invariant(
    pathKey(canonicalPath) === pathKey(entry.source_path),
    "source_path_changed",
    `原文の実体パスがmanifest作成時から変わりました: ${entry.id}`
  );
  const rawText = fs.readFileSync(canonicalPath, "utf8");
  const metrics = textMetrics(rawText);
  for (const key of [
    "raw_sha256",
    "raw_utf16_length",
    "raw_utf8_bytes",
    "trimmed_sha256",
    "trimmed_utf16_length",
    "trimmed_utf8_bytes",
  ]) {
    invariant(
      metrics[key] === entry[key],
      "source_changed_since_manifest",
      `原文がmanifest作成時から変わりました: ${entry.issue}/${entry.topic_number}`,
      { field: key, expected: entry[key], actual: metrics[key] }
    );
  }
  return { trimmedText: rawText.trim(), metrics };
}
