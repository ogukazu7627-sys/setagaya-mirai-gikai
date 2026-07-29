# Phase 2 本番マージ影響

## 対象

- PR: [#142](https://github.com/ogukazu7627-sys/setagaya-mirai-gikai/pull/142)
- base: `main`
- head: `agent/touchable-budget-phase-2`
- 監査対象head: `8716238d4565c2576ea70d002436d6d110d412f8`

この文書はPRを`main`へマージした場合の自動処理と、停止・復旧方法を
整理したものである。本番migration、データ投入、deployは実施していない。

## mainへのpushで動く処理

| Workflow | 主な処理 | PR #142による影響 |
| --- | --- | --- |
| `Code Check` | lint、型検査、build、unit test | 実行される |
| `Integration Tests` | ローカルSupabase起動、migration、実DB統合テスト | 実行される |
| `Migrate DB then Deploy` | Supabase差分検知、`db push`、config push、Vercel hook | 実行される |
| `Deploy Topic Analysis Worker` | worker image build、Cloud Run Job更新 | `packages/supabase/**`変更のため実行対象 |

`Migrate DB then Deploy`は`supabase/**`の変更を検知すると、
production environmentのSecretで次を順に実行する。

1. Supabase Auth URLの検証
2. 本番Supabase projectへのlink
3. `supabase db push --include-all --yes`
4. 本番用`supabase/config.toml`のrenderとconfig push
5. WebのVercel Deploy Hook
6. 設定済みの場合はAdminのVercel Deploy Hook

`--include-all`のため、PR #142のmigrationだけでなく、その時点で本番に
未適用のmigrationがほかにあれば同時に適用対象になる。

## 適用される予算migration

`supabase/migrations/20260730100000_create_public_budget_dataset_schema.sql`
は次を作成する。

- `pg_trgm` extension（未導入の場合）
- 予算dataset管理テーブル1件
- 公開予算データの子テーブル9件
- index、外部キー、check制約、RLS policy
- `import_budget_dataset(jsonb)`
- `validate_budget_dataset(uuid)`
- `activate_budget_dataset(uuid)`
- 非公開Storage bucket `budget-datasets`

既存の業務テーブルに対する`DROP`、`TRUNCATE`、破壊的`ALTER`はない。
同名bucketが既に存在する場合は`public = false`へ固定する。

## 自動投入の有無

予算データは自動投入されない。workflowから
`pnpm budget:web:import`は呼ばれず、migration後の各予算テーブルは空である。
投入はservice roleを持つローカルCLIまたは明示された検証環境だけで行う。

## Vercelとworkerへの影響

- DB migrationとconfig pushが成功するとWebのVercel deployが起動する。
- Admin hookが設定済みならAdmin deployも起動する。
- Supabase生成型の変更により、Cloud RunのTopic Analysis Workerも
  production imageへの更新対象になる。
- 予算データの自動投入は、Vercelとworkerのどちらからも行われない。

## 停止と復旧

### migration適用前

- production environment approvalを承認しない。
- GitHub Actions jobをcancelする。
- Auth URL検証またはSupabase linkが失敗すれば`db push`へ進まない。

### migration適用後

- Git revertだけではDB schemaは戻らない。
- 必要なら、レビュー済みのforward migrationで新規objectを無効化または削除する。
- データ投入後の重大障害では、Supabaseのbackup復元手順を選択肢に含める。
- Vercelは直前の正常deploymentへrollbackまたはredeployする。
- Cloud Run Jobは直前の正常image digestへ戻す。

DB migration成功後にVercel hookだけ失敗した場合、DB schemaは適用済みのまま
残る。再実行時はmigrationの適用履歴を確認してからdeployを再開する。

## 現時点の判断

migration自体に既存テーブルへの破壊的変更はない。一方、実データ全量を
CLIからPostgREST経由で送信する非本番試験が未完了のため、Phase 2.1監査が
完了するまではPR #142を本番マージしない。
