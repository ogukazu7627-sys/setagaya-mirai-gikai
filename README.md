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

本番への投入は通常のローカルCLIから実行できません。`main` の手動workflow
`Import Production Budget Dataset` だけが、GitHubの `production` environmentと
完全一致する確認文を使って実行できます。令和8年度当初予算の入力は生成基盤の
commit `09c98759c657bd2b1f37b4a991724a76665c26f7`、manifest SHA-256
`dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7`
へ固定されています。

```bash
# 書き込みなしの本番投入前dry-run
gh workflow run import_budget_dataset_production.yml \
  --ref main \
  -f operation=dry-run \
  -f confirmation=VALIDATE_2026_INITIAL_BUDGET

# dry-run確認後だけ実行する全量投入
gh workflow run import_budget_dataset_production.yml \
  --ref main \
  -f operation=apply \
  -f confirmation=IMPORT_2026_INITIAL_BUDGET
```

applyはローカル検証を再実行してから、Storage保存、staging投入、DB検証、active化、
全件数・金額・外部キー・Storage hashを検証します。その後、同じmanifestをもう一度
実行してdatasetとStorageが増えないことを確認します。RPCには10分の外部timeoutを
設け、失敗または通信結果不明時は再実行せずread-onlyの状態確認だけを行います。
詳細は `docs/budget/production-budget-import-runbook.md` を参照してください。

公開用7ファイルは非公開Storage bucket `budget-datasets` の `2026/initial/{manifest_sha256}/` に版管理用として保存されます。DBにはまず `staging` として一括投入し、件数・金額・外部キー検証がすべて通った場合だけ、同年度・同予算種別の旧版を `archived` にして新しい版を `active` に切り替えます。一般ユーザーがSELECTできるのは `active` の公開情報だけです。

### 人間レビュー済み課題関係の登録

10大分類のtopic定義は `data/budget/editorial/topic-definitions/` に置きます。
各分類には個別の課題・目標topicがあります。候補生成時の母集団に使う
`administrative_function` topicは定義として保持しますが、広すぎるため本番グラフには
公開しません。世田谷区の公式な課題分類ではありません。
公開用7ファイルの公式項目だけから、人間レビュー用の候補CSVを生成できます。

```bash
pnpm budget:web:topics:expand-definitions
pnpm budget:web:topics:candidates -- --input-dir /path/to/budget-data
pnpm budget:web:topics:curate
```

`expand-definitions` は、行政機能topicを母集団として、初期10 topic候補の外にいた
981 identityを56個の具体的topicへ分ける定義ファイルを決定的に再生成します。
初期候補175件との混入、追加候補間の重複、行政機能topic外への割当をテストで拒否します。
`curate` はtopic名を14文字以下の短い語句へ統一し、公開topicを大分類ごとに12件以下、
公開事業をtopicごとに12件以下へ絞ります。B・Highであっても、一般管理、人件費、基金、
topicとの直接一致が弱い候補は公開しません。上限を埋めるための承認も行いません。

候補生成は `review_decision` が入った既存CSVを上書きしません。新規候補の
`review_decision` と `review_note` は空欄です。候補生成では
`A_official_direct` を使わず、公式階層・事業名・部署から強く読める
`B_strong_structural` と、編集判断を要する `C_editorial` を区別します。
C候補を含め、候補は自動公開されません。

レビューCSVは、localhost専用の画面から確認・保存できます。

```bash
pnpm budget:web:topics:review
```

起動時に短名・直接性・件数上限の公開ポリシーを冪等に適用します。現在の
全2,312候補では582件を公開候補、1,730件を非公開候補とし、未判断は0件です。
大分類、判断、根拠レベル、検索語で
絞り込み、各候補を `approve`、`revise`、`reject` から選択して `CSVへ保存` を
押してください。`revise` は公開対象になる最終判断なので、関係種別または説明を
修正し、レビュー注記も入力します。

この画面は `127.0.0.1` だけで待受け、Supabaseへ接続しません。保存先は
`data/budget/editorial/review/` の既存CSVだけです。保存しても本番反映は行われません。
手動確認対象の未判断が0件になったらCodexへ「提出したよ」と伝え、CSV差分、
dry-run、接続先を確認した後に、明示された指示に従って既存の公開CLIを実行します。

ポートや入力場所を変える場合は次の引数を使用できます。

```bash
pnpm budget:web:topics:review -- \
  --review-dir /path/to/review \
  --definitions-dir /path/to/topic-definitions \
  --port 4411
```

画面を起動せず、公開ポリシーだけを冪等に適用する場合は、
次を実行します。

```bash
pnpm budget:web:topics:review -- --auto-approve-only
```

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

本番への公開は、ローカルCLIからは実行できません。`main` の手動workflow
`Publish Reviewed Budget Topics` だけが、GitHubの `production` 環境を使って実行
できます。workflowは確認文、topic定義と同数の全76 review CSVのdry-run、active dataset、レビュー
担当者、公開後のtopic・category・relation内容を検証します。現在の提出結果では
公開topic64件、archived topic12件、`approve/revise=582`、`reject=1,730`、
`pending=0` が期待値です。公開topicへ接続しない574 identityは正常で、検索、公式分類、
全予算一覧から閲覧できます。公式予算テーブル、予算dataset、Storageは変更しません。

```bash
gh workflow run publish_budget_topics.yml \
  --ref main \
  -f confirmation=PUBLISH_REVIEWED_BUDGET_TOPICS \
  -f reviewed_at=2026-08-03T12:00:00+09:00
```

既存公開関係のreviewerが一意なら、そのSupabase Authユーザーを引き継ぎます。
一意に決められない場合だけ `reviewer_uuid` を明示します。秘密鍵とレビュアー情報は
ログへ出さず、workflow終了時に `budget:web:topics:verify` がreview CSVとの完全一致を
確認します。途中失敗時は関係を推測で補正せず、ログとDB状態を確認してから冪等に
再実行します。

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
4. `pnpm budget:web:topics:curate` を実行し、短名・直接性・大分類12 topic・topic 12事業の上限を再適用する。
5. レビュー済み候補CSVに記録された `budget_program_identity_id` が新datasetにも存在し、事業名・金額・公式階層に意図しない変更がないことを確認する。
6. 各review CSVについて `pnpm budget:web:topics:publish` をまずdry-runし、approve / revise / reject / pending件数を確認する。pendingがあるtopicは公開しない。
7. 元のレビュー担当者・レビュー日時を明示して、全行レビュー済みのtopicを `--apply` する。`publicationStatus=archived` は公開関係も冪等に非公開化する。
8. `pnpm budget:web:topics:report` を実行し、active datasetのmanifest、公開済み件数、未分類件数を確認する。公開APIとグラフにはpublished関係だけが出ることを確認する。

identity IDや根拠項目が変わった場合は、旧関係を推測でコピーせず候補CSVを再生成し、
人間の再レビューへ戻してください。手順3〜8が終わるまで、新datasetでは課題に紐づく
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
