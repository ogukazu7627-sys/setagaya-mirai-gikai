# 世田谷区令和8年度当初予算 データ辞書

- スキーマバージョン: `1.2.0`
- 対象年度: 2026年度
- 金額単位: 千円
- 対象: 一般会計および対象特別会計の歳出当初予算

## データセットの関係

| ファイル | データの由来 | 粒度 | 役割 |
| --- | --- | --- | --- |
| `processed/budget_programs.csv` | 世田谷区公式CSV | 内訳事業 | 事業別予算額と公式CSV原値の保持 |
| `processed/budget_sections.csv` | 世田谷区公式PDF | 節 | 予算説明書の節別金額の保持 |
| `processed/budget_items.csv` | 上記2ファイルから派生 | 款・項・目 | 事業合計と節合計の突合 |

`budget_programs` と `budget_sections` は、どちらも
`budget_item_key` で款・項・目に属するが、相互に直接1対1対応しない。
事業と節を直接結び付けたり、特定の事業額を特定の節金額の内訳として扱ったり
してはならない。

## 金額と財源データの注意

- `amount_thousand_yen` は公式資料と照合済みの予算額として使用できる。
- `general_revenue_thousand_yen` と
  `allocated_revenue_thousand_yen` は公式CSVに記載された原値である。
- 上記2列は、公式PDFで検証された個別事業の財源内訳ではない。
- 上記2列を、そのまま市民向け画面やAI回答の財源説明に使用してはならない。
- `funding_data_status=raw_source_only` は、この利用制限を機械可読に示す。
- 金額が負数でも原データとして保持し、0への置換、再計算、補正を行わない。
- 0円事業・0円項目は削除せず、`is_zero_amount` で識別する。

## 共通キー

`budget_item_key` は
`年度_account_code_予算区分_款コード_項コード_目コード` の形式である。

例:

```text
2026_general_expenditure_02_01_04
```

このキーは事業と節が同じ款・項・目に属することを示す。事業と節の直接対応を
示すものではない。

## budget_programs.csv

公式CSV `raw/ippansaisyutu.csv` から生成する。既存19列の後ろに、
出典追跡と誤用防止の9列、さらに市民向け部署表示の2列を追加している。

| 列 | 型 | 定義 |
| --- | --- | --- |
| `program_id` | string | 年度・会計・款・項・目・大事業・予算事業・内訳事業の一意ID |
| `budget_item_key` | string | 款・項・目単位の共通キー |
| `fiscal_year` | integer | 年度 |
| `account_code` | string | 会計コード |
| `account_name` | string | 会計名称 |
| `budget_side` | string | `expenditure` |
| `kan_code` | string | 款コード、2桁 |
| `kan_name` | string | 款名称 |
| `kou_code` | string | 項コード、2桁 |
| `kou_name` | string | 項名称 |
| `moku_code` | string | 目コード、2桁 |
| `moku_name` | string | 目名称 |
| `major_program_name` | string | 大事業名称 |
| `budget_program_name` | string | 予算事業名称 |
| `detail_program_name` | string | 内訳事業名称 |
| `department_name` | string | 所属名称 |
| `amount_thousand_yen` | integer | 公式CSVの予算見積額 |
| `general_revenue_thousand_yen` | integer | 公式CSVの一般財源額原値 |
| `allocated_revenue_thousand_yen` | integer | 公式CSVの充当額原値 |
| `major_program_code` | string | 公式CSVの大事業コード、2桁 |
| `budget_program_code` | string | 公式CSVの予算事業コード、2桁 |
| `detail_program_code` | string | 公式CSVの内訳事業コード、2桁 |
| `budget_program_group_id` | string | 内訳事業より1階層上の予算事業単位ID |
| `source_type` | string | 固定値 `official_csv` |
| `source_file` | string | 実際に読み込んだ公式CSVのファイル名 |
| `source_row_number` | integer | ヘッダーを除く元CSVの1始まり論理データ行番号 |
| `is_zero_amount` | boolean | `amount_thousand_yen=0` のとき `true` |
| `funding_data_status` | string | 固定値 `raw_source_only` |
| `department_display_name` | string | 公式CSVのraw部署名を保持したまま追加する市民向け表示名 |
| `department_mapping_status` | string | `matched`、`already_display`、`needs_review` |

`source_row_number` はフィルタ後の連番ではない。元CSVを論理レコードとして
読み込んだ配列の位置に対応し、元レコードと既存19列を復元するために使う。

`department_name` は公式CSVの原値であり変更しない。
`department_display_name` は `config/department_name_map.csv` を使って付与する。
`＊`より後ろの課・担当名は原文のまま保持し、前半の省略組織名はPDF説明欄の
事業名・金額・`budget_item_key`と照合できた場合だけ正式な親組織名へ置き換える。
`department_mapping_status=needs_review` の行は市民向け表示へ自動利用しない。

## budget_sections.csv

公式PDF `raw/r8tousyoyosanallpage.pdf` から抽出した節データである。
0円補完行は追加しない。

| 列 | 型 | 定義 |
| --- | --- | --- |
| `section_id` | string | 全会計で一意な節行ID |
| `budget_item_key` | string | 款・項・目単位の共通キー |
| `fiscal_year` | integer | 年度 |
| `account_code` | string | 会計コード |
| `account_name` | string | 会計名称 |
| `budget_side` | string | `expenditure` |
| `kan_code` / `kan_name` | string | 款コード・名称 |
| `kou_code` / `kou_name` | string | 項コード・名称 |
| `moku_code` / `moku_name` | string | 目コード・名称 |
| `setsu_code` / `setsu_name` | string | 節コード・名称 |
| `amount_thousand_yen` | integer | PDFから抽出し目合計と照合した節金額 |
| `budget_book_page` | integer | 予算説明書の冊子ページ |
| `pdf_page` | integer | PDFファイル上のページ |
| `source_file` | string | 公式PDFのファイル名 |
| `source_type` | string | 固定値 `official_pdf` |

## budget_items.csv

`budget_programs` と `budget_sections` の `budget_item_key` の和集合を取り、
款・項・目単位で金額を突合した派生データである。

| 列 | 型 | 定義 |
| --- | --- | --- |
| `budget_item_key` | string | 款・項・目単位の一意キー |
| `fiscal_year` | integer | 年度 |
| `account_code` / `account_name` | string | 会計コード・名称 |
| `budget_side` | string | `expenditure` |
| `kan_code` / `kan_name` | string | 款コード・名称 |
| `kou_code` / `kou_name` | string | 項コード・名称 |
| `moku_code` / `moku_name` | string | 目コード・名称 |
| `program_total_amount_thousand_yen` | integer | 同じキーの事業額合計 |
| `section_total_amount_thousand_yen` | integer | 同じキーの節額合計 |
| `diff_amount_thousand_yen` | integer | 事業合計から節合計を引いた差額 |
| `validation_status` | string | `ok`、`ok_zero_amount`、またはエラー状態 |
| `program_row_count` | integer | 集計対象の事業行数 |
| `section_row_count` | integer | 集計対象の節行数 |
| `source_type` | string | 固定値 `derived` |
| `is_zero_amount` | boolean | `validation_status=ok_zero_amount` のとき `true` |

## dataset_manifest.json

`processed/dataset_manifest.json` は、スキーマバージョン、入力ファイルの
SHA-256、出力ファイル、行列数、会計別合計、全会計合計、再生成コマンドを
保持する。再現性を保つため、実行日時など実行ごとに変化する値は含めない。
入力ハッシュには `config/department_name_map.csv` も含める。

## 関連資料

- [入力ファイルプロファイル](budget_data_input_profile.md)
- [PDF節抽出ノート](pdf_section_extraction_notes.md)
- [全会計検証レポート](validation_report.md)
