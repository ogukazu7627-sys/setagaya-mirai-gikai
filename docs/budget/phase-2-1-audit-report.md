# Phase 2.1 本番マージ前セキュリティ・運用監査

## 結論

- 監査日: 2026-07-30
- 対象PR: [#142](https://github.com/ogukazu7627-sys/setagaya-mirai-gikai/pull/142)
- base: `main`
- 監査済みhead: `7150711e039dd7dcb2c353e62468187244e0f3d5`
- 総合判定: **既知リスクを受容し、基盤のみ本番マージ可**

全量の公開予算データから作る6,627,790 bytesのJSON payloadを、
非本番SupabaseのPostgREST経由で最後まで投入する試験だけが未完了である。
小規模fixtureでは本番同等の通信経路がPASSしているが、全量RPCの処理時間と
hosted環境のtimeout余裕は実測できていない。

2026-07-30、データオーナーはこの残余リスクを理解した上で、専用Hosted
Supabase試験を省略し、PRのマージと本番データ投入を分離する方針を承認した。
この承認は基盤migrationとVercel deployだけを対象とし、予算データの本番
投入・active化は含まない。本番初回投入は別途明示的な許可を受けて実施し、
全量RPCの性能試験を兼ねる。

## 項目別判定

| 項目 | 判定 | 根拠 |
| --- | --- | --- |
| 1. データセットのバージョン共存 | PASS | 全9子テーブルで同じ外部IDを持つv1/v2が共存し、dataset単位でactiveを切り替える実DBテストがPASS |
| 2. RPC権限 | PASS | 3 RPCともPUBLIC/anon/authenticatedから実行不可、service_roleのみEXECUTE可。実DBRLSテストがPASS |
| 3. activationの排他制御 | PASS | transaction advisory lockと部分unique indexで保証し、並行activation実DBテストがPASS |
| 4. 実際の通信経路と全量payload | RISK_ACCEPTED | 小規模fixtureのCLIからPostgREST/RPCはPASS。実データ全量のremote applyは未実施で、本番初回投入時に計測する |
| 5. bigintの型契約 | PASS | DBはBIGINT、境界ではsafe integer検証、BigInt直接JSON化禁止を文書・テスト化 |
| 6. Storage | PASS | private bucket、anon/authenticated全操作拒否、冪等パス、保持・cleanup規則を実DBテスト |
| 7. 本番マージ影響 | PASS | workflow、migration、deploy、停止・復旧方法を静的確認して文書化 |
| 8. ローカルSupabase | PASS | 当端末はNOT_TESTED。代替としてGitHub Actionsの実Supabaseコンテナでmigration/RLS/RPC/importを検証 |

## セキュリティ監査

Codex Securityの差分監査では、Phase 2実装に報告対象の脆弱性は0件だった。
監査中に見つけた次の運用上の問題はPR内で限定修正した。

1. 検証後に入力ファイルを再読込するTOCTOUを廃止し、同じBuffer snapshotを
   hash、parse、Storage uploadへ使用する。
2. manifest 1 MiB、各データファイル32 MiB、全体64 MiB、同名候補20件の
   入力上限を追加する。
3. import RPCの結果が通信上不明な場合、Storageを削除せずhash単位で保持する。
4. activation失敗時、投入済みstaging datasetとStorageを削除せず、
   再試行・調査用に保持する。
5. GitHub ActionsでローカルSupabaseの管理キーを`::add-mask::`へ登録してから
   `GITHUB_ENV`へ渡す。最新CIログの管理キー環境表示11箇所は全てmask済み。

`SECURITY DEFINER`関数は全て`SET search_path = ''`を指定し、テーブルと関数を
schema修飾している。dynamic SQLは使用していない。

## バージョン共存

子テーブルの主キーは全てdatasetスコープである。

| テーブル | 主キー |
| --- | --- |
| `budget_items` | `(dataset_id, budget_item_key)` |
| `budget_program_identities` | `(dataset_id, budget_program_identity_id)` |
| `budget_programs` | `(dataset_id, program_id)` |
| `budget_item_sections` | `(dataset_id, section_id)` |
| `budget_revenue_items` | `(dataset_id, revenue_item_key)` |
| `budget_revenue_sections` | `(dataset_id, revenue_section_id)` |
| `budget_revenue_details` | `(dataset_id, revenue_detail_id)` |
| `budget_revenue_allocations` | `(dataset_id, allocation_link_id)` |
| `budget_source_documents` | `(dataset_id, source_type, source_file)` |

子テーブル間の外部キーも全て`dataset_id`を含む。`budget_datasets`は
`manifest_sha256`を一意とし、異なるhashの改訂版を許可する。

実DBテストでは、v1をactive化後、同じ外部IDを持つv2をstaging投入し、
全9子テーブルでv1/v2が同時に存在することを確認した。v2のactive化後は
v2のみactive、v1のみarchivedとなり、dataset間の行混線はなかった。

## RPC権限一覧

| 対象 | PUBLIC | anon | authenticated | service_role |
| --- | --- | --- | --- | --- |
| 予算10テーブル | なし | SELECTのみ | SELECTのみ | SELECT/INSERT/UPDATE/DELETE |
| `import_budget_dataset(jsonb)` | なし | なし | なし | EXECUTE |
| `validate_budget_dataset(uuid)` | なし | なし | なし | EXECUTE |
| `activate_budget_dataset(uuid)` | なし | なし | なし | EXECUTE |

テーブルのanon/authenticated向けSELECTはRLSによりactive datasetだけに限定する。
関数ownerなどPostgreSQLの所有者権限は通常どおり残る。実DBテストでは
anon/authenticatedから3 RPC全てが拒否され、service_roleから実行できた。

## activationの排他制御

- `(fiscal_year, budget_type) WHERE status = 'active'`の部分unique indexを持つ。
- importとactivateは同じ`fiscal_year:budget_type`由来の
  `pg_advisory_xact_lock`を取得する。
- activateは対象datasetを`FOR UPDATE`で取得し、同一transaction内で旧activeを
  archived、新datasetをactiveへ更新する。
- 2 datasetの並行activationテスト後もactiveは常に1件だった。

## 通信経路とpayload

実データ7ファイルをローカルで読み、manifest hash、スキーマ、件数、参照を
検証した結果はPASSだった。

| 計測項目 | 実測値 |
| --- | ---: |
| JSON payload | 6,627,790 bytes |
| Storageへ保存する7ファイル合計 | 7,637,486 bytes |
| 読込・検証・payload構築 | 126.011 ms |
| validator CLI全体 | 1,169.451 ms |
| RSS増分 | 120,979,456 bytes |
| heap使用量増分 | 67,364,560 bytes |

payload内の件数はidentity 1,156、program 1,170、budget item 190、
item section 994、revenue item 175、revenue section 650、
revenue detail 2,192、allocation 1,948、source document 10である。

GitHub Actionsでは
`CLI -> Supabase client -> PostgREST -> import_budget_dataset RPC`
を小規模fixtureで実行し、969 msでPASSした。Supabase実DB統合テスト全体は
211件、35.12秒だった。

CLIのHTTP要求に明示的なAbortSignal timeoutはなく、関数にも個別の
`statement_timeout`は設定していない。hosted SupabaseのData APIとDB roleの
timeout設定に依存する。公式資料:
[Postgres timeouts](https://supabase.com/docs/guides/database/postgres/timeouts)

全量6.6 MBのRPC処理時間とCLI apply全体時間は**NOT_TESTED**である。
現在のメモリ使用量は通常のローカルCLIでは許容範囲だが、JSON全体を1 RPCで
parse・insert・validateするため、hosted環境のtimeoutが最大の懸念となる。

データオーナーのリスク受容により、専用validation Supabaseでの全量試験は
省略する。本番初回投入はPRマージとは分離し、別途明示的な許可を得た後に
dry-run、全量`--apply`、投入後検証、同一manifest再実行の順で行う。
RPC時間、CLI全体時間、timeout余裕はその際に計測する。

本番`--apply`がtimeoutまたは通信結果不明になった場合は直ちに再実行せず、
manifest hash、dataset status、子テーブル件数、Storage objectを先に照合する。
代替案は直接DB transaction/COPY、またはchunked stagingと最終
validate/activate RPCであり、この監査では大規模改修していない。

## bigint

詳細は[bigint-contract.md](./bigint-contract.md)に記録した。現行データは
JavaScript安全整数範囲内であり、Zodで整数かつsafe integerを要求する。
安全範囲外のnumberは拒否し、JavaScript `BigInt`を直接
`JSON.stringify`しないことを単体テストで固定した。

## Storage

- bucket `budget-datasets`は`public = false`。
- bucket向けStorage policyは作らず、anon/authenticatedは
  list/download/upload/update/deleteを全て拒否する。
- service_roleだけがupload/download/update/deleteできる。
- 保存先は`2026/initial/{manifest_sha256}/{logical_file_name}`で決定的。
- 予算種別は`initial_budget`だけを許可し、ファイル名は固定論理名を使用する。
- upload途中またはtransaction rollbackが確定したimport失敗では、
  その実行で新規作成したStorage objectだけを削除する。
- import結果が不明な場合はobjectを保持し、同一hash再実行で照合する。
- import完了後のvalidation/activation失敗ではstaging datasetとobjectを保持する。
- active化後の応答喪失でもactive datasetとobjectを保持する。

private属性、anon/authenticatedの全操作拒否、service role操作、冪等保存、
既知rollback時のcleanup、通信結果不明時の保持、activation失敗後の保持と
再試行は、GitHub Actionsの実SupabaseコンテナでPASSした。

## 本番マージ影響

詳細は[phase-2-production-impact.md](./phase-2-production-impact.md)に記録した。
`main`へのpushではCode Check、Integration Tests、Pinact Check、
Migrate DB then Deploy、変更パスによりDeploy Topic Analysis Workerが動く。

予算migrationは新規10テーブル、3 RPC、index、RLS、private bucketを作る。
既存テーブルへの`DROP`、`TRUNCATE`、破壊的`ALTER`はない。予算データは
workflowから自動投入されない。

`Migrate DB then Deploy`は`supabase/**`変更を検知するとproduction環境の
`supabase db push --include-all --yes`を実行し、成功後にVercel deploy hookを
呼ぶ。未適用migrationがほかにあれば同時適用対象になる。migration適用前は
environment approval未承認またはjob cancelで停止できる。適用後はgit revert
だけではDBを戻せないため、review済みforward migrationまたはbackup復元が必要。

## ローカル・CI検証

当端末ではDocker daemonを利用できず、ローカルSupabaseは**NOT_TESTED**だった。
環境設定の変更は行っていない。

代わりに[Integration Tests run 30500957910](https://github.com/ogukazu7627-sys/setagaya-mirai-gikai/actions/runs/30500957910)で
Supabase CLI 2.105.0が実コンテナを起動し、migration、RLS、RPC、Storage、
CLI importをmockではなく実DBで検証した。結果は211 tests PASSである。
[Code Check run 30500957849](https://github.com/ogukazu7627-sys/setagaya-mirai-gikai/actions/runs/30500957849)と
[Pinact Check run 30500957833](https://github.com/ogukazu7627-sys/setagaya-mirai-gikai/actions/runs/30500957833)もPASSした。

## 未解決事項とマージ判定

未解決は、全量payloadをHosted Supabaseへ送ったときのRPC処理時間、
CLI全体時間、timeout余裕の実測だけである。この残余リスクはデータオーナーが
受容した。

重要監査項目にFAILはなく、最新CIが成功し、未解決レビューがないことを
再確認できた場合、**PR #142は基盤のみ本番マージ可**とする。マージ後は
migration、RLS、RPC権限、private Storage、既存ページ、Vercel deployを確認し、
予算データを投入せず一度停止する。本番データ投入とPhase 3には、別途明示的な
許可なしに進まない。
