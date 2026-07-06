# みらい議会＠世田谷区

本リポジトリは、`team-mirai/mirai-gikai` をもとにした世田谷区議会向けの非公式Fork MVPです。これは政党チームみらいが運営しているものではありません。

初期MVPでは、令和8年第2回区議会定例会の議案カード10件を表示対象にし、AIチャット、AIインタビュー、意見分析、Admin編集画面は動作保証対象から外しています。

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

Obsidian側の議案カードからseed用CSVを再生成する場合は、Vault直下の `tools/mirai-gikai-setagaya` で以下を実行します。

```bash
pnpm --filter @mirai-gikai/seed generate:setagaya-csv
```

生成先は `packages/seed/csv/data/` です。CSVをSupabaseへ投入するには、`.env` に `SUPABASE_URL` と `SUPABASE_SECRET_KEY` を設定し、ローカルSupabaseを起動したうえで以下を実行します。

```bash
pnpm seed:csv
```

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
