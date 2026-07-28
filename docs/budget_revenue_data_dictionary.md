---
title: "令和8年度当初予算 歳入・充当関係データ辞書"
updated: 2026-07-29
tags:
  - みらい議会
  - 世田谷区
  - 予算
  - データ辞書
related:
  - 世田谷区令和8年度予算データ基盤
---

# 令和8年度当初予算 歳入・充当関係データ辞書

## 対象

令和8年度世田谷区当初予算の歳入と、公式予算説明書に記載された「充当事業」の関係を扱う。当初予算であり、実際の収入額、支出額、決算額、契約額、支払先を示すデータではない。

対象会計は一般会計、国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計。学校給食費会計は令和8年度の`abolished_zero`会計であり、CSVには0円行を保持するがPDF充当事業抽出の対象外とする。

## テーブルと粒度

| テーブル | 粒度 | 主キー | 由来・役割 |
| --- | --- | --- | --- |
| `budget_revenue_details.csv` | 歳入の細節×所属 | `revenue_detail_id` | 公式歳入CSV由来。歳入番号、財源区分、予算額、充当・未充当額と出典行を保持する |
| `budget_revenue_sections.csv` | 歳入の款・項・目・節 | `revenue_section_id` | detailsを節単位に集約した派生データ |
| `budget_revenue_items.csv` | 歳入の款・項・目 | `revenue_item_key` | detailsを目単位に直接集約し、sectionsとも独立突合した派生データ |
| `raw_pdf_revenue_allocations.csv` | PDFの「充当事業」記載1件 | `raw_allocation_id` | 公式PDF由来の中間データ。1細節に複数事業があれば複数行になる |
| `budget_program_groups.csv` | 歳出の予算事業 | `budget_program_group_id` | 内訳事業を予算事業単位に集約した充当先候補 |
| `budget_program_identities.csv` | 公式PDF上で識別可能な歳出予算事業 | `budget_program_identity_id` | PDFで内部groupを区別できない場合に、公開資料の識別限界を保つ派生単位 |
| `budget_revenue_allocations.csv` | 歳入細節と歳出予算事業の関係1件 | `allocation_link_id` | 歳入と歳出事業に関係があることだけを表す関係テーブル |

## 集約階層

`budget_revenue_details`は細節×所属、`budget_revenue_sections`は節、`budget_revenue_items`は目の単位である。detailsからsections・itemsへ金額を集約できるが、`budget_revenue_allocations`は金額集約の経路ではない。

## 充当関係の意味

- `budget_revenue_allocations`は、公式PDFに「充当事業」として記載された歳入細節と歳出予算事業の関係を表す。
- 関係があることと、その歳入細節の全額が当該事業へ充当されることは同義ではない。
- 1つの歳入細節から複数の歳出事業へ関係する場合がある。
- `allocation_amount_thousand_yen`は全行空欄で、`amount_attribution_status`は`not_available`である。
- 歳入細節の金額を複数targetへ複製せず、配分額を推測しない。
- allocation行を合計してはいけない。件数は関係数であり、金額ではない。

## target解決レベル

| target_resolution_level | 意味 | group ID |
| --- | --- | --- |
| `exact_group` | 公式資料から内部の予算事業groupまで一意に確定 | `target_budget_program_group_id`を保持 |
| `public_identity` | 公式資料上は予算事業を特定できるが、複数の内部groupを区別不能 | group IDは空欄、`target_budget_program_identity_id`のみ保持 |

`public_identity`を推測で1つのgroupへ補完してはいけない。追加の公式資料が得られた場合だけ、根拠を記録して精緻化する。

## 金額利用

- 予算額の集計には`budget_revenue_details`、`budget_revenue_sections`、`budget_revenue_items`を粒度に応じて使用する。
- `budget_revenue_allocations`を金額集計に使用しない。
- 複数target一覧に歳入細節額を表示する場合も、参考情報として1回だけ表示し、targetごとの配分額と表現しない。
- 当初予算の額は、実際の収入額・支出額・決算額ではない。

## 安全な結合

- 歳入明細: `budget_revenue_allocations.revenue_detail_id` → `budget_revenue_details.revenue_detail_id`
- 歳出の公開資料単位: `target_budget_program_identity_id` → `budget_program_identities.budget_program_identity_id`
- 内部group: `target_resolution_level=exact_group`の行だけ、`target_budget_program_group_id` → `budget_program_groups.budget_program_group_id`
- `public_identity`行ではgroup IDが空欄であることを正常として扱う

## 禁止事項

- allocationの行数や歳入細節額をtarget別に合計する
- 1歳入細節の全額が各targetへ充当されると説明する
- 複数targetへ同じ歳入額を付与する
- 公式PDFで区別不能な内部groupを名称類似度、歳入額、歳出額から推測する
- 当初予算から実収入、実支出、決算、契約、事業者を推論する

## 品質保証

`revenue_allocation_validation_errors.csv`がヘッダーのみで、`revenue_allocation_validation_report.md`がPASSのとき、Phase 24の歳入3テーブル、PDF行との対応、参照整合性、ページ範囲、金額非帰属、歳出コア不変性が確認済みである。
