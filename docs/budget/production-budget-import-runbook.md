# 令和8年度当初予算 本番投入runbook

## 対象

- fiscal year: 2026
- budget type: `initial_budget`
- schema: `public-budget-v1`
- data commit: `09c98759c657bd2b1f37b4a991724a76665c26f7`
- manifest SHA-256: `dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7`
- RPC payload: `6,627,790 bytes`
- Storage input: 7 files / `7,637,486 bytes`

本番投入は `.github/workflows/import_budget_dataset_production.yml` の
`workflow_dispatch` だけで行う。通常のローカルCLI、push、pull request、deployでは
本番投入しない。

## 実行順

1. `operation=dry-run` と `VALIDATE_2026_INITIAL_BUDGET` で手動実行する。
2. manifest、6ファイルのhash、件数、金額、参照、payload sizeがPASSしたことを確認する。
3. `operation=apply` と `IMPORT_2026_INITIAL_BUDGET` で手動実行する。
4. 1回目の結果が `alreadyImported=false`、DB validationが`PASS`であることを確認する。
5. read-only検証で件数、歳入歳出合計、外部キー、非公開Storage 7ファイルのhashを確認する。
6. workflow内の2回目実行が `alreadyImported=true`、Storage uploadedが0、reusedが7であることを確認する。
7. active datasetが1件であることを確認してから、レビュー済み課題関係を別workflowで公開する。

## 期待件数

| table | rows |
| --- | ---: |
| `budget_datasets` | 1 |
| `budget_program_identities` | 1,156 |
| `budget_programs` | 1,170 |
| `budget_items` | 190 |
| `budget_item_sections` | 994 |
| `budget_revenue_items` | 175 |
| `budget_revenue_sections` | 650 |
| `budget_revenue_details` | 2,192 |
| `budget_revenue_allocations` | 1,948 |
| `budget_source_documents` | 10 |

歳入・歳出はいずれも `621,033,664` 千円。allocationの金額非nullは0件、
exact groupは1,909件、public identityは39件とする。

## 失敗時

- RPC呼び出しには10分の外部timeoutを設ける。
- timeout、接続切断、応答不明のときは、その実行内でも手動でも直ちに再試行しない。
- workflowのread-only検証でmanifest hash、dataset status、各テーブル件数、Storageを確認する。
- DB投入後の失敗ではdatasetとStorageを保持する。既存サイトや既存業務テーブルを削除しない。
- active化前ならstagingのまま保持する。active化済みなら応答喪失の可能性を前提に状態を確認する。
- 状態確認後にだけ、同一manifestの冪等再実行可否を判断する。

## 秘密情報

service role keyとanon keyはGitHub production environmentから実行時に解決し、
即時maskする。入力、ログ、生成文書、PR本文へ記録しない。
