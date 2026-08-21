import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  afterEach,
  beforeEach,
  describe,
  test,
} from "node:test";
import {
  DEFAULT_ENDPOINT,
  DEFAULT_EXPORT_ENDPOINT,
  PUBLICATION_CATEGORY,
  SESSION_ID,
} from "./constants.mjs";
import {
  sanitizeSnapshotRows,
  validateKnowledgeSourceMetrics,
} from "./manifest.mjs";
import {
  createClient,
  executeManifest,
  fetchJson,
  listExportRows,
  selectExecutionEntries,
  validateExecutionRangeOptions,
} from "./runner.mjs";
import {
  acquireLock,
  appendJournal,
  BackfillError,
  readJournal,
  sha256,
  textMetrics,
} from "./shared.mjs";

const originalFetch = globalThis.fetch;
const originalAdminToken = process.env.ADMIN_API_TOKEN;
const manifestSha256 = sha256("runner regression manifest");
const tempDirectories = [];

function temporaryDirectory() {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "budget-knowledge-runner-test-")
  );
  tempDirectories.push(directory);
  return directory;
}

function expectSyncCode(callback, code) {
  assert.throws(callback, (error) => {
    assert.ok(error instanceof BackfillError);
    assert.equal(error.code, code);
    return true;
  });
}

async function expectAsyncCode(promise, code) {
  await assert.rejects(promise, (error) => {
    assert.ok(error instanceof BackfillError);
    assert.equal(error.code, code);
    return true;
  });
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function createEntry(sourceText = "予算特別委員会の原文", ordinal = 1) {
  const directory = temporaryDirectory();
  const sourceFile = path.join(directory, `${String(ordinal).padStart(3, "0")}.txt`);
  fs.writeFileSync(sourceFile, sourceText, "utf8");
  const sourcePath = fs.realpathSync.native(sourceFile);
  return {
    ordinal,
    id: `00000000-0000-4000-8000-${String(ordinal).padStart(12, "0")}`,
    title: `予算の質問${ordinal}ですか`,
    diet_session_id: SESSION_ID,
    publication_category: PUBLICATION_CATEGORY,
    publish_status: "published",
    submitted_date: "2026-03-05",
    major_category: "全体",
    published_at: "2026-08-17T00:00:00.000Z",
    expected_updated_at: "2026-08-17T00:00:01.000Z",
    expected_current_knowledge_source_sha256: null,
    source_path: sourcePath,
    source_relative_path: path.basename(sourcePath),
    issue: "Q2",
    topic_number: String(ordinal).padStart(3, "0"),
    questioner: "テスト議員",
    mapping_origin: "runner.test.mjs",
    ...textMetrics(sourceText),
  };
}

function sourceMetrics(source) {
  return {
    knowledge_source_sha256: source === null ? null : sha256(source),
    knowledge_source_length: source === null ? 0 : source.length,
    knowledge_source_bytes:
      source === null ? 0 : Buffer.byteLength(source, "utf8"),
  };
}

function installFakeKnowledgeSourceApiForEntries(
  entries,
  initialSources,
  warnings = []
) {
  const states = new Map(
    entries.map((entry) => [
      entry.id,
      {
        source: initialSources.get(entry.id) ?? null,
        updatedAt: entry.expected_updated_at,
      },
    ])
  );
  const calls = [];
  globalThis.fetch = async (input, init = {}) => {
    const url = new URL(String(input));
    const method = init.method ?? "GET";
    const request = method === "PATCH" ? JSON.parse(String(init.body)) : null;
    const id = request?.id ?? url.searchParams.get("id");
    const entry = entries.find((candidate) => candidate.id === id);
    const state = states.get(id);
    assert.ok(entry, `fixture entry not found: ${id}`);
    assert.ok(state, `fixture state not found: ${id}`);
    calls.push({ method, id, allowClear: request?.allow_clear });
    if (method === "GET") {
      return jsonResponse({
        success: true,
        bill_id: entry.id,
        name: entry.title,
        diet_session_id: SESSION_ID,
        publication_category: PUBLICATION_CATEGORY,
        publish_status: "published",
        updated_at: state.updatedAt,
        published_at: entry.published_at,
        knowledge_source: state.source,
        ...sourceMetrics(state.source),
      });
    }
    assert.equal(method, "PATCH");
    const hasChange = state.source !== request.knowledge_source;
    const previous = {
      updated_at: state.updatedAt,
      published_at: entry.published_at,
      ...sourceMetrics(state.source),
    };
    if (hasChange) {
      state.source = request.knowledge_source;
      state.updatedAt = "2026-08-17T00:00:02.000Z";
    }
    const current = {
      updated_at: state.updatedAt,
      published_at: entry.published_at,
      ...sourceMetrics(state.source),
    };
    return jsonResponse({
      success: true,
      bill_id: entry.id,
      name: entry.title,
      diet_session_id: SESSION_ID,
      publication_category: PUBLICATION_CATEGORY,
      publish_status: "published",
      dry_run: false,
      updated: hasChange,
      would_update: hasChange,
      previous,
      current,
      candidate: sourceMetrics(state.source),
      warnings: warnings.map((code) => ({ code })),
    });
  };
  return { calls, states };
}

function installFakeKnowledgeSourceApi(entry, initialSource, warnings = []) {
  const api = installFakeKnowledgeSourceApiForEntries(
    [entry],
    new Map([[entry.id, initialSource]]),
    warnings
  );
  return { calls: api.calls, state: api.states.get(entry.id) };
}

function executeOptions(entry, journalFile, operation, phase, overrides = {}) {
  return {
    baseUrl: "http://localhost/",
    endpoint: DEFAULT_ENDPOINT,
    exportEndpoint: DEFAULT_EXPORT_ENDPOINT,
    batchSize: 10,
    timeoutMs: 5_000,
    operation,
    apply: true,
    phase,
    confirmedManifestSha256: manifestSha256,
    canaryId: entry.id,
    journalFile,
    ...overrides,
  };
}

function exportPage({ records, count, offset, hasMore }) {
  return {
    success: true,
    item_type: "report",
    count,
    offset,
    limit: 100,
    returned_count: records.length,
    next_offset: hasMore ? offset + records.length : null,
    has_more: hasMore,
    truncated_by_response_size: hasMore,
    records,
  };
}

describe("budget knowledge_source backfill runner", { concurrency: false }, () => {
  beforeEach(() => {
    process.env.ADMIN_API_TOKEN = "runner-regression-token";
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalAdminToken === undefined) {
      delete process.env.ADMIN_API_TOKEN;
    } else {
      process.env.ADMIN_API_TOKEN = originalAdminToken;
    }
    while (tempDirectories.length > 0) {
      fs.rmSync(tempDirectories.pop(), { recursive: true, force: true });
    }
  });

  test("unsafe originとprotocol-relative endpointを拒否する", () => {
    expectSyncCode(
      () =>
        createClient({
          baseUrl: "https://attacker.example/",
          endpoint: DEFAULT_ENDPOINT,
          exportEndpoint: DEFAULT_EXPORT_ENDPOINT,
          batchSize: 10,
          timeoutMs: 5_000,
        }),
      "unsafe_base_url"
    );
    expectSyncCode(
      () =>
        createClient({
          baseUrl: "http://localhost/",
          endpoint: "//attacker.example/api",
          exportEndpoint: DEFAULT_EXPORT_ENDPOINT,
          batchSize: 10,
          timeoutMs: 5_000,
        }),
      "unsafe_api_endpoint"
    );
  });

  test(
    "headers後に停止したresponse bodyもtimeoutする",
    { timeout: 1_000 },
    async () => {
      globalThis.fetch = async (_input, init = {}) => {
        const signal = init.signal;
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode('{"success":'));
              signal.addEventListener(
                "abort",
                () =>
                  controller.error(new DOMException("Aborted", "AbortError")),
                { once: true }
              );
            },
          })
        );
      };

      await expectAsyncCode(
        fetchJson({
          token: "runner-regression-token",
          url: new URL("http://localhost/stalled"),
          timeoutMs: 30,
        }),
        "api_transport_error"
      );
    }
  );

  test("export pagination metadataとpage間ID重複を検証する", async () => {
    const firstId = "00000000-0000-4000-8000-000000000001";
    const secondId = "00000000-0000-4000-8000-000000000002";
    const thirdId = "00000000-0000-4000-8000-000000000003";
    const client = {
      token: "runner-regression-token",
      baseUrl: new URL("http://localhost/"),
      exportEndpoint: DEFAULT_EXPORT_ENDPOINT,
      timeoutMs: 5_000,
    };

    let pages = [
      exportPage({ records: [{ id: firstId }], count: 2, offset: 0, hasMore: true }),
      exportPage({ records: [{ id: secondId }], count: 2, offset: 1, hasMore: false }),
    ];
    globalThis.fetch = async () => jsonResponse(pages.shift());
    const rows = await listExportRows(client);
    assert.deepEqual(
      rows.map((row) => row.id),
      [firstId, secondId]
    );

    pages = [
      {
        ...exportPage({ records: [{ id: firstId }], count: 1, offset: 0, hasMore: false }),
        returned_count: 0,
      },
    ];
    globalThis.fetch = async () => jsonResponse(pages.shift());
    await expectAsyncCode(
      listExportRows(client),
      "invalid_export_pagination_metadata"
    );

    pages = [
      exportPage({ records: [{ id: firstId }], count: 2, offset: 0, hasMore: true }),
      exportPage({
        records: [{ id: secondId }, { id: thirdId }],
        count: 3,
        offset: 1,
        hasMore: false,
      }),
    ];
    globalThis.fetch = async () => jsonResponse(pages.shift());
    await expectAsyncCode(listExportRows(client), "export_count_changed");

    pages = [
      exportPage({ records: [{ id: firstId }], count: 2, offset: 0, hasMore: true }),
      exportPage({ records: [{ id: firstId }], count: 2, offset: 1, hasMore: false }),
    ];
    globalThis.fetch = async () => jsonResponse(pages.shift());
    await expectAsyncCode(listExportRows(client), "export_duplicate_id");
  });

  test("manifest原文はtrim後1〜200000 UTF-16 code unitに制限する", () => {
    validateKnowledgeSourceMetrics(textMetrics("原文"), "valid");
    expectSyncCode(
      () => validateKnowledgeSourceMetrics(textMetrics("  \n "), "blank"),
      "invalid_knowledge_source_length"
    );
    expectSyncCode(
      () =>
        validateKnowledgeSourceMetrics(
          textMetrics("あ".repeat(200_001)),
          "too-long"
        ),
      "invalid_knowledge_source_length"
    );
  });

  test("snapshotの予算全体表記をmanifest内部の全体へ正規化する", () => {
    const rows = Array.from({ length: 441 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
      name: `予算質問${index + 1}ですか`,
      diet_session_id: SESSION_ID,
      publication_category: PUBLICATION_CATEGORY,
      publish_status: "published",
      submitted_date: "2026-03-05",
      major_category: index < 12 ? "予算全体" : "教育🏫",
      published_at: "2026-08-17T00:00:00.000Z",
      updated_at: "2026-08-17T00:00:01.000Z",
      knowledge_source: null,
    }));

    const snapshot = sanitizeSnapshotRows(
      rows,
      "2026-08-21T00:00:00.000Z"
    );

    assert.equal(snapshot.record_count, 441);
    assert.deepEqual(
      snapshot.records.slice(0, 12).map((row) => row.major_category),
      Array(12).fill("全体")
    );
    assert.equal(snapshot.records[12].major_category, "教育🏫");
  });

  test("rollout ordinal範囲は10〜25件、最終441終端のみ10件未満を許可する", () => {
    const entries = Array.from({ length: 441 }, (_, index) => ({
      ordinal: index + 1,
    }));
    const canary = entries[0];
    assert.equal(
      selectExecutionEntries(
        entries,
        { apply: true, phase: "canary" },
        canary
      ).length,
      1
    );
    assert.equal(
      selectExecutionEntries(
        entries,
        {
          apply: true,
          phase: "rollout",
          fromOrdinal: 101,
          toOrdinal: 125,
        },
        canary
      ).length,
      25
    );
    assert.deepEqual(
      selectExecutionEntries(
        entries,
        {
          apply: true,
          phase: "rollout",
          fromOrdinal: 438,
          toOrdinal: 441,
        },
        canary
      ).map((entry) => entry.ordinal),
      [438, 439, 440, 441]
    );
    for (const options of [
      { apply: true, phase: "rollout" },
      { apply: true, phase: "rollout", fromOrdinal: 1 },
      {
        apply: true,
        phase: "rollout",
        fromOrdinal: 1,
        toOrdinal: 9,
      },
      {
        apply: true,
        phase: "rollout",
        fromOrdinal: 1,
        toOrdinal: 26,
      },
      {
        apply: true,
        phase: "canary",
        fromOrdinal: 1,
        toOrdinal: 10,
      },
      { apply: false, fromOrdinal: 1, toOrdinal: 10 },
    ]) {
      assert.throws(() => validateExecutionRangeOptions(options), BackfillError);
    }
  });

  test("rolloutは指定範囲だけをPATCHしてfinal GET監査する", async () => {
    const entries = Array.from({ length: 11 }, (_, index) =>
      createEntry(`rollout原文${index + 1}`, index + 1)
    );
    const journalFile = path.join(temporaryDirectory(), "rollout.jsonl");
    const initialSources = new Map([[entries[0].id, "rollout原文1"]]);
    const api = installFakeKnowledgeSourceApiForEntries(
      entries,
      initialSources
    );
    appendJournal(journalFile, {
      event: "canary_verified",
      manifest_sha256: manifestSha256,
      operation: "backfill",
      id: entries[0].id,
    });

    const result = await executeManifest(
      { manifest: { entries }, manifestSha256 },
      executeOptions(entries[0], journalFile, "backfill", "rollout", {
        fromOrdinal: 1,
        toOrdinal: 10,
      })
    );

    const expectedIds = entries.slice(0, 10).map((entry) => entry.id);
    assert.deepEqual(
      api.calls
        .filter((call) => call.method === "PATCH")
        .map((call) => call.id),
      expectedIds
    );
    const expectedIdSet = new Set(expectedIds);
    assert.ok(api.calls.every((call) => expectedIdSet.has(call.id)));
    assert.ok(api.calls.every((call) => call.id !== entries[10].id));
    assert.equal(result.target_count, 10);
    assert.equal(result.final_get_audited, 10);
    assert.deepEqual(result.counts, {
      ready: 0,
      applied: 9,
      already_done: 1,
    });
    assert.ok(
      readJournal(journalFile).some(
        (event) =>
          event.event === "run_completed" &&
          event.from_ordinal === 1 &&
          event.to_ordinal === 10 &&
          event.final_get_audited === 10
      )
    );
  });

  test("CLIもapply rolloutのordinal範囲を必須・二重検証する", () => {
    const cli = path.join(import.meta.dirname, "cli.mjs");
    const run = (args) =>
      spawnSync(process.execPath, [cli, "backfill", ...args], {
        encoding: "utf8",
        env: { ...process.env, ADMIN_API_TOKEN: "" },
      });

    const missingRange = run(["--apply", "--phase", "rollout"]);
    assert.equal(missingRange.status, 1);
    assert.equal(
      JSON.parse(missingRange.stderr).code,
      "rollout_ordinal_range_required"
    );

    const canaryRange = run([
      "--apply",
      "--phase",
      "canary",
      "--from-ordinal",
      "1",
      "--to-ordinal",
      "10",
    ]);
    assert.equal(canaryRange.status, 1);
    assert.equal(JSON.parse(canaryRange.stderr).code, "ordinal_range_not_allowed");

    const acceptedRange = run([
      "--apply",
      "--phase",
      "rollout",
      "--from-ordinal",
      "1",
      "--to-ordinal",
      "10",
    ]);
    assert.equal(acceptedRange.status, 1);
    assert.equal(JSON.parse(acceptedRange.stderr).code, "required_option_missing");
  });

  test("cache warningは同一journalのcanaryとrollout再開を停止する", async () => {
    const sourceText = "cache warning復旧確認用原文";
    const entry = createEntry(sourceText);
    const journalFile = path.join(temporaryDirectory(), "warning.jsonl");
    const api = installFakeKnowledgeSourceApi(entry, null, [
      "cache_revalidation_failed",
    ]);
    const loaded = { manifest: { entries: [entry] }, manifestSha256 };

    await expectAsyncCode(
      executeManifest(
        loaded,
        executeOptions(entry, journalFile, "backfill", "canary")
      ),
      "cache_revalidation_warning"
    );
    const events = readJournal(journalFile);
    assert.ok(
      events.some(
        (event) => event.event === "record_cache_revalidation_failed"
      )
    );
    assert.ok(!events.some((event) => event.event === "canary_verified"));
    const callsAfterWarning = api.calls.length;

    await expectAsyncCode(
      executeManifest(
        loaded,
        executeOptions(entry, journalFile, "backfill", "canary")
      ),
      "journal_cache_revalidation_unresolved"
    );
    await expectAsyncCode(
      executeManifest(
        loaded,
        executeOptions(entry, journalFile, "backfill", "rollout", {
          fromOrdinal: 1,
          toOrdinal: 10,
        })
      ),
      "journal_cache_revalidation_unresolved"
    );
    assert.equal(api.calls.length, callsAfterWarning);

    const replacementJournal = path.join(
      temporaryDirectory(),
      "replacement-warning.jsonl"
    );
    await expectAsyncCode(
      executeManifest(
        loaded,
        executeOptions(
          entry,
          replacementJournal,
          "backfill",
          "canary"
        )
      ),
      "cache_revalidation_warning"
    );
    assert.equal(
      api.calls.filter((call) => call.method === "PATCH").length,
      2
    );
    assert.ok(
      !readJournal(replacementJournal).some(
        (event) => event.event === "canary_verified"
      )
    );

    const recoveredJournal = path.join(
      temporaryDirectory(),
      "recovered-cache.jsonl"
    );
    const recoveredApi = installFakeKnowledgeSourceApi(entry, sourceText);
    const recovered = await executeManifest(
      loaded,
      executeOptions(entry, recoveredJournal, "backfill", "canary")
    );
    assert.equal(recovered.counts.already_done, 1);
    assert.equal(
      recoveredApi.calls.filter((call) => call.method === "PATCH").length,
      1
    );
    assert.ok(
      readJournal(recoveredJournal).some(
        (event) => event.event === "canary_verified"
      )
    );
  });

  test("journal破損と二重lockは安全側で停止する", () => {
    const directory = temporaryDirectory();
    const corruptJournal = path.join(directory, "corrupt.jsonl");
    fs.writeFileSync(corruptJournal, '{"event":"ok"}\n{', "utf8");
    expectSyncCode(() => readJournal(corruptJournal), "journal_corrupt");

    const lockedJournal = path.join(directory, "locked.jsonl");
    const release = acquireLock(lockedJournal);
    try {
      expectSyncCode(() => acquireLock(lockedJournal), "journal_locked");
    } finally {
      release();
    }
    const releaseAgain = acquireLock(lockedJournal);
    releaseAgain();
  });

  test("既に目標値のrecordも同値PATCHでcacheを再検証する", async () => {
    const sourceText = "resume済み原文";
    const entry = createEntry(sourceText);
    const journalFile = path.join(temporaryDirectory(), "resume.jsonl");
    const api = installFakeKnowledgeSourceApi(entry, sourceText);

    const result = await executeManifest(
      { manifest: { entries: [entry] }, manifestSha256 },
      executeOptions(entry, journalFile, "backfill", "canary")
    );

    assert.deepEqual(result.counts, {
      ready: 0,
      applied: 0,
      already_done: 1,
    });
    assert.equal(result.final_get_audited, 1);
    assert.equal(
      api.calls.filter((call) => call.method === "PATCH").length,
      1
    );
    assert.ok(
      readJournal(journalFile).some(
        (event) => event.event === "canary_verified"
      )
    );
  });

  test("rollbackは現在SHA一致時だけnullへ更新しGET監査する", async () => {
    const sourceText = "rollback対象原文";
    const entry = createEntry(sourceText);
    const journalFile = path.join(temporaryDirectory(), "rollback.jsonl");
    const api = installFakeKnowledgeSourceApi(entry, sourceText);

    const result = await executeManifest(
      { manifest: { entries: [entry] }, manifestSha256 },
      executeOptions(entry, journalFile, "rollback", "canary")
    );

    assert.equal(result.counts.applied, 1);
    assert.equal(result.final_get_audited, 1);
    assert.equal(api.state.source, null);
    assert.equal(
      api.calls.filter((call) => call.method === "PATCH").length,
      1
    );
  });

  test("rollback済みのnullも同値PATCHでcacheを再検証する", async () => {
    const entry = createEntry("rollback済み原文");
    const journalFile = path.join(temporaryDirectory(), "rollback-noop.jsonl");
    const api = installFakeKnowledgeSourceApi(entry, null);

    const result = await executeManifest(
      { manifest: { entries: [entry] }, manifestSha256 },
      executeOptions(entry, journalFile, "rollback", "canary")
    );

    assert.equal(result.counts.already_done, 1);
    assert.equal(result.final_get_audited, 1);
    assert.deepEqual(
      api.calls
        .filter((call) => call.method === "PATCH")
        .map((call) => call.allowClear),
      [true]
    );
    assert.ok(
      readJournal(journalFile).some(
        (event) => event.event === "canary_verified"
      )
    );
  });
});
