# 令和8年度当初予算 公開用データ利用ルール

## 対象範囲

この文書の対象は、令和8年度当初予算の歳出公開モデルです。歳入公開モデルと充当関係のルールは `docs/public_budget_revenue_usage_rules.md` を参照してください。

- 一般会計
- 国民健康保険事業会計
- 後期高齢者医療会計
- 介護保険事業会計
- 学校給食費会計（廃止・0円会計）

実支出、決算、契約、支払先・業者情報は対象外です。この歳出公開モデル単体から個別事業の財源内訳を推論してはいけません。

## コアデータと公開モデル

| データ | 役割 |
| --- | --- |
| `budget_programs.csv` | 公式CSV由来の事業別予算 |
| `budget_sections.csv` | 公式PDF由来の、款・項・目のうち「目」全体の節別内訳 |
| `budget_items.csv` | 事業合計と節合計を款・項・目単位で結ぶマスタ |
| `public_budget_program_identities.csv` | 市民向けの予算事業identity単位の検索・詳細・歳入相互リンク用マスタ |
| `public_budget_programs.csv` | 画面・検索で利用可能な許可列だけを持つ事業データ |
| `public_budget_items.json` | 目単位の詳細表示・AIコンテキスト用リードモデル |

公開モデルはコア3CSVから派生生成します。コアCSVの行、列、値、IDは変更しません。

公開identityは、公式PDF上で同一に見える予算事業をまとめた単位です。内部の `budget_program_group_id` をPDFから区別できない場合も、推測で1件へ絞らず公開identityまでを確定します。公開identity CSVには内部部署名、正規化名、候補group一覧、監査メモを含めません。

## 事業と節の関係

`budget_programs` と `budget_sections` は直接1対1対応しません。両者は `budget_item_key` によって同じ「目」に属します。

`public_budget_items.json` では、`programs` と `sections` をbudget item直下の兄弟配列として配置します。個別programの中にsectionsを配置してはいけません。

sectionの `scope` は全件 `budget_item` です。これは節が個別事業の費目内訳ではなく、目全体の費目内訳であることを示します。特定の委託料、工事請負費などを個別事業へ割り当てたり、按分したりしてはいけません。

## 財源情報

財源内訳はまだ公開しません。

- `general_revenue_thousand_yen` を公開用データに使用しない
- `allocated_revenue_thousand_yen` を公開用データに使用しない
- 上記2列や他のコア列から、国費・都費・一般財源の金額を推論しない
- 個別事業の財源構成を画面表示やAI回答で断定しない

財源内訳は、将来の歳入予算データ化および財源充当データ整備フェーズで追加します。

`public_budget_items.json` の `dataAvailability.funding` は全件 `pending_revenue_phase` とします。

## 当初予算から回答できない情報

このデータから次の情報を表示・推論してはいけません。

- 実際に支出した金額、執行額
- 決算額、不用額、繰越額
- 契約額、契約内容
- 支払先、事業者名、業者名
- 個別事業ごとの委託料、工事費、その他の節別内訳

回答不能時は次のreason codeを返します。

| reasonCode | 対象 |
| --- | --- |
| `FUNDING_DATA_PENDING_REVENUE_PHASE` | 国費・都費・一般財源などの財源質問 |
| `PROGRAM_SECTION_MAPPING_NOT_AVAILABLE` | 個別事業ごとの節・委託料・工事費の質問 |
| `ACTUAL_SPENDING_NOT_AVAILABLE` | 実支出・執行額の質問 |
| `SETTLEMENT_DATA_NOT_AVAILABLE` | 決算・不用額・繰越額の質問 |
| `CONTRACT_DATA_NOT_AVAILABLE` | 契約額・契約情報の質問 |
| `VENDOR_DATA_NOT_AVAILABLE` | 支払先・会社・業者の質問 |

## AI回答に必ず含める制約

AI回答用コンテキストには、次の3文を改変せず含めます。

> budget_sectionsはbudget_item_key単位、すなわち款・項・目のうち『目』全体の節別内訳です。個々のbudget_programの節別内訳ではありません。

> 財源内訳は、歳入予算データおよび財源充当データの整備後に提供予定です。現在のデータから国費・都費・一般財源の金額を推論してはいけません。

> このデータは当初予算であり、実際の支出額・決算額・契約額・支払先を示すものではありません。

## 回答可能な範囲

公開モデルから回答できる情報は次のとおりです。

- 会計
- 款・項・目
- 事業名と当初予算額
- 目全体の当初予算額
- 目全体の節別計上額
- 市民向け担当部署名
- 公式CSVのファイル名と元行番号
- 公式PDFのファイル名、PDFページ、予算書ページ

部署表示名が未整備の場合は空欄または `null` とします。内部略称である `department_name` を市民向け表示へ転用したり、正式名称を推測したりしてはいけません。

## 0円事業

0円事業と `ok_zero_amount` のbudget itemは公開モデルに保持します。

- 通常の検索では `is_zero_amount=true` の事業を除外する
- `includeZeroAmount=true` の場合だけ0円事業を検索結果へ含める
- 元データや公開成果物から0円事業を削除しない

## 出典参照

事業は公式CSVの `sourceFile` と `sourceRowNumber`、節は公式PDFの `sourceFile`、`pdfPage`、`budgetBookPage` を保持します。budget item自体には `sourceType=derived` を含めます。

出典参照は追跡のための情報であり、事業と節の直接対応を示すIDではありません。

`public_budget_programs.csv` の各行は `budget_program_identity_id` で公開identityを参照します。このIDは検索・詳細表示・歳入関係の相互リンクに使用できますが、個別programとsectionの対応を示すものではありません。

## 生成と利用API

```bash
pnpm budget:public
pnpm budget:public:program-identities
pnpm budget:public:manifest
```

主な関数：

- `searchPublicBudgetPrograms(query, options)`
- `getPublicBudgetItemDetail(budgetItemKey, budgetItems)`
- `buildBudgetAiContext(queryResult)`

公開画面とAI回答ではコアCSVを直接参照せず、公開モデルを利用します。

`public_dataset_manifest.json` は公開用6ファイルのリリース・監査用メタデータです。本番投入前の整合性確認、データバージョン表示、キャッシュ更新判定には利用できますが、画面・検索インデックス・AI回答コンテキストの業務データとして取り込んではいけません。
