# 世田谷区令和8年度当初予算 歳入CSVデータ検証レポート

- 対象: 公式歳入CSV由来のdetails・sections・items
- 金額単位: 千円
- PDF処理: 対象外

## 最終判定

**PASS**

検出エラーは 0 件。

## 検証項目

| No. | 検証 | 判定 |
| ---: | --- | --- |
| 1 | detailsが2,192行 | PASS |
| 2 | sectionsが650行 | PASS |
| 3 | itemsが175行 | PASS |
| 4 | 各IDが一意 | PASS |
| 5 | キー形式が正しい | PASS |
| 6 | details全行でcurrent=allocated+unallocated | PASS |
| 7 | detailsからsectionsへの集約が一致 | PASS |
| 8 | detailsからitemsへの集約が一致 | PASS |
| 9 | sectionsからitemsへの集約が一致 | PASS |
| 10 | 会計別総額がconfigの歳入期待値と一致 | PASS |
| 11 | 全会計合計が621,033,664 | PASS |
| 12 | 一般会計の一般財源が279,402,113 | PASS |
| 13 | 一般会計の特定財源が151,950,897 | PASS |
| 14 | source_row_numberから公式CSVを復元可能 | PASS |
| 15 | source_row_numberに重複・欠落がない | PASS |
| 16 | 財源区分名称とfunding_natureのルールが正しい | PASS |
| 17 | 学校給食費会計の4行がすべて0円 | PASS |
| 18 | error系validation_statusが0件 | PASS |

## 入力ファイル一覧

| ファイル | 用途 |
| --- | --- |
| `raw/ippansainyu.csv` | 公式歳入CSV・元行復元 |
| `processed/core/budget_revenue_details.csv` | 歳入明細 |
| `processed/core/budget_revenue_sections.csv` | 歳入節集約 |
| `processed/core/budget_revenue_items.csv` | 歳入目マスタ |
| `config/budget-accounts.json` | 会計定義・期待額 |

## 行数・ID一意性

| 対象 | 期待行数 | 実際行数 | 一意ID数 | 判定 |
| --- | ---: | ---: | ---: | --- |
| details | 2,192 | 2,192 | 2,192 | PASS |
| sections | 650 | 650 | 650 | PASS |
| items | 175 | 175 | 175 | PASS |

## 会計別金額

| account_code | 期待額 | details | sections | items | 判定 |
| --- | ---: | ---: | ---: | ---: | --- |
| `general` | 431,353,010 | 431,353,010 | 431,353,010 | 431,353,010 | PASS |
| `national_health_insurance` | 84,206,905 | 84,206,905 | 84,206,905 | 84,206,905 | PASS |
| `latter_stage_elderly_healthcare` | 29,414,796 | 29,414,796 | 29,414,796 | 29,414,796 | PASS |
| `long_term_care_insurance` | 76,058,953 | 76,058,953 | 76,058,953 | 76,058,953 | PASS |
| `school_lunch_fee` | 0 | 0 | 0 | 0 | PASS |

## 全会計合計

| 対象 | 期待額 | 実績額 | 差額（期待−実績） | 判定 |
| --- | ---: | ---: | ---: | --- |
| config | 621,033,664 | 621,033,664 | 0 | PASS |
| details | 621,033,664 | 621,033,664 | 0 | PASS |
| sections | 621,033,664 | 621,033,664 | 0 | PASS |
| items | 621,033,664 | 621,033,664 | 0 | PASS |

## 一般会計の財源区分

| データ | 一般財源 | 特定財源 | 判定 |
| --- | ---: | ---: | --- |
| details | 279,402,113 | 151,950,897 | PASS |
| sections | 279,402,113 | 151,950,897 | PASS |
| items | 279,402,113 | 151,950,897 | PASS |

## 集約突合

| 検証 | 不一致件数 | 判定 |
| --- | ---: | --- |
| details → sections | 0 | PASS |
| details → items | 0 | PASS |
| sections → items | 0 | PASS |

## source_row_number追跡

| 項目 | 件数 |
| --- | ---: |
| 公式CSV対象行 | 2,192 |
| details参照行 | 2,192 |
| 一意な参照行 | 2,192 |
| 復元可能行 | 2,192 |
| 全列一致行 | 2,192 |
| 欠落行 | 0 |
| 重複参照 | 0 |

## validation_status

| データ | status | 件数 |
| --- | --- | ---: |
| sections | `ok` | 597 |
| sections | `ok_zero_amount` | 53 |
| sections | `error_amount_mismatch` | 0 |
| items | `ok` | 166 |
| items | `ok_zero_amount` | 9 |
| items | `error_section_mismatch` | 0 |
| items | `error_amount_mismatch` | 0 |

## 学校給食費会計

- 明細行数: 4件
- 0円でない明細: 0件
- 判定: PASS

## エラー

エラー件数: 0件

`processed/validation/revenue_validation_errors.csv` はヘッダーのみ。

CSV由来の歳入3テーブルはPASS。PDF処理へ進むための前提を満たしている。

