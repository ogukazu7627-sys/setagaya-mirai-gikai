#!/usr/bin/env node

import path from "node:path";
import {
  DEFAULT_BASE_URL,
  DEFAULT_BATCH_SIZE,
  DEFAULT_ENDPOINT,
  DEFAULT_EXPORT_ENDPOINT,
  DEFAULT_TIMEOUT_MS,
  DEFAULT_VAULT_ROOT,
} from "./constants.mjs";
import {
  buildManifest,
  loadAndValidateManifest,
  sanitizeSnapshotRows,
} from "./manifest.mjs";
import {
  auditManifest,
  collectAdminSnapshot,
  executeManifest,
  validateExecutionRangeOptions,
} from "./runner.mjs";
import {
  acquireLock,
  invariant,
  safeError,
  writeJsonExclusive,
} from "./shared.mjs";

const HELP = `
令和8年予算特別委員会441件 knowledge_source backfill

usage:
  node scripts/budget-knowledge-source-backfill/cli.mjs snapshot \\
    --output <admin-snapshot.json>

  node scripts/budget-knowledge-source-backfill/cli.mjs manifest \\
    --admin-snapshot <admin-snapshot.json> --output <manifest.json>

  node scripts/budget-knowledge-source-backfill/cli.mjs backfill \\
    --manifest <manifest.json> [--journal <journal.jsonl>]

  node scripts/budget-knowledge-source-backfill/cli.mjs backfill \\
    --manifest <manifest.json> --journal <journal.jsonl> --apply \\
    --phase canary --manifest-sha256 <sha256>

  node scripts/budget-knowledge-source-backfill/cli.mjs backfill \\
    --manifest <manifest.json> --journal <journal.jsonl> --apply \\
    --phase rollout --from-ordinal <N> --to-ordinal <M> \\
    --manifest-sha256 <sha256>

  node scripts/budget-knowledge-source-backfill/cli.mjs rollback \\
    --manifest <manifest.json> --journal <journal.jsonl> --apply \\
    --phase canary --manifest-sha256 <sha256>

  node scripts/budget-knowledge-source-backfill/cli.mjs rollback \\
    --manifest <manifest.json> --journal <journal.jsonl> --apply \\
    --phase rollout --from-ordinal <N> --to-ordinal <M> \\
    --manifest-sha256 <sha256>

  node scripts/budget-knowledge-source-backfill/cli.mjs audit \\
    --manifest <manifest.json> --expect target|null

安全上の既定:
  - backfill / rollbackは--applyなしならGETだけのdry-runです。
  - --applyには実manifestのSHA-256とcanary/rollout phaseが必須です。
  - tokenはADMIN_API_TOKEN環境変数からだけ読み、引数やファイルから読みません。
  - batch sizeは10〜25、既定25です。

共通network options:
  --base-url <url>        既定 ${DEFAULT_BASE_URL}
  --endpoint <path>       既定 ${DEFAULT_ENDPOINT}
  --batch-size <10..25>   既定 ${DEFAULT_BATCH_SIZE}
  --timeout-ms <ms>       既定 ${DEFAULT_TIMEOUT_MS}
`;

const VALUE_OPTIONS = new Set([
  "admin-snapshot",
  "base-url",
  "batch-size",
  "canary-id",
  "endpoint",
  "expect",
  "export-endpoint",
  "from-ordinal",
  "journal",
  "manifest",
  "manifest-sha256",
  "output",
  "payload-dir",
  "phase",
  "timeout-ms",
  "to-ordinal",
  "vault-root",
]);
const FLAG_OPTIONS = new Set(["apply", "help", "overwrite"]);

function parseArgs(argv) {
  const [command, ...rest] = argv;
  if (!command || command === "--help" || command === "-h") {
    return { command: "help", options: {} };
  }
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    invariant(
      argument.startsWith("--"),
      "invalid_argument",
      `不明な引数です: ${argument}`
    );
    const equalsIndex = argument.indexOf("=");
    const key = argument.slice(2, equalsIndex === -1 ? undefined : equalsIndex);
    invariant(
      VALUE_OPTIONS.has(key) || FLAG_OPTIONS.has(key),
      "unknown_option",
      `不明なoptionです: --${key}`
    );
    invariant(
      !Object.hasOwn(options, key),
      "duplicate_option",
      `optionが重複しています: --${key}`
    );
    if (FLAG_OPTIONS.has(key)) {
      invariant(
        equalsIndex === -1,
        "flag_has_value",
        `flagへ値は付けられません: --${key}`
      );
      options[key] = true;
      continue;
    }
    let value;
    if (equalsIndex !== -1) {
      value = argument.slice(equalsIndex + 1);
    } else {
      index += 1;
      value = rest[index];
    }
    invariant(
      typeof value === "string" && value.length > 0 && !value.startsWith("--"),
      "option_value_missing",
      `optionの値がありません: --${key}`
    );
    options[key] = value;
  }
  return { command, options };
}

function rejectUnknownForCommand(options, allowed) {
  const unknown = Object.keys(options).filter((key) => !allowed.includes(key));
  invariant(
    unknown.length === 0,
    "option_not_allowed",
    `このcommandでは使えないoptionです: ${unknown.map((key) => `--${key}`).join(", ")}`
  );
}

function required(options, key) {
  const value = options[key];
  invariant(
    typeof value === "string" && value.length > 0,
    "required_option_missing",
    `--${key}が必要です`
  );
  return value;
}

function positiveInteger(value, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  invariant(
    Number.isInteger(parsed),
    "invalid_integer",
    `整数ではありません: ${value}`
  );
  return parsed;
}

function networkOptions(options) {
  return {
    baseUrl: options["base-url"] ?? DEFAULT_BASE_URL,
    endpoint: options.endpoint ?? DEFAULT_ENDPOINT,
    exportEndpoint: options["export-endpoint"] ?? DEFAULT_EXPORT_ENDPOINT,
    batchSize: positiveInteger(options["batch-size"], DEFAULT_BATCH_SIZE),
    timeoutMs: positiveInteger(options["timeout-ms"], DEFAULT_TIMEOUT_MS),
  };
}

function progress(event) {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}

async function snapshotCommand(options) {
  rejectUnknownForCommand(options, [
    "output",
    "overwrite",
    "base-url",
    "endpoint",
    "export-endpoint",
    "batch-size",
    "timeout-ms",
  ]);
  const output = path.resolve(required(options, "output"));
  const records = await collectAdminSnapshot(networkOptions(options), progress);
  const snapshot = sanitizeSnapshotRows(records);
  const outputSha256 = writeJsonExclusive(output, snapshot, options.overwrite);
  progress({
    event: "snapshot_written",
    output,
    sha256: outputSha256,
    records: snapshot.record_count,
    contains_knowledge_source_body: false,
  });
}

function manifestCommand(options) {
  rejectUnknownForCommand(options, [
    "admin-snapshot",
    "output",
    "overwrite",
    "payload-dir",
    "vault-root",
  ]);
  const output = path.resolve(required(options, "output"));
  const manifest = buildManifest({
    snapshotFile: required(options, "admin-snapshot"),
    payloadDirectory: path.resolve(options["payload-dir"] ?? "/tmp"),
    vaultRoot: path.resolve(options["vault-root"] ?? DEFAULT_VAULT_ROOT),
  });
  const outputSha256 = writeJsonExclusive(output, manifest, options.overwrite);
  progress({
    event: "manifest_written",
    output,
    sha256: outputSha256,
    targets: manifest.target_count,
    payload_files: manifest.payload_file_count,
    payload_entries: manifest.payload_entry_count,
    contains_source_body: false,
  });
}

async function executeCommand(command, options) {
  rejectUnknownForCommand(options, [
    "manifest",
    "journal",
    "apply",
    "phase",
    "manifest-sha256",
    "canary-id",
    "base-url",
    "endpoint",
    "batch-size",
    "from-ordinal",
    "timeout-ms",
    "to-ordinal",
  ]);
  const rangeOptions = {
    fromOrdinal: positiveInteger(options["from-ordinal"], undefined),
    toOrdinal: positiveInteger(options["to-ordinal"], undefined),
  };
  validateExecutionRangeOptions({
    apply: options.apply === true,
    phase: options.phase,
    ...rangeOptions,
  });
  const manifestFile = path.resolve(required(options, "manifest"));
  const loaded = loadAndValidateManifest(manifestFile);
  const journalFile = path.resolve(
    options.journal ?? `${manifestFile}.journal.jsonl`
  );
  const releaseLock = acquireLock(journalFile);
  try {
    const result = await executeManifest(
      { manifest: loaded.manifest, manifestSha256: loaded.sha256 },
      {
        ...networkOptions(options),
        operation: command,
        apply: options.apply === true,
        phase: options.phase,
        confirmedManifestSha256: options["manifest-sha256"],
        canaryId: options["canary-id"],
        ...rangeOptions,
        journalFile,
      },
      progress
    );
    progress({
      event: "command_completed",
      manifest_sha256: loaded.sha256,
      journal: journalFile,
      ...result,
    });
  } finally {
    releaseLock();
  }
}

async function auditCommand(options) {
  rejectUnknownForCommand(options, [
    "manifest",
    "expect",
    "base-url",
    "endpoint",
    "batch-size",
    "timeout-ms",
  ]);
  const loaded = loadAndValidateManifest(required(options, "manifest"));
  const expectedState = required(options, "expect");
  const verified = await auditManifest(
    { manifest: loaded.manifest },
    { ...networkOptions(options), expectedState },
    progress
  );
  progress({
    event: "audit_completed",
    manifest_sha256: loaded.sha256,
    expected_state: expectedState,
    verified,
  });
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command === "help" || options.help) {
    process.stdout.write(HELP);
    return;
  }
  if (command === "snapshot") return snapshotCommand(options);
  if (command === "manifest") return manifestCommand(options);
  if (command === "backfill" || command === "rollback") {
    return executeCommand(command, options);
  }
  if (command === "audit") return auditCommand(options);
  invariant(false, "unknown_command", `不明なcommandです: ${command}`);
}

main().catch((error) => {
  process.stderr.write(
    `${JSON.stringify({ event: "command_failed", ...safeError(error) })}\n`
  );
  process.exitCode = 1;
});
