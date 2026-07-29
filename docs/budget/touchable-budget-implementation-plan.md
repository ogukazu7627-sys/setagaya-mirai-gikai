# 「触れる予算」実装前調査・実装計画

- 調査日: 2026-07-30
- 対象: みらい議会＠世田谷区
- Phase: 0
- 状態: 実装前調査完了

## 1. 結論

「触れる予算」は、公開画面の主ルートを `/budget` とし、既存の
Next.js App Router、feature ベース構成、Supabase repository 層、
default deny の RLS 方針をそのまま利用する。

本番DBへ取り込む入力は、公開用6データファイルと
`public_dataset_manifest.json` の計7ファイルだけに限定する。CSVとJSONに
重複して含まれる事業・歳入細節は二重に正本化せず、片方をDB投入元、
もう片方を投入時の整合性検証に使う。

推奨する最初の実装順は次のとおり。

1. 公開データ専用のリリース管理・正規化テーブルを作る。
2. manifestとファイルハッシュを検証するローカルCLIを作る。
3. 新しいリリースへ全行を投入し、検証後に1回のRPCで有効化する。
4. Server Componentから読むrepository、loader、serviceを作る。
5. `/budget` の検索・一覧を作る。
6. 予算事業identity、歳出目、歳入目の詳細画面を作る。
7. 検索結果だけを根拠に使う予算AI回答を追加する。
8. 議員質問とのリンクとレビュー管理UIは、データモデルを分けて後続実装する。

検索は、現行の `pg_trgm` と匿名レート制限を再利用した決定的な
キーワード検索から始める。1,156件の事業identityに対してはこれで十分に
評価できる。Embeddingは検索品質を計測した後の拡張とし、Phase 1の
必須要件にはしない。

グラフは後続UI Phaseで `recharts` を採用する。初期表示はアクセシブルな
HTMLの金額一覧を正とし、Treemapや棒グラフはClient Componentの補助表示にする。
歳入と歳出のallocationは金額フローではないため、Sankey図にはしない。

## 2. Phase 0の範囲

### 実施したこと

- ブランチ系統と世田谷版の正しい起点の確認
- フロントエンド、ルーティング、UI構成の確認
- Supabase、RLS、migration、型生成、データ投入方式の確認
- 検索、認証、管理画面、テスト、CI/CDの確認
- 公開用7ファイルの実スキーマ、ハッシュ、件数、参照関係の検証
- 後続Phaseの推奨アーキテクチャ整理

### 実施していないこと

- アプリコードの変更
- 依存パッケージの追加
- Supabase migration、テーブル、RPCの作成
- ローカルまたは本番Supabaseへのデータ投入
- 公開用・コア・監査用データファイルの変更
- 本番デプロイ

## 3. 正しい開発起点

### 3.1 確認結果

調査開始時に全remoteをfetchし、次を確認した。

| 系統 | 確認時HEAD | 用途 |
| --- | --- | --- |
| `setagaya/main` | `3df3b682` | 現在の「みらい議会＠世田谷区」本体 |
| `origin/develop` | `232ef4ae` | upstreamの開発系統 |
| `agent/budget-data-input-profile` | `09c98759` | 予算データ生成基盤 |

`setagaya/main` と `origin/develop` の共通祖先は `f1e34942` であり、
共通祖先以降の差分は次のとおりだった。

- `setagaya/main` にのみ存在: 289コミット
- `origin/develop` にのみ存在: 973コミット

予算データ生成ブランチと `setagaya/main` も同じ共通祖先から分岐しており、
予算データ生成ブランチは世田谷版の289コミットを含んでいない。

### 3.2 判断

アプリ実装の正しい起点は `setagaya/main` とする。今回のPhase 0は
`setagaya/main` から次の専用worktreeを作成した。

- branch: `agent/touchable-budget-phase-0`
- worktree: `tools/mirai-gikai-touchable-budget-phase-0`

予算データ7ファイルは、既存の
`tools/mirai-gikai-budget-data-input-profile/processed/public/` から
読み取り専用で参照した。

### 3.3 ブランチ上のリスク

リポジトリの一般ルールは `develop` 起点だが、現在のローカル `develop` は
upstream系統であり、世田谷版の改修を保持していない。後続Phaseでも
機械的に `develop` を選ばず、次を毎回確認する必要がある。

1. `setagaya/main` のremote最新HEAD
2. 対象Phase開始時点のopen PRと直近merge
3. upstream取り込み方針が別途決まっているか

upstreamの973コミットをこの機能のついでにmergeしてはならない。必要な場合は、
予算機能と分けた統合作業として扱う。

## 4. 現在のリポジトリ構成

| パス | 役割 |
| --- | --- |
| `web/` | 公開用Next.jsアプリ |
| `admin/` | ポート3001で動く独立管理アプリ |
| `web/src/app/admin/` | 世田谷版で追加された公開アプリ内の管理画面 |
| `packages/supabase/` | Supabase clientと生成型 |
| `packages/shared/` | web/admin共有ロジック |
| `packages/seed/` | service roleを使うローカル投入CLI |
| `packages/topic-analysis-core/` | トピック分析の共有処理 |
| `supabase/migrations/` | 122件のmigration |
| `tests/supabase/` | ローカルSupabase統合テスト |
| `.github/workflows/` | lint、型、build、unit、integration、deploy |

## 5. フロントエンド調査

### 5.1 フレームワーク

| 項目 | 現在値 |
| --- | --- |
| Next.js | `15.5.9` |
| React / React DOM | `19.1.2` |
| Router | App Router |
| TypeScript | 5系 |
| CSS | Tailwind CSS 4 |
| UI primitive | Radix UI |
| アイコン | `lucide-react` |
| class構成 | `class-variance-authority`、`clsx`、`tailwind-merge` |

`web/src/app/(main)/page.tsx` などのpageは薄いラッパーで、実際の画面は
`web/src/features/*` に置く構成である。

### 5.2 Server Component / Client Component

Server Componentが標準であり、Supabaseアクセスは
`server/repositories/` に閉じ込めている。検索入力、フィルター、グラフ、
タブ、展開操作など、ブラウザ状態が必要な箇所だけをClient Componentにする。

予算機能も次の境界にする。

- Server:
  - page metadata
  - 初期データ取得
  - repository / loader / service
  - AIコンテキスト生成
- Client:
  - 検索フォーム
  - 絞り込み
  - 表示モード切替
  - Treemap / 棒グラフ
  - URL検索パラメータの同期

Client ComponentからSupabaseを直接読ませない。

### 5.3 推奨ルート

既存ルートが英語名で統一されているため、主ルートは `/budget` を推奨する。

| ルート | 用途 | 初期Phase |
| --- | --- | --- |
| `/budget` | 予算トップ、検索、会計・款別の概要 | 必須 |
| `/budget/programs/[identityId]` | 市民向け予算事業identity詳細 | 必須 |
| `/budget/items/[budgetItemKey]` | 歳出の「目」全体と節別内訳 | 後続 |
| `/budget/revenues/[revenueItemKey]` | 歳入の款・項・目詳細 | 後続 |

本番URLの歳出事業主キーは `budget_program_identity_id` にする。
`program_id` と `budget_program_group_id` はURL主キーにしない。

新規page追加時は `web/src/lib/routes.ts` に必ず関数を追加する。
`web/src/lib/routes.test.ts` はApp Routerのpageとroutes定義の双方向一致を
検証している。

### 5.4 ヘッダー、フッター、ナビゲーション

公開画面は `(main)/layout.tsx` で次を共通表示する。

- 固定デスクトップヘッダー
- 共通フッター
- モバイル下部ナビゲーション
- `MainLayout`

現在の主要ナビゲーションは4項目である。

- ホーム
- 議会
- 議員
- 学ぶ

「予算」を主要ナビに追加する場合は、次の変更が必要になる。

- `PrimaryNavigationItemId`
- `PRIMARY_NAVIGATION_ITEMS`
- ラベルとLucideアイコン
- mobileの `grid-cols-4`
- active route判定
- desktop/mobile/headerのテスト

モバイルを5項目にするか、「議会」の配下導線にするかはUI実装前の
プロダクト判断とする。推奨初期値は、予算を独立した5番目の主要項目にし、
実機でラベル幅とタップ領域を確認することである。

### 5.5 デザインシステム

既存方針を継承する。

- `web/src/components/ui/` のButton、Dialog、Popover、Select等を使う
- アイコンはLucideを使う
- 色は `web/src/app/globals.css` の既存トークンを使う
- feature固有の色をinline hexで追加しない
- page sectionを装飾カードで囲みすぎない
- 金額、会計、款・項・目をスキャンしやすい密度にする
- chartだけに意味を持たせず、同じ値を表または一覧でも読めるようにする

### 5.6 アニメーション

専用のJSアニメーションライブラリはない。

- `tw-animate-css`
- `globals.css` の限定的なkeyframes
- `nextjs-toploader`
- carousel用の `embla-carousel-react`

予算画面では、既存CSS transitionと `prefers-reduced-motion` 対応を使い、
新しいモーション依存は追加しない。

### 5.7 グラフライブラリ

現在、web/adminにグラフ描画ライブラリはない。後続UI Phaseで
`recharts` を1つだけ追加することを推奨する。

選定理由:

- Reactのコンポーネントモデルに合う
- ResponsiveContainerを利用できる
- 棒グラフとTreemapを同じ依存で作れる
- SVGとHTML一覧を組み合わせやすい
- chart部分だけClient Componentに隔離できる

公式資料:

- https://recharts.github.io/en-US/api/ResponsiveContainer/
- https://recharts.github.io/en-US/api/Treemap/

利用方針:

- 会計・款の比較: 横棒グラフ
- 事業規模の探索: Treemap
- 前年度比: 発散棒グラフまたは数値一覧
- allocation: 関係リストのみ。Sankey図は禁止
- `isAnimationActive="auto"` または無効化を使う
- chartの親要素に安定した高さ・aspect ratioを与える

## 6. Supabase調査

### 6.1 migrationとローカル起動

- migration: `supabase/migrations/`
- migration数: 122
- 確認時の最新:
  `20260727160000_create_councilor_x_posts.sql`
- local起動: `npx supabase start`
- local API: `http://127.0.0.1:54421`
- local DB: `127.0.0.1:54432`
- local Studio: `http://127.0.0.1:54423`
- PostgreSQL major: 17

主なコマンド:

```bash
pnpm db:reset
pnpm db:migrate
pnpm db:types:gen
pnpm test:integration
```

型は次のコマンドで
`packages/supabase/types/supabase.types.ts` に生成する。

```bash
npx --yes supabase gen types typescript --local
```

### 6.2 Supabase clientと秘密鍵

既存client:

- Server/service role:
  `packages/supabase/src/admin.ts` の `createAdminClient()`
- Browser/publishable key:
  `packages/supabase/src/browser.ts`
- Cookie連携の認証client:
  `@supabase/ssr`

`SUPABASE_SECRET_KEY` はserver、worker、ローカルCLIだけで使用する。
予算の投入CLIもこの方針を継承し、値をログへ出さない。

### 6.3 RLS方針

公開schemaのアプリテーブルはRLSを有効化し、原則としてpolicyを定義しない
default deny方式である。公開画面の読み取りもServer Component /
repository内の `createAdminClient()` で行う。

予算テーブルも次を必須とする。

```sql
alter table ... enable row level security;
revoke all on table ... from public, anon, authenticated;
grant select, insert, update, delete on table ... to service_role;
```

公開ブラウザから予算テーブルへ直接アクセスさせない。

### 6.4 既存データ投入方式

`packages/seed/csv/import-csv.ts` がCSVを読み、
service role clientでinsertする既存例である。ただし、このCLIは最初に
`clearAllData()` を呼び、既存アプリデータを削除する。

予算投入ではこの破壊的処理を再利用してはならない。既存の
`packages/seed`、`csv-parse`、`createAdminClient()` の方式だけを再利用し、
予算専用の非破壊CLIを追加する。

推奨配置:

```text
packages/seed/budget/
  import-public-budget.ts
  read-public-budget-files.ts
  validate-public-budget-files.ts
```

### 6.5 環境分離

- local: `supabase start` と `.env`
- CI: GitHub Actions内でlocal Supabaseを起動
- staging: `develop` とGitHub Environment `staging`
- production: `main` とGitHub Environment `production`
- Vercel: git deployを無効化し、DB migration成功後にdeploy hookを呼ぶ

Phase 0ではlocal、staging、productionのいずれにもデータ投入していない。

## 7. 既存検索基盤

### 7.1 現状

既存の議会検索は次を利用する。

- `extensions.vector(512)`
- HNSW cosine index
- `pg_trgm` GIN index
- RPC `search_council_bills`
- キーワード順位と意味類似度のRRF
- Embedding model: `openai/text-embedding-3-small`
- Embedding失敗時のkeyword fallback

PostgreSQLの `tsvector`、`to_tsvector`、
`websearch_to_tsquery` は現在使われていない。

### 7.2 APIレート制限

`POST /api/council-search` は次を実施している。

- same-origin検証
- 16KiBのbody上限
- query最大200文字
- 10分固定窓
- installation IDごとに30回
- IPごとに150回
- HMAC化したキーだけをDBへ保存

予算検索APIも `consumeAnonymousRateLimit()` を再利用し、
route keyを `budget-search` として分離する。

### 7.3 検索語ログ

現在の議会検索では、検索語そのものをDBへ保存するテーブルやrepositoryは
見つからなかった。エラー応答にも検索語を含めないテストがある。

予算検索も初期状態ではraw queryを永続化しない。利用分析が必要になった場合は、
事前にプライバシー方針、保持期間、管理画面での閲覧権限を決める。

### 7.4 予算検索の推奨方式

Phase 1では次の順に検索する。

1. fiscal year、account、款等の構造化filter
2. 正規化名称への完全一致・部分一致
3. `pg_trgm` 類似度
4. 金額順、名称順の決定的sort

対象となる主検索単位は `budget_program_identity_id` である。
検索文書には次を含める。

- `display_program_name`
- `department_display_name`
- account、款、項、目の名称
- identityに属する内訳事業名

歳入は別のentity typeとして、款・項・目・節・細節名、
`source_funding_category_name`、部署表示名を対象にする。

Embeddingを追加する場合は、既存のindex job、512次元vector、
repository/service/API分離を拡張し、新しい並行基盤を作らない。

## 8. 認証・編集権限

### 8.1 現在の認証

- Supabase Authを使用
- `auth.users.raw_app_meta_data.roles` に `admin` を保持
- 独立adminアプリは `checkAdminPermission()` で判定
- 世田谷版のweb内adminはadmin roleに加え、本番で
  `SETAGAYA_ADMIN_EMAILS` のallowlistを要求
- Google OAuthとemail/passwordの経路がある

### 8.2 編集者ロール

現在、`editor` または予算専用reviewerロールは存在しない。実装初期は
既存adminだけにレビュー操作を許可するのが最小である。

将来admin以外へ委譲する場合は、文字列判定を各画面へ散らさず、
共通permission helperへ `budget_editor` を追加する。その際もDBのRLSを
ブラウザへ開けず、Server Actionで認可する。

### 8.3 将来の質問リンク管理UI

独立 `admin/` には議案、タグ、インタビュー、トピック分析、公開レビューの
既存画面がある。予算と議員質問の候補をレビューするUIは
`admin/src/features/budget-links/` に追加可能である。

初期のリンク先は市民向けidentityに限定し、次のような別テーブルを推奨する。

```text
budget_question_program_links
  bill_id
  budget_program_identity_id
  link_status
  evidence
  created_by
  reviewed_by
  reviewed_at
```

自動候補をそのまま公開せず、`proposed -> approved / rejected` の状態を持たせる。
このテーブルはPhase 1の予算データ投入とは分離する。

## 9. テスト・公開フロー

### 9.1 テスト

- unit/component: Vitest
- React component: Testing Library + jsdom
- repository/API integration: Vitest + local Supabase
- DB function: `tests/supabase/db-function/`
- RLS: `tests/supabase/rls/default-deny.test.ts`
- MCP integration: `tests/mcp/`
- E2E: Playwright/Cypressの直接依存・設定はない

新しいDB functionにはlocal Supabaseを使う統合テストが必須である。

### 9.2 GitHub Actions

- `code_check.yml`
  - Biome
  - typecheck
  - Next build
  - unit test + coverage
- `integration_test.yml`
  - local Supabase起動
  - migration適用
  - integration test + coverage
- `deploy.yml`
  - Supabase差分検出
  - migration/config反映
  - Vercel deploy hook
- `deploy_worker.yml`
  - Cloud Run worker

### 9.3 PR・公開

feature branchから世田谷版の正しいbaseへPRを作り、CIとレビューを通す。
本番migration、データ投入、merge、deployは別々の明示的な承認対象とする。

予算の主要ユーザーフローにはE2Eがないため、UI Phaseでは
Playwright導入の要否を判断する。最低限、次を自動確認したい。

- `/budget` の検索
- 事業identity詳細への遷移
- 0円表示切替
- 歳入関連の表示
- allocation金額を表示しないこと
- モバイルナビとデスクトップナビ

## 10. 公開用7ファイルの検証

### 10.1 入力場所

今回確認した実ファイル:

```text
tools/mirai-gikai-budget-data-input-profile/processed/public/
```

実装ではこのパスを固定値にしない。

### 10.2 manifest

- manifest SHA-256:
  `dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7`
- `schemaVersion`: `public-budget-v1`
- `fiscalYear`: `2026`
- `datasetKind`: `public_budget`
- `budgetType`: `initial_budget`
- `currencyUnit`: `thousand_yen`
- `validation.status`: `PASS`
- `validation.errors`: `[]`

manifestの `publicFiles` は6件である。manifest自身をhash対象へ含めない設計のため、
入力は合計7ファイルになる。

manifestはリリース・監査・cache更新判定にだけ使い、画面やAIの検索対象には
しない。

### 10.3 ファイル、件数、hash

全6データファイルで、実ファイルのSHA-256、行数/item数、CSV列数が
manifestと一致した。

| ファイル | 行/item数 | 列数 | SHA-256 |
| --- | ---: | ---: | --- |
| `public_budget_program_identities.csv` | 1,156 | 21 | `baee6d07fa0b4e55742e2e706239b272b2b545d3461152281da2ab7e507e7d58` |
| `public_budget_programs.csv` | 1,170 | 21 | `7864a1856fd708129b912b61ad0cb6cc10dfc3a7c28b3ca7ad54ae907c217f24` |
| `public_budget_items.json` | 190 | - | `01790675b33a28a9b1bb692052012136e5f99de373811600d4d9446ea23a7625` |
| `public_budget_revenue_details.csv` | 2,192 | 26 | `80a44ea866e616c822a61818e7f4cdaabea18bed5cebf51d4e4a259c1417be0e` |
| `public_budget_revenue_items.json` | 175 | - | `b89d0d0181931318ae6fd9f257bd2242e28c791d4a3a321cd7cdb1d241d29f81` |
| `public_budget_revenue_allocations.json` | 1,948 | - | `cb1a35734936f89ce3be59de27f9f8b7b4be6b236298ff68a38b501f4c92fb1c` |

### 10.4 CSV列

#### public_budget_program_identities.csv

```text
budget_program_identity_id
fiscal_year
account_code
account_name
budget_side
budget_item_key
kan_code
kan_name
kou_code
kou_name
moku_code
moku_name
display_program_name
department_display_name
amount_thousand_yen
member_group_count
member_program_count
related_revenue_count
has_public_identity_resolution
is_zero_amount
source_type
```

#### public_budget_programs.csv

```text
program_id
budget_item_key
fiscal_year
account_code
account_name
kan_code
kan_name
kou_code
kou_name
moku_code
moku_name
major_program_name
budget_program_name
detail_program_name
department_display_name
amount_thousand_yen
is_zero_amount
source_type
source_file
source_row_number
budget_program_identity_id
```

#### public_budget_revenue_details.csv

```text
revenue_detail_id
revenue_section_id
revenue_item_key
fiscal_year
account_code
account_name
kan_code
kan_name
kou_code
kou_name
moku_code
moku_name
setsu_code
setsu_name
saisetsu_code
saisetsu_name
department_display_name
source_funding_category_name
funding_nature
previous_amount_thousand_yen
current_amount_thousand_yen
diff_amount_thousand_yen
is_zero_amount
related_program_count
source_file
source_row_number
```

### 10.5 JSON構造

#### public_budget_items.json

トップレベルは190件の配列で、各itemは次を持つ。

```text
budgetItemKey
fiscalYear
accountCode
accountName
budgetSide
kan
kou
moku
amountThousandYen
validationStatus
programs[]
sections[]
dataAvailability
sourceReferences[]
```

`programs[]`:

```text
programId
majorProgramName
budgetProgramName
detailProgramName
departmentDisplayName
amountThousandYen
isZeroAmount
sourceReference
```

`sections[]`:

```text
sectionId
setsuCode
setsuName
amountThousandYen
scope
sourceReference
```

`dataAvailability`:

```text
funding
actualSpending
settlement
contracts
vendors
programSectionMapping
```

#### public_budget_revenue_items.json

トップレベルは175件の配列で、各itemは次を持つ。

```text
revenueItemKey
fiscalYear
accountCode
accountName
kan
kou
moku
previousAmountThousandYen
currentAmountThousandYen
diffAmountThousandYen
revenueComposition
revenueSourceDisplay
sections[]
details[]
dataAvailability
sourceReferences[]
```

`sections[]`:

```text
revenueSectionId
setsu
previousAmountThousandYen
currentAmountThousandYen
diffAmountThousandYen
detailCount
validationStatus
sourceReference
```

`details[]` は公開CSVの歳入細節と同じID・金額を持つ。

#### public_budget_revenue_allocations.json

トップレベルは1,948件の配列で、各relationは次を持つ。

```text
allocationLinkId
revenueDetailId
targetBudgetProgramGroupId
targetBudgetProgramIdentityId
targetBudgetItemKey
targetAccountCode
targetProgramName
targetBudgetBookPage
targetResolutionLevel
candidateTargetGroupCount
relationType
allocationAmountThousandYen
amountAttributionStatus
sourceReference
```

### 10.6 IDと参照関係

全件で次を確認した。

| 検証 | 結果 |
| --- | ---: |
| identity ID一意 | 1,156 / 1,156 |
| program ID一意 | 1,170 / 1,170 |
| budget item key一意 | 190 / 190 |
| revenue detail ID一意 | 2,192 / 2,192 |
| revenue section ID種類 | 650 |
| revenue item key一意 | 175 / 175 |
| allocation link ID一意 | 1,948 / 1,948 |
| program -> identity参照欠落 | 0 |
| program -> budget item参照欠落 | 0 |
| identity -> budget item参照欠落 | 0 |
| allocation -> revenue detail参照欠落 | 0 |
| allocation -> target identity参照欠落 | 0 |
| allocation -> target budget item参照欠落 | 0 |

JSON内の重複read modelも一致した。

- `public_budget_items.json` のnested program: 1,170件
- program CSVとの相互欠落: 0件
- `public_budget_items.json` のsection: 994件
- `public_budget_revenue_items.json` のnested detail: 2,192件
- revenue detail CSVとの相互欠落: 0件
- `public_budget_revenue_items.json` のsection: 650件

### 10.7 金額

identity、program、budget item、revenue detail、revenue itemの各経路で、
全会計合計はすべて `621,033,664` 千円だった。

| account_code | 歳出 | 歳入 |
| --- | ---: | ---: |
| `general` | 431,353,010 | 431,353,010 |
| `national_health_insurance` | 84,206,905 | 84,206,905 |
| `latter_stage_elderly_healthcare` | 29,414,796 | 29,414,796 |
| `long_term_care_insurance` | 76,058,953 | 76,058,953 |
| `school_lunch_fee` | 0 | 0 |

金額列はPostgreSQLで `bigint` を使う。現在値は32bit範囲内でも、
集計と翌年度拡張を考えて `integer` に限定しない。

### 10.8 allocationの安全性

| 項目 | 結果 |
| --- | ---: |
| `exact_group` | 1,909 |
| `public_identity` | 39 |
| exact行のgroup欠落 | 0 |
| public identity行のgroup非null | 0 |
| allocation金額の非null | 0 |
| `amountAttributionStatus != not_available` | 0 |
| source-target重複 | 0 |
| 複数targetを持つrevenue detail | 27 |
| 1 detailあたり最大target | 6 |

公開DBとアプリの必須外部キーは
`targetBudgetProgramIdentityId` とする。39件の `public_identity` は正常であり、
内部groupを補完しない。

### 10.9 0円と表示用部署

- 0円program: 44件
- 0円identity: 43件
- 0円revenue detail: 226件
- 0円revenue item: 9件
- identityの部署表示名空欄: 0件
- programの部署表示名空欄: 0件
- revenue detailの部署表示名空欄: 0件

0円行はDBへ保持し、通常検索で除外するかどうかをquery optionで制御する。

### 10.10 誤用防止条件

検証結果:

- program内にsectionsを持つ行: 0
- sectionの `scope != budget_item`: 0
- 公開program CSVの財源内訳列: 0
- allocation金額: 全件null

DB制約とアプリ型でも次を維持する。

- 事業と節を直接結ばない
- 節は `budget_item_key`、すなわち「目」全体にだけ結ぶ
- allocationを合計しない
- 当初予算を実支出・決算・契約と表現しない
- 歳出programから財源内訳を推論しない
- 一般会計では一般財源・特定財源を表示できる
- 特別会計では一般財源・特定財源に二分せず、歳入源区分を表示する

## 11. `(1)` / `(2)` 付きファイルへの対応

投入CLIは固定ダウンロード名や固定ディレクトリに依存させない。

推奨CLI:

```bash
pnpm budget:import -- \
  --input-dir /absolute/path/to/public-budget-files \
  --manifest /absolute/path/to/public_dataset_manifest.json
```

解決順:

1. `--manifest` があればそのファイルを使う。
2. なければ `--input-dir` 内から
   `public_dataset_manifest.json` または `public_dataset_manifest (N).json`
   を探す。
3. manifestの `role` ごとに、CLI明示パスを最優先する。
4. 入力ディレクトリでは、拡張子直前の ` (N)` だけを除いた論理名で候補を探す。
5. 候補のSHA-256をmanifestと比較する。
6. hashが一致する1ファイルだけを採用する。
7. 0件または複数件なら投入せずFAILにする。

ファイル名の似た候補を更新日時や連番の大きさで選ばない。hashが唯一の
採用根拠である。

## 12. 推奨Supabaseテーブル

### 12.1 リリース管理

#### budget_dataset_releases

- `id uuid primary key`
- `schema_version text not null`
- `fiscal_year smallint not null`
- `dataset_kind text not null`
- `budget_type text not null`
- `currency_unit text not null`
- `manifest_sha256 char(64) not null`
- `manifest jsonb not null`
- `status text not null`
- `imported_at timestamptz not null default now()`
- unique: `(fiscal_year, manifest_sha256)`
- check: `status in ('staging', 'active', 'superseded', 'failed')`

#### budget_dataset_files

- `dataset_release_id uuid`
- `role text`
- `source_path text`
- `format text`
- `sha256 char(64)`
- `row_count integer`
- `column_count integer null`
- primary key: `(dataset_release_id, role)`

#### budget_accounts

- `dataset_release_id uuid`
- `account_code text`
- `account_name text`
- `expenditure_amount_thousand_yen bigint`
- `revenue_amount_thousand_yen bigint`
- primary key: `(dataset_release_id, account_code)`

すべての予算データテーブルに `dataset_release_id` を持たせる。新しいデータを
別releaseへ全件投入し、検証後にactive releaseを1回のRPCで切り替える。

### 12.2 歳出

#### budget_items

- primary key: `(dataset_release_id, budget_item_key)`
- fiscal year、account、budget side
- 款・項・目コードと名称
- `amount_thousand_yen bigint`
- `validation_status`
- data availability

#### budget_program_identities

- primary key: `(dataset_release_id, budget_program_identity_id)`
- FK: `budget_item_key -> budget_items`
- 表示事業名、表示部署名
- 金額、member count、関連歳入count
- public identity resolution、0円flag

#### budget_programs

- primary key: `(dataset_release_id, program_id)`
- FK: `budget_program_identity_id -> budget_program_identities`
- FK: `budget_item_key -> budget_items`
- 大事業、予算事業、内訳事業
- 表示部署、金額、0円flag
- source file、source row

#### budget_item_sections

- primary key: `(dataset_release_id, section_id)`
- FK: `budget_item_key -> budget_items`
- 節コード、節名称、金額
- `scope` check: `scope = 'budget_item'`
- PDF source file、pdf page、budget book page

`budget_item_sections` に `program_id`、
`budget_program_identity_id` を追加してはならない。

### 12.3 歳入

#### budget_revenue_items

- primary key: `(dataset_release_id, revenue_item_key)`
- fiscal year、account、款・項・目
- 前年度、当年度、差額
- 一般財源、特定財源、特別会計歳入
- display mode
- data availability

#### budget_revenue_sections

- primary key: `(dataset_release_id, revenue_section_id)`
- FK: `revenue_item_key -> budget_revenue_items`
- 節コード、名称、前年度、当年度、差額
- detail count、validation status

#### budget_revenue_details

- primary key: `(dataset_release_id, revenue_detail_id)`
- FK: `revenue_item_key -> budget_revenue_items`
- FK: `revenue_section_id -> budget_revenue_sections`
- 細節、表示部署、財源区分、funding nature
- 前年度、当年度、差額、0円flag
- related program count
- source file、source row

### 12.4 歳入・歳出関係

#### budget_revenue_allocations

- primary key: `(dataset_release_id, allocation_link_id)`
- FK: `revenue_detail_id -> budget_revenue_details`
- FK: `target_budget_program_identity_id -> budget_program_identities`
- FK: `target_budget_item_key -> budget_items`
- `target_budget_program_group_id text null`
- target account、program name、book page
- resolution level、candidate count、relation type
- `allocation_amount_thousand_yen bigint null`
- amount attribution status
- PDF source

制約:

```sql
check (allocation_amount_thousand_yen is null)
check (amount_attribution_status = 'not_available')
check (
  (target_resolution_level = 'exact_group'
    and target_budget_program_group_id is not null)
  or
  (target_resolution_level = 'public_identity'
    and target_budget_program_group_id is null)
)
```

公開用6ファイルにはgroup masterがないため、
`target_budget_program_group_id` には外部キーを張らない。画面とAIは必ず
identityへリンクする。

### 12.5 検索用派生テーブル

必要なら `budget_search_documents` を追加する。

- `dataset_release_id`
- `entity_type`
- `entity_id`
- `fiscal_year`
- `account_code`
- `title`
- `normalized_content`
- `embedding vector(512) null`
- primary key: `(dataset_release_id, entity_type, entity_id)`
- GIN trigram index: `normalized_content`

初期Phaseではembeddingをnullのままにできる設計にする。

## 13. CSV/JSONからDBへの投入マッピング

重複を次のように扱う。

| 入力 | DBへ投入する内容 | 重複部分の扱い |
| --- | --- | --- |
| identity CSV | identity master | そのまま投入 |
| program CSV | program detail | そのまま投入 |
| budget item JSON | item、section、availability、PDF source | nested programsはCSVとの検証だけ |
| revenue detail CSV | revenue detail | そのまま投入 |
| revenue item JSON | revenue item、revenue section、availability | nested detailsはCSVとの検証だけ |
| allocation JSON | relation | 金額nullを制約で固定 |
| manifest | release、file、account totals | 自身のhashはCLI側で計算 |

これにより、同じprogramやrevenue detailを2テーブルへ重複投入しない。

## 14. 原子的な投入フロー

1. CLI引数から7ファイルを解決する。
2. manifest schema versionを検証する。
3. 全ファイルhash、件数、列数を検証する。
4. メモリ上でID一意性、参照、金額、安全制約を検証する。
5. `staging` 状態のreleaseを作る。
6. release ID付きで全テーブルへ投入する。
7. DB内で件数、参照、会計別金額を再検証する。
8. `activate_budget_dataset_release()` RPCを1回呼ぶ。
9. 同年度の旧active releaseを `superseded` にする。
10. 失敗時はactive releaseを変更しない。

推奨RPC:

```text
activate_budget_dataset_release(
  p_release_id uuid,
  p_manifest_sha256 text
)
```

RPCはtransaction内で、staging状態、全件数、期待合計、現在のactive releaseを
確認して切り替える。RPCを追加するPhaseでは
`tests/supabase/db-function/` に統合テストを作る。

## 15. 推奨コンポーネント構成

```text
web/src/app/(main)/budget/
  page.tsx
  programs/[identityId]/page.tsx
  items/[budgetItemKey]/page.tsx
  revenues/[revenueItemKey]/page.tsx

web/src/features/budget/
  server/
    components/
      budget-page.tsx
      budget-program-detail-page.tsx
      budget-item-detail-page.tsx
      budget-revenue-item-detail-page.tsx
    loaders/
      load-budget-page.ts
      load-budget-program-detail.ts
      load-budget-item-detail.ts
      load-budget-revenue-item-detail.ts
    repositories/
      budget-program-repository.ts
      budget-item-repository.ts
      budget-revenue-repository.ts
      budget-allocation-repository.ts
    services/
      budget-search-service.ts
      budget-ai-context-service.ts
  client/
    components/
      budget-search-panel.tsx
      budget-filter-bar.tsx
      budget-treemap.tsx
      budget-bar-chart.tsx
      budget-display-tabs.tsx
  shared/
    types/
      budget.ts
    utils/
      amount-format.ts
      budget-search-params.ts
      budget-data-availability.ts
```

pageはparams/searchParamsとmetadataだけを担当する。

## 16. AI回答の境界

予算AIは、DBの公開テーブルから取得した限定的な検索結果だけを
コンテキストにする。

回答可能:

- 会計、款、項、目
- 予算事業と当初予算額
- 目全体の節別内訳
- 歳入の款・項・目・節・細節
- 歳入細節と歳出事業identityの関連
- 出典CSV行、PDFページ

回答不可:

- 個別事業の節別内訳
- allocationの配分額
- allocation relationの合計
- 実収入、実支出、決算、契約、業者
- 公開データにない財源の推論

AI用serviceは、回答不能理由を構造化して返す。既存の公開データ生成時に
定義されたavailabilityと制約文を、DB投入後も失わせない。

## 17. Phase 1以降で変更予定のファイル

### Phase 1: DBと投入

```text
supabase/migrations/<timestamp>_create_public_budget_schema.sql
packages/supabase/types/supabase.types.ts
packages/seed/package.json
packages/seed/budget/import-public-budget.ts
packages/seed/budget/read-public-budget-files.ts
packages/seed/budget/validate-public-budget-files.ts
package.json
tests/supabase/db-function/activate-budget-dataset-release.test.ts
tests/supabase/rls/default-deny.test.ts
```

### Phase 2: 公開データアクセス

```text
web/src/features/budget/server/repositories/*
web/src/features/budget/server/loaders/*
web/src/features/budget/shared/types/*
web/src/features/budget/shared/utils/*
```

### Phase 3: 画面と検索

```text
web/src/app/(main)/budget/page.tsx
web/src/app/(main)/budget/programs/[identityId]/page.tsx
web/src/features/budget/server/components/*
web/src/features/budget/client/components/*
web/src/lib/routes.ts
web/src/lib/routes.test.ts
web/src/features/primary-navigation/*
web/package.json
pnpm-lock.yaml
```

`web/package.json` とlockfileの変更は、Rechartsを実際に導入するPhaseだけで行う。

### Phase 4: AI

```text
web/src/app/api/budget/search/route.ts
web/src/features/budget/server/services/budget-search-service.ts
web/src/features/budget/server/services/budget-ai-context-service.ts
web/src/features/budget/shared/*
```

### Phase 5以降: 議員質問リンク・管理

```text
supabase/migrations/<timestamp>_create_budget_question_links.sql
admin/src/app/(protected)/budget-links/page.tsx
admin/src/features/budget-links/*
admin/src/lib/routes.ts
admin/src/lib/routes.test.ts
```

## 18. リスク

| リスク | 影響 | 対応 |
| --- | --- | --- |
| upstreamと世田谷版の大きな分岐 | 世田谷改修消失、巨大な無関係差分 | 各Phaseでbaseを再確認し、統合作業を分離 |
| JSONとCSVの二重正本化 | 金額・件数の不整合 | 一方だけ投入し、他方は検証に使う |
| 途中失敗した投入 | 本番が半分だけ新データになる | release単位投入とactive切替RPC |
| `(1)` / `(2)` ファイル誤選択 | 古いデータ投入 | manifest hashで一意選択 |
| programとsectionの誤結合 | 市民・AIへの誤説明 | sectionはbudget item FKだけにする |
| allocationの金額フロー化 | 架空の配分額を表示 | DB check、型、UI、AI制約 |
| 日本語検索の過剰なfuzzy match | 関係のない事業を提示 | exact/substring/trigramを段階評価 |
| raw検索語の保存 | 政治的関心の過剰収集 | 初期は保存しない |
| 0円項目の削除 | 廃止会計・履歴を失う | DBへ保持し表示filterで制御 |
| editorロール不在 | 管理権限が広すぎる | 初期admin限定、後で共通permission追加 |
| グラフだけの表示 | アクセシビリティ低下 | HTML一覧を正、chartを補助 |
| E2E不在 | 主要導線の回帰 | UI PhaseでPlaywright導入を判断 |

## 19. 大きな設計判断

| 論点 | 推奨初期値 | 決定時期 |
| --- | --- | --- |
| 公開ルート | `/budget` | Phase 1前 |
| 事業URL主キー | `budget_program_identity_id` | 確定推奨 |
| DB投入対象 | 公開6ファイル + manifestのみ | 確定推奨 |
| 年度更新 | release追加後に原子的切替 | Phase 1 |
| 検索 | 構造filter + exact + pg_trgm | Phase 2 |
| Embedding | 品質計測後に追加 | 後続 |
| グラフ | Recharts、一覧の補助 | UI Phase |
| allocation表示 | 金額なしの関係表示 | 確定 |
| モバイル主要ナビ | 予算を5番目に追加 | UI Phaseで実機確認 |
| 編集権限 | 初期adminのみ | 管理UI Phase |
| raw検索語ログ | 保存しない | 確定推奨 |

## 20. 次Phaseへ進む条件

Phase 1のDB・投入CLIへは進める状態である。着手前に最低限、次を明示する。

1. Phase 1も `setagaya/main` 最新を起点にすること
2. 最初の投入先はlocal Supabaseだけであること
3. production投入は別の明示指示まで行わないこと
4. migration名とテーブル名をレビューすること
5. active release切替を含む統合テストを先に定義すること

UIのナビ位置、Recharts追加、予算AI、管理者以外の編集権限は、
Phase 1のDB投入を妨げないため後続判断にできる。
