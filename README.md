# みらい議会＠世田谷区

本リポジトリは、`team-mirai/mirai-gikai` をもとにした世田谷区議会向けの非公式Fork MVPです。これは政党チームみらいが運営しているものではありません。

初期MVPでは、令和7年第4回区議会定例会から、議案・報告事項・請願/陳情・質問を1件ずつ表示対象にしています。AIチャット、AIインタビュー、意見分析は補助機能として扱います。

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/team-mirai-volunteer/mirai-gikai)
[![codecov](https://codecov.io/gh/team-mirai/mirai-gikai/branch/develop/graph/badge.svg)](https://codecov.io/gh/team-mirai/mirai-gikai)

## セットアップ

```bash
# Supabaseの起動
npx supabase start

# 環境変数の設定（必要に応じて.envの内容を変更してください）
cp .env.example .env

# パッケージインストール
pnpm install

# SupabaseのDB初期化, 開発用シードデータのセットアップ
pnpm db:reset

# サーバー起動
pnpm dev
```

## 世田谷区議会MVP用CSV

現在の4件サンプルからseed用CSVを再生成する場合は、Vault直下の `tools/mirai-gikai-setagaya` で以下を実行します。

```bash
pnpm --filter @mirai-gikai/seed generate:setagaya-csv
```

生成先は `packages/seed/csv/data/` です。CSVをSupabaseへ投入するには、`.env` に `SUPABASE_URL` と `SUPABASE_SECRET_KEY` を設定し、ローカルSupabaseを起動したうえで以下を実行します。

```bash
pnpm seed:csv
```

## 触れる予算データセット

令和8年度当初予算の公開用7ファイルは、Next.jsの `public` 配下やGit管理下へ置かず、ローカルの入力ディレクトリから検証・投入します。入力ディレクトリは `packages/seed/budget/data/` を使うこともできますが、このパスは `.gitignore` 対象です。

まずmanifestを正本として、ファイル名・件数・金額・参照整合性・SHA-256を検証します。

```bash
pnpm budget:web:validate -- --input-dir /path/to/budget-data
```

投入CLIは引数を省略するとdry-runになり、Supabaseへ書き込みません。

```bash
# dry-run（デフォルト）
pnpm budget:web:import -- --input-dir /path/to/budget-data

# ローカルSupabaseへ投入し、検証後にactiveへ切り替える
pnpm budget:web:import -- --input-dir /path/to/budget-data --apply
```

`--apply` は `SUPABASE_URL` がlocalhostの場合だけ許可されます。リモートの検証環境を使う場合は `BUDGET_IMPORT_ENVIRONMENT=validation` を明示してください。`production` はCLIで拒否されます。書き込みには `.env` の `SUPABASE_SECRET_KEY` を使用し、ブラウザや生成物へ含めません。

公開用7ファイルは非公開Storage bucket `budget-datasets` の `2026/initial/{manifest_sha256}/` に版管理用として保存されます。DBにはまず `staging` として一括投入し、件数・金額・外部キー検証がすべて通った場合だけ、同年度・同予算種別の旧版を `archived` にして新しい版を `active` に切り替えます。一般ユーザーがSELECTできるのは `active` の公開情報だけです。

### 人間レビュー済み課題関係の登録

10大分類のtopic定義は `data/budget/editorial/topic-definitions/` に置きます。
公開用7ファイルの公式項目だけから、人間レビュー用の候補CSVを生成できます。

```bash
pnpm budget:web:topics:candidates -- --input-dir /path/to/budget-data
```

候補生成は `review_decision` が入った既存CSVを上書きしません。新規候補の
`review_decision` と `review_note` は空欄です。候補生成では
`A_official_direct` を使わず、公式階層・事業名・部署から強く読める
`B_strong_structural` と、編集判断を要する `C_editorial` を区別します。
C候補を含め、候補は自動公開されません。

人間が全行を `approve`、`revise`、`reject` のいずれかで確認したCSVだけを
公開できます。`approve` または `revise` の行だけを公開関係として登録し、
`reject` は除外します。空欄が1件でも残るファイルは `--apply` を拒否します。

```bash
# dry-run（デフォルト）
pnpm budget:web:topics:publish -- \
  --input-file data/budget/editorial/review/education-school-aging-candidates.csv

# ローカルSupabaseのactive予算版へ登録
pnpm budget:web:topics:publish -- \
  --input-file data/budget/editorial/review/education-school-aging-candidates.csv \
  --reviewed-by <Supabase Auth user UUID> \
  --reviewed-at 2026-07-30T16:33:02+09:00 \
  --apply
```

`--apply` は予算データ投入CLIと同じ接続先制限を使い、本番環境を拒否します。
登録先は編集データの `budget_topics`、`budget_topic_categories`、
`budget_topic_programs` だけです。公式予算テーブルは更新しません。同じCSVを
再実行しても関係は重複せず、却下済みの候補は公開関係として残りません。
空欄は未判断であり、既存公開関係を削除する根拠にも使いません。

active dataset、review CSV、実際の公開関係を突合した管理レポートは次で
再生成します。大分類別・topic別の候補、B/C、review待ち、公開済み、未分類
identityを確認できます。

```bash
pnpm budget:web:topics:report -- --input-dir /path/to/budget-data
```

出力は `docs/budget/topic-workflow-report.md` です。未分類はエラーではなく、
検索・公式分類・全予算一覧から引き続き閲覧できます。

### 予算データセット改訂時の課題関係リリース

`budget_topic_programs` は `dataset_id` ごとの編集データです。新しいmanifestを
取り込んでactive datasetを切り替えても、旧datasetでレビュー済みの関係は新しい
`dataset_id` へ自動継承されません。データセット改訂のたびに、次の順で再登録して
ください。

1. `pnpm budget:web:import -- --input-dir /path/to/budget-data` で新データをdry-run検証する。
2. `--apply` 後、active datasetのID、件数、金額、validation結果を確認する。
3. `pnpm budget:web:topics:candidates` を実行する。レビュー済みCSVが保護されたこと、新規候補が空欄で出力されたことを確認する。
4. レビュー済み候補CSVに記録された `budget_program_identity_id` が新datasetにも存在し、事業名・金額・公式階層に意図しない変更がないことを確認する。
5. 公開済みtopicの各review CSVについて `pnpm budget:web:topics:publish` をまずdry-runし、approve / revise / reject / pending件数を確認する。pendingがあるtopicは公開しない。
6. 元のレビュー担当者・レビュー日時を明示して、全行レビュー済みのtopicだけを `--apply` する。
7. `pnpm budget:web:topics:report` を実行し、active datasetのmanifest、公開済み件数、未分類件数を確認する。公開APIとグラフにはpublished関係だけが出ることを確認する。

identity IDや根拠項目が変わった場合は、旧関係を推測でコピーせず候補CSVを再生成し、
人間の再レビューへ戻してください。手順3〜7が終わるまで、新datasetでは課題に紐づく
事業が一時的に空になることがあります。

## マイグレーション

```bash
# マイグレーションファイル生成
npx supabase migration new マイグレーション名

# マイグレーション実行 & 型ファイル更新
pnpm db:migrate
```

## Adminユーザーの作成

1. Supabase Studio上で Authentication > Add User からユーザーを作成
2. Supabase Studio上で以下のSQLを実行

```sql
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"roles": ["admin"]}'::jsonb
WHERE email = '<1で作成したユーザーのemail>';
```

> [!NOTE]
> 開発環境では、seedデータによって、`email: admin@example.com, password: admin123456` のAdminユーザーが作成されます。

## Fork して独自サービスを運営する場合

本リポジトリを fork して独自にサービスを運営する場合は、[Fork ガイドライン](./FORK_GUIDELINES.md) を確認してください。本家サービスとの混同防止のため、ロゴ・カラー・サービス名称などの変更が必要です。
