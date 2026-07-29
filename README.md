# みらい議会

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

## 令和8年度予算データ

世田谷区令和8年度当初予算の歳出・歳入を、一般会計と特別会計で共通のデータ基盤へ生成します。金額単位はすべて千円です。

### 対象会計

| account_code | 会計名 | status |
| --- | --- | --- |
| `general` | 一般会計 | `active` |
| `national_health_insurance` | 国民健康保険事業会計 | `active` |
| `latter_stage_elderly_healthcare` | 後期高齢者医療会計 | `active` |
| `long_term_care_insurance` | 介護保険事業会計 | `active` |
| `school_lunch_fee` | 学校給食費会計 | `abolished_zero` |

学校給食費会計は令和8年度に廃止された0円会計として扱い、PDFから節を抽出しません。

### 入力ファイル

| パス | 内容 |
| --- | --- |
| `raw/ippansaisyutu.csv` | 公式歳出CSV。事業別の当初予算額を生成する正本 |
| `raw/ippansainyu.csv` | 公式歳入CSV。款・項・目・節・細節・所属単位の予算額と歳入源を生成する正本 |
| `raw/r8tousyoyosanallpage.pdf` | 令和8年度当初予算説明書。歳出の節別内訳と、歳入細節に記載された「充当事業」の根拠 |
| `config/budget-accounts.json` | 対象会計、会計コード、期待金額、PDFページ範囲 |
| `config/department_name_map.csv` | 公式CSVの内部部署名と市民向け表示名の根拠付き対応 |

### 出力ファイル

| パス | 内容 |
| --- | --- |
| `processed/budget_programs.csv` | 公式CSV由来の事業別予算 |
| `processed/raw_pdf_sections.csv` | 一般会計のPDF節抽出中間データ |
| `processed/raw_pdf_sections_special.csv` | 特別会計3会計のPDF節抽出中間データ |
| `processed/budget_sections.csv` | PDF由来の正規化済み節別予算 |
| `processed/budget_items.csv` | 款・項・目単位の事業合計と節合計の照合結果 |
| `processed/budget_revenue_details.csv` | 公式歳入CSV由来の細節×所属単位データ |
| `processed/budget_revenue_sections.csv` | 歳入detailsを節単位へ集約したデータ |
| `processed/budget_revenue_items.csv` | 歳入detailsを款・項・目単位へ直接集約し、sectionsと突合したマスタ |
| `processed/public/public_budget_program_identities.csv` | 市民向けの予算事業identity単位で検索・詳細表示・歳入相互リンクに使う公開マスタ |
| `processed/public/public_budget_programs.csv` | 財源列と内部部署名を除いた市民向け事業データ。各行から公開identityを参照できる |
| `processed/public/public_budget_items.json` | 目単位で事業と節を兄弟配列にした公開用リードモデル |
| `processed/public/public_budget_revenue_details.csv` | 内部部署名と査定情報を除いた市民向け歳入細節データ |
| `processed/public/public_budget_revenue_items.json` | 歳入の目単位で節と細節を兄弟配列にした公開用リードモデル |
| `processed/public/public_budget_revenue_allocations.json` | 歳入細節と歳出予算事業の金額を持たない公開用関係データ |
| `processed/public/public_dataset_manifest.json` | 公開用6ファイルのハッシュ、件数、合計、参照整合性を固定したリリース・監査用メタデータ |
| `processed/raw_pdf_revenue_allocations.csv` | 歳入PDFの「充当事業」を会計ごとに連続抽出した中間データ |
| `processed/staging/revenue_allocation_source_matches.csv` | PDFの歳入細節を公式歳入CSVの `revenue_detail_id` へ接続したステージングデータ |
| `processed/budget_program_groups.csv` | 内訳事業を予算事業単位へ集約した充当先候補マスタ |
| `processed/budget_program_identities.csv` | 公式PDF上で識別可能な予算事業同一性の単位 |
| `processed/budget_program_identity_members.csv` | identityと内部予算事業groupの所属関係 |
| `processed/budget_revenue_allocations.csv` | 歳入細節と歳出予算事業identityの関係データ。内部groupは一意な場合だけ保持し、金額配分は持たない |
| `processed/staging/revenue_allocation_group_ambiguities.csv` | 公式PDFでは区別できない内部group候補を将来精緻化用に保持 |
| `processed/revenue_allocation_validation_errors.csv` | 歳入3テーブル・PDF充当関係・歳出事業接続の総合検証エラー |
| `processed/revenue_validation_errors.csv` | 歳入3テーブルの集約・金額・ID・元CSV復元に関する検証エラー |
| `config/revenue_allocation_source_overrides.csv` | 歳入細節側の手動確認設定 |
| `config/revenue_allocation_target_overrides.csv` | identityまで決まらない真の未解決候補と手動確認設定 |
| `processed/validation_errors.csv` | 全会計検証で見つかったエラー |
| `processed/dataset_manifest.json` | 入力ハッシュ、行列数、会計別合計、再生成コマンド |
| `docs/budget_data_dictionary.md` | 列定義、データ間の関係、財源データの利用上の注意 |
| `docs/department_mapping_report.md` | 部署名マッピング件数、照合方法、要確認一覧 |
| `docs/public_budget_usage_rules.md` | 画面表示・検索・AI回答で守る公開利用ルール |
| `docs/public_budget_revenue_usage_rules.md` | 公開歳入・充当関係の表示、検索、AI回答で守る利用ルール |
| `docs/pdf_revenue_allocation_full_extraction_report.md` | 歳入PDF充当事業のページ別抽出・検証レポート |
| `docs/revenue_allocation_source_match_report.md` | PDF歳入細節と公式歳入CSVの接続結果 |
| `docs/revenue_allocation_target_match_report.md` | 歳入細節と歳出予算事業グループの接続結果 |
| `docs/revenue_allocation_identity_resolution_report.md` | PDF上の予算事業identityによる内部group曖昧性の解決結果 |
| `docs/revenue_allocation_validation_report.md` | 歳入・歳出事業接続を含むPhase 30総合検証レポート |
| `docs/revenue_validation_report.md` | 歳入details・sections・itemsの総合検証レポート |
| `docs/budget_revenue_data_dictionary.md` | 歳入3テーブルと充当関係の粒度・結合・利用禁止事項 |
| `docs/validation_report.md` | 会計別・全体の検証レポート |

`budget_programs.csv`、`budget_sections.csv`、`budget_items.csv` は一般会計と特別会計を同じファイルで扱い、`account_code` で区別します。`budget_sections.csv` はPDF由来データだけを保持し、0円会計・0円項目の補完行は追加しません。

`budget_item_key` は年度・会計・予算区分・款・項・目を結ぶ共通キーです。たとえば `2026_general_expenditure_01_01_01` は、2026年度・一般会計・歳出・款01・項01・目01を表します。事業と節を直接1対1に結ばず、どちらもこのキーで同じ「目」にぶら下げます。

`general_revenue_thousand_yen` と `allocated_revenue_thousand_yen` は公式CSVの原値ですが、PDFで検証された個別事業の財源内訳ではありません。市民向け画面やAI回答へそのまま使用せず、詳しい制約は [`docs/budget_data_dictionary.md`](docs/budget_data_dictionary.md) を参照してください。負数と0円も原データのまま保持します。

`budget_programs.csv` の `department_name` は公式CSVの内部部署名を変更せず保持します。市民向けには `department_display_name` を使用できますが、`department_mapping_status=needs_review` の行は自動表示せず、`config/department_name_map.csv` の根拠を確認してください。

公開画面とAI回答では `processed/public` 配下の派生データだけを使います。歳出公開モデルは `general_revenue_thousand_yen` と `allocated_revenue_thousand_yen` を含まず、個別事業の財源内訳を推論しません。節は個別事業ではなく `budget_item_key` が示す「目」全体の内訳です。詳細は [`docs/public_budget_usage_rules.md`](docs/public_budget_usage_rules.md) を参照してください。

### 歳入データの役割

歳入は次の3層で保持します。

| テーブル | 粒度 | 主な役割 |
| --- | --- | --- |
| `budget_revenue_details.csv` | 細節×所属 | 公式CSVの原レコード、歳入源、前年度額、現計予算額、出典行 |
| `budget_revenue_sections.csv` | 節 | detailsの集約、一般財源・特定財源・特別会計歳入の検証 |
| `budget_revenue_items.csv` | 款・項・目 | 歳入目の詳細表示・検索・集約検証の基準 |

`revenue_item_key` は年度・会計・`revenue`・款・項・目を結ぶキーです。例: `2026_general_revenue_12_01_01`。`revenue_section_id` はその目の節、`revenue_detail_id` はさらに細節と所属を識別します。

一般会計では公式CSVの財源区分に基づき「一般財源」と「特定財源」を表示できます。特別会計ではこの二分を使わず、保険料、繰入金、国庫支出金、都支出金など `source_funding_category_name` の歳入源として表示します。

### PDF充当関係

公式PDFの「充当事業」は、歳入細節と歳出予算事業の関連を示す根拠です。`budget_revenue_allocations.csv` は1記載につき1行の関係テーブルで、配分額を持ちません。

- `allocation_amount_thousand_yen` は全件空欄
- 公開JSONの `allocationAmountThousandYen` は全件 `null`
- 1つの歳入細節が複数事業に関連する場合がある
- 歳入細節の金額を各targetへコピーしない
- allocationsを合計しない
- allocationを金額付きサンキー図や事業別財源額に使わない

関連があることと、その歳入全額が当該事業へ充当されることは同義ではありません。公式PDFで内部予算事業groupを区別できない39件は、groupを推測せず `public_identity` として保持します。

### 当初予算の範囲

このデータは令和8年度当初予算です。実際に収入・支出された金額、決算額、契約額、支払先、事業者、不用額、繰越額を示しません。当初予算を実績として表示したり、配分額が不明な関係から「この事業に○円使われる」と断定したりしてはいけません。

### 実行コマンド

入力ファイルを所定のパスに置き、初回だけPDF抽出用Python環境を準備します。その後、リポジトリ直下で各コマンドを実行します。

```bash
# 初回のみ
pnpm budget:setup

# 個別生成
pnpm budget:programs
pnpm budget:raw-sections:general
pnpm budget:raw-sections:special
pnpm budget:sections
pnpm budget:items
pnpm budget:validate
pnpm budget:manifest

# コア成果物を順番に再生成
pnpm budget:build-all

# 検証済みコア3CSVから公開用データを派生生成
pnpm budget:public

# 公式歳入CSVから3層のコアデータを生成・検証
pnpm budget:revenue:details
pnpm budget:revenue:sections
pnpm budget:revenue:items
pnpm budget:revenue:validate

# PDF充当事業のサンプル抽出。build-allには含まれない
pnpm budget:revenue:allocations:sample
pnpm budget:revenue:allocations:extended-sample

# PDF全範囲抽出、歳入細節接続、歳出事業接続、総合検証
pnpm budget:revenue:allocations:raw
pnpm budget:revenue:allocations:match-source
pnpm budget:revenue:allocations:link
pnpm budget:revenue:allocations:validate

# 検証済み歳入・充当関係から公開用3ファイルを生成
pnpm budget:revenue:public

# 公開allocation生成後に、公開用予算事業identityとprogram参照を生成
pnpm budget:public:program-identities

# 公開用6ファイルを検証して公開専用manifestを生成
pnpm budget:public:manifest

# サンプル以外の歳入工程、公開identity、2種類のmanifestを順番に一括再生成
pnpm budget:revenue:build-all
```

`budget:build-all` は事業、一般会計PDF中間データ、特別会計PDF中間データ、節、目、全体検証、dataset manifestの順に実行します。途中の検証が失敗した場合はその時点で終了します。公開用データは、検証済みのコア3CSVを入力として `budget:public` で生成します。

`budget:public:program-identities` は、非公開の予算事業identity・member・groupを相互検算して公開用identityマスタを生成し、`public_budget_programs.csv` の既存20列を変更せず末尾に `budget_program_identity_id` を追加します。歳入allocationの1,948関係をidentityへ照合し、公式PDFで内部groupを区別できない39関係も公開identityまで接続します。

`budget:public:manifest` は、本番投入対象の公開用6ファイルだけを対象に、SHA-256、CSV行列数、JSON件数、会計別歳入・歳出合計、identity・歳入detail参照、allocationの金額非帰属を検証します。出力はリリース・監査、データバージョン表示、キャッシュ更新判定に使い、画面検索やAI回答の業務データには使用しません。

`budget:revenue:build-all` は、details、sections、items、歳入コア検証、PDF全範囲抽出、source match、予算事業group、allocation link、allocation検証、歳入公開用3ファイル、公開用予算事業identityの順に実行します。最後に生成基盤用 `dataset_manifest.json`、公開リリース用 `public_dataset_manifest.json` の順で更新します。サンプル抽出は含みません。途中でFAILになった場合は後続工程を実行せず、歳出コア3CSVの開始前後ハッシュが異なる場合も失敗します。

`budget:revenue:allocations:raw` は、PDF物理67ページを含む25ページ固定ゲートを先に検証し、通過した場合だけ4会計の歳入範囲を連続処理します。この中間データ自体は `revenue_detail_id` や歳出事業へ結合しません。後続コマンドが別成果物として接続し、原本を保持します。

`budget:revenue:allocations:link` は、source matchから予算事業group候補を再計算し、公式資料上で識別可能な `budget_program_identity_id` へ接続します。内部groupまで一意な関係だけ `budget_program_group_id` を保持し、PDFでは区別できない関係はgroup IDを空欄のまま `public_identity` として扱います。その候補は `revenue_allocation_group_ambiguities.csv` に残し、金額や類似度から自動補完しません。既存の最終allocationを再入力に使わないため、rawから再生成できます。

`budget:revenue:allocations:validate` は、歳入CSV検証を公式CSVまで遡って再実行し、raw PDF行との1対1対応、ページ範囲、歳入・歳出参照、source-target重複、金額非帰属、歳出コア3CSVの固定ハッシュをまとめて検証します。`public_identity` のgroup ID空欄は公式資料の識別限界を保持した正常状態として扱います。

`budget:revenue:public` は、検証済みの歳入3テーブルと充当関係から公開用リードモデルを生成します。一般会計は一般財源・特定財源、特別会計は保険料・繰入金・国庫支出金などの歳入源別に表示します。allocationは関係だけを保持し、配分額は全件`null`です。公式PDFで内部groupを区別できない関係は、group IDを補完せず`public_identity`として保持します。

### 翌年度への差し替え

1. 新年度の公式歳出CSV、公式歳入CSV、予算説明書PDFを `raw/` へ配置する。
2. `config/budget-accounts.json` の `fiscal_year`、会計、期待額、歳出・歳入PDF範囲を公式資料で更新する。
3. コード内の年度固有の期待行数・総額・固定回帰ページとテストfixtureを、新年度の入力確認結果に基づいて更新する。
4. `department_name_map.csv` は新年度のraw部署名を全件照合し、根拠のない名称を推測しない。
5. 前年度のoverrideを自動で引き継がず、いったんヘッダーのみから開始する。必要な行だけ新年度PDF・CSVで再確認する。
6. PDFサンプル2コマンドを先に実行し、改行、ページ継続、複数事業、冊子ページ対応を回帰確認する。
7. 歳出 `pnpm budget:build-all` と歳入 `pnpm budget:revenue:build-all` を実行し、両方のエラーCSVがヘッダーのみ、manifestの入力ハッシュ・会計別合計・行数が新年度期待値と一致することを確認する。
8. 公開用6ファイルをstagingへ投入して検証してから、本番データを切り替える。

年度を変えるとIDの年度部分も変わります。旧年度IDへ上書きせず、年度別データとして保持してください。

### 手動override

自動照合が `ambiguous` または `unmatched` になった場合だけ、公式資料の根拠を確認してoverrideを使います。

- source側は `config/revenue_allocation_source_overrides.csv` の `selected_revenue_detail_id` を使用する
- target側は `config/revenue_allocation_target_overrides.csv` の `selected_budget_program_group_id` を使用する
- `override_note` にPDFページ、CSV行、判断根拠を記録する
- 同一会計・同一階層・対象ページの候補外へ接続しない
- 名称の意味的類似、歳入額、歳出額、財源額だけで選ばない
- 修正後はsourceなら `pnpm budget:revenue:allocations:match-source`、targetなら `pnpm budget:revenue:allocations:link` から再実行し、最後に `pnpm budget:revenue:allocations:validate` を通す

39件の `public_identity` は真の未解決ではなく、公式PDFが内部groupを区別しない正常状態です。これらへ `selected_budget_program_group_id` を記入してはいけません。現在の両overrideファイルはヘッダーのみです。

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
