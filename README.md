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
