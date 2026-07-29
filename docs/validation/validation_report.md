# 世田谷区令和8年度当初予算 全会計データ検証レポート

- 検証日: 2026-07-29
- 金額単位: 千円
- 期待総額: `621,033,664`

## 最終判定

**PASS**

検出エラーは 0 件。

## 入力ファイル一覧

| ファイル | 用途 |
| --- | --- |
| `processed/core/budget_programs.csv` | 公式CSV由来の全会計事業別予算 |
| `processed/core/budget_sections.csv` | PDF由来の全会計節別予算 |
| `processed/core/budget_items.csv` | 全会計の款・項・目単位突合結果 |
| `processed/audit/raw_pdf_sections.csv` | 一般会計PDF節抽出の中間データ |
| `processed/audit/raw_pdf_sections_special.csv` | 特別会計PDF節抽出の中間データ |
| `config/budget-accounts.json` | 会計定義・期待額・状態 |

## 会計別の金額検証

| account_code | 会計名 | status | 期待額 | programs | sections | items program | items section | 判定 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| `general` | 一般会計 | active | 431,353,010 | 431,353,010 | 431,353,010 | 431,353,010 | 431,353,010 | PASS |
| `national_health_insurance` | 国民健康保険事業会計 | active | 84,206,905 | 84,206,905 | 84,206,905 | 84,206,905 | 84,206,905 | PASS |
| `latter_stage_elderly_healthcare` | 後期高齢者医療会計 | active | 29,414,796 | 29,414,796 | 29,414,796 | 29,414,796 | 29,414,796 | PASS |
| `long_term_care_insurance` | 介護保険事業会計 | active | 76,058,953 | 76,058,953 | 76,058,953 | 76,058,953 | 76,058,953 | PASS |
| `school_lunch_fee` | 学校給食費会計 | abolished_zero | 0 | 0 | 0 | 0 | 0 | PASS |

## 全会計合計

差額は `期待値 - 実績値`。

| 検証対象 | 期待値 | 実績値 | 差額 | 結果 |
| --- | ---: | ---: | ---: | --- |
| config expected合計 | 621,033,664 | 621,033,664 | 0 | PASS |
| budget_programs amount合計 | 621,033,664 | 621,033,664 | 0 | PASS |
| budget_sections amount合計 | 621,033,664 | 621,033,664 | 0 | PASS |
| budget_items program_total合計 | 621,033,664 | 621,033,664 | 0 | PASS |
| budget_items section_total合計 | 621,033,664 | 621,033,664 | 0 | PASS |

## 各CSVの行数

| ファイル | データ行数 |
| --- | ---: |
| `budget_programs.csv` | 1,170 |
| `budget_sections.csv` | 994 |
| `budget_items.csv` | 190 |
| `raw_pdf_sections.csv` | 872 |
| `raw_pdf_sections_special.csv` | 122 |
| raw PDF中間データ合計 | 994 |
| `validation_errors.csv` | 0 |

## account_code 別の行数

| account_code | programs | sections | items | raw PDF sections |
| --- | ---: | ---: | ---: | ---: |
| `general` | 1,077 | 872 | 128 | 872 |
| `national_health_insurance` | 29 | 42 | 24 | 42 |
| `latter_stage_elderly_healthcare` | 17 | 21 | 7 | 21 |
| `long_term_care_insurance` | 46 | 59 | 30 | 59 |
| `school_lunch_fee` | 1 | 0 | 1 | 0 |

## budget_item_key 数

| 対象 | キー数 |
| --- | ---: |
| budget_programs | 190 |
| budget_sections | 180 |
| budget_items | 190 |
| programsとsectionsのunion | 190 |

## validation_status 別件数

| validation_status | 件数 |
| --- | ---: |
| `ok` | 180 |
| `ok_zero_amount` | 10 |
| `error_missing_sections` | 0 |
| `error_missing_programs` | 0 |
| `error_amount_mismatch` | 0 |

## ok_zero_amount の一覧

件数: 10 件

| account_code | budget_item_key | 款 | 項 | 目 | program_total | section_total | program行数 | section行数 |
| --- | --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `general` | `2026_general_expenditure_02_07_06` | 総務費 | 選挙費 | 参議院議員選挙費 | 0 | 0 | 1 | 0 |
| `general` | `2026_general_expenditure_08_01_08` | 教育費 | 教育総務費 | 学校給食管理費 | 0 | 0 | 3 | 0 |
| `general` | `2026_general_expenditure_08_02_03` | 教育費 | 小学校費 | 学校給食費 | 0 | 0 | 1 | 0 |
| `general` | `2026_general_expenditure_08_03_03` | 教育費 | 中学校費 | 学校給食費 | 0 | 0 | 3 | 0 |
| `general` | `2026_general_expenditure_08_04_01` | 教育費 | 校外施設費 | 校外施設費 | 0 | 0 | 4 | 0 |
| `general` | `2026_general_expenditure_08_06_08` | 教育費 | 社会教育費 | 図書館建設費 | 0 | 0 | 1 | 0 |
| `long_term_care_insurance` | `2026_long_term_care_insurance_expenditure_48_01_02` | 諸支出金 | 償還金及還付加算金 | 償還金 | 0 | 0 | 1 | 0 |
| `national_health_insurance` | `2026_national_health_insurance_expenditure_22_08_01` | 保険給付費 | 傷病手当金 | 傷病手当金 | 0 | 0 | 1 | 0 |
| `national_health_insurance` | `2026_national_health_insurance_expenditure_27_03_03` | 諸支出金 | 償還金及還付加算金 | 償還金 | 0 | 0 | 1 | 0 |
| `school_lunch_fee` | `2026_school_lunch_fee_expenditure_71_01_01` | 学校給食費 | 給食費 | 給食費 | 0 | 0 | 1 | 0 |

## needs_review 件数

| 入力 | 件数 | 判定 |
| --- | ---: | --- |
| raw_pdf_sections.csv | 0 | PASS |
| raw_pdf_sections_special.csv | 0 | PASS |
| 合計 | 0 | PASS |

## ID・キー・会計コード検証

| 検証項目 | 結果 | 判定 |
| --- | ---: | --- |
| section_id 一意数 / 行数 | 994 / 994 | PASS |
| program_id 一意数 / 行数 | 1,170 / 1,170 | PASS |
| programs側の不正なbudget_item_key行 | 0 | PASS |
| sections側の不正なbudget_item_key行 | 0 | PASS |
| items側の不正なbudget_item_key行 | 0 | PASS |
| config未定義account_code行 | 0 | PASS |
| 会計メタデータ不一致行 | 0 | PASS |

## 一般会計のPhase 6互換性

総合判定: **PASS**

| 検証項目 | Phase 6基準 | 現在値 | 判定 |
| --- | ---: | ---: | --- |
| budget_programs 行数 | 1,077 | 1,077 | PASS |
| budget_sections 行数 | 872 | 872 | PASS |
| budget_items 行数 | 128 | 128 | PASS |
| raw_pdf_sections 行数 | 872 | 872 | PASS |
| budget_programs 合計 | 431,353,010 | 431,353,010 | PASS |
| budget_sections 合計 | 431,353,010 | 431,353,010 | PASS |
| budget_items program_total | 431,353,010 | 431,353,010 | PASS |
| budget_items section_total | 431,353,010 | 431,353,010 | PASS |
| programs budget_item_key数 | 128 | 128 | PASS |
| sections budget_item_key数 | 122 | 122 | PASS |
| items budget_item_key数 | 128 | 128 | PASS |
| programs/sections unionキー数 | 128 | 128 | PASS |
| validation_status=ok件数 | 122 | 122 | PASS |
| ok_zero_amount件数 | 6 | 6 | PASS |
| error系status件数 | 0 | 0 | PASS |
| needs_review件数 | 0 | 0 | PASS |
| program_id一意数 | 1,077 | 1,077 | PASS |
| section_id一意数 | 872 | 872 | PASS |
| programs不正キー行数 | 0 | 0 | PASS |
| sections不正キー行数 | 0 | 0 | PASS |
| items不正キー行数 | 0 | 0 | PASS |

## 学校給食費会計

`school_lunch_fee` は令和8年度の廃止・0円会計として `status=abolished_zero` で検証した。

- `budget_programs.csv`: 0円項目を保持
- `budget_items.csv`: `ok_zero_amount` として保持
- `budget_sections.csv`: PDF由来の節がないため0行。補完行は追加しない

## エラー

エラー件数: 0 件

`processed/validation/validation_errors.csv` はヘッダーのみ。要確認事項はない。

## 関連資料

- [入力ファイルプロファイル](budget_data_input_profile.md)
- [一般会計PDF節抽出ノート](pdf_section_extraction_notes.md)
- [特別会計PDF全体抽出レポート](special_account_full_extraction_report.md)
