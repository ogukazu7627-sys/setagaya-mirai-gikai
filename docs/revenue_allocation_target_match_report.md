# 歳入充当事業・歳出予算事業 接続レポート

**最終判定: NEEDS_REVIEW**

## 入出力

- 歳入細節接続結果: `processed/audit/staging/revenue_allocation_source_matches.csv`
- 歳出予算事業: `processed/core/budget_programs.csv`
- 歳出節: `processed/core/budget_sections.csv`
- 歳出目マスタ: `processed/core/budget_items.csv`
- 会計設定: `config/budget-accounts.json`
- 予算事業グループ: `processed/core/budget_program_groups.csv`
- 充当関係: `processed/core/budget_revenue_allocations.csv`
- 手動補正: `config/revenue_allocation_target_overrides.csv`

## 予算事業グループ

| 指標 | 件数・金額 |
|---|---:|
| budget_program_group行 | 1,166 |
| 一意budget_program_group_id | 1,166 |
| 元program行 | 1,170 |
| member_program_count合計 | 1,170 |
| グループ金額合計（千円） | 621,033,664 |
| candidate_budget_book_pages空欄 | 17 |

| account_code | group数 | 金額（千円） | target関係行 |
|---|---:|---:|---:|
| general | 1,073 | 431,353,010 | 1,626 |
| latter_stage_elderly_healthcare | 17 | 29,414,796 | 29 |
| long_term_care_insurance | 46 | 76,058,953 | 209 |
| national_health_insurance | 29 | 84,206,905 | 84 |
| school_lunch_fee | 1 | 0 | 0 |

`candidate_budget_book_pages`は、同じ`budget_item_key`に属する`budget_sections.csv`の冊子ページを昇順・`|`区切りで保持します。空欄17件はすべて0円事業です。

## 充当関係

| 指標 | 件数 |
|---|---:|
| source match行 | 1,948 |
| allocation行 | 1,948 |
| 一意allocation_link_id | 1,948 |
| 一意revenue_detail_id | 1,915 |
| 接続済み一意target group | 654 |
| 手動補正候補行 | 39 |

### target_match_status

| status | 件数 |
|---|---:|
| matched | 1,909 |
| ambiguous | 39 |
| unmatched | 0 |
| manually_confirmed | 0 |

### target_match_method

| method | 件数 |
|---|---:|
| page_and_exact_name | 1,797 |
| page_name_department | 1 |
| page_and_normalized_name | 111 |
| manual_override | 0 |

### ページ差

| target page - candidate page | 件数 |
|---:|---:|
| 0 | 1,438 |
| 2 | 425 |
| 4 | 82 |
| 6 | 3 |

## マッチング規則

1. `target_budget_book_page`を`budget-accounts.json`の歳出範囲へ照合し、target会計を一意に決める。source会計はtarget会計の決定に使わない。
2. targetページと同じ節表ページ、または冊子ページで2・4・6ページ前の節表アンカーを持つ同一target会計のgroupだけを候補にする。
3. PDF事業名と`budget_program_name`の完全一致を優先し、なければUnicode NFKC、空白、中黒、ハイフンだけを正規化した完全一致を使う。
4. 同名候補ではtargetページに最も近い候補を優先し、なお複数ならPDF部署名と内部部署名・市民向け部署名を照合する。
5. 一意にならない場合は`ambiguous`または`unmatched`とし、金額・意味・類似度から推測しない。

## 安全制約

- このCSVは歳入細節と歳出予算事業グループの関係テーブルであり、金銭フローテーブルではない。
- `allocation_amount_thousand_yen`は全行空欄、`amount_attribution_status`は全行`not_available`。
- 歳入細節金額、歳出事業金額、公式CSVの財源列はtarget判定やallocation金額に使用しない。
- 1歳入細節に複数のPDF充当事業記載がある場合は別行を保ち、同じ金額を複製しない。
- 個別内訳事業の`program_id`へは接続せず、`budget_program_group_id`へ接続する。

## 検証

- program group構造検証: PASS
- source行数とallocation行数: PASS
- allocation_link_id一意性: PASS
- revenue_detail_id参照: PASS
- target group参照: PASS
- revenue_detail_id・target group重複: PASS
- allocation金額空欄: PASS
- amount_attribution_status: PASS
- 入力由来列の保持: PASS
- ambiguous: 39件
- unmatched: 0件

## ambiguous一覧

| raw_allocation_id | revenue_detail_id | target page | PDF事業名 | target account | 候補group | 理由 |
|---|---|---:|---|---|---|---|
| ra_2026_general_072_009 | rd_2026_general_revenue_13_02_01_54_44_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_072_010 | rd_2026_general_revenue_13_02_01_54_45_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_076_015 | rd_2026_general_revenue_13_02_01_78_30_3665570000 | 469 | 会計年度任用職員の人件費(子ども・若者部) | general | 2026_general_expenditure_09_01_03_01_18, 2026_general_expenditure_09_01_03_01_23 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_076_019 | rd_2026_general_revenue_13_02_01_91_03_3405350000 | 467 | 会計年度任用職員の人件費(生活文化政策部) | general | 2026_general_expenditure_09_01_02_01_23, 2026_general_expenditure_09_01_02_01_29 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_079_006 | rd_2026_general_revenue_13_02_03_15_02_3785100000 | 469 | 会計年度任用職員の人件費(世田谷保健所) | general | 2026_general_expenditure_09_01_05_01_14, 2026_general_expenditure_09_01_05_01_16 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=0 |
| ra_2026_general_082_010 | rd_2026_general_revenue_13_02_05_25_06_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_090_003 | rd_2026_general_revenue_14_02_02_13_03_3665590000 | 379 | ベビーシッター利用支援事業 | general | 2026_general_expenditure_03_02_01_01_94, 2026_general_expenditure_03_02_01_02_03 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=4 |
| ra_2026_general_100_010 | rd_2026_general_revenue_14_02_02_68_30_3665500000 | 469 | 会計年度任用職員の人件費(子ども・若者部) | general | 2026_general_expenditure_09_01_03_01_18, 2026_general_expenditure_09_01_03_01_23 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_101_009 | rd_2026_general_revenue_14_02_02_68_86_3655100000 | 469 | 会計年度任用職員の人件費(障害福祉部) | general | 2026_general_expenditure_09_01_03_01_17, 2026_general_expenditure_09_01_03_01_24 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_103_011 | rd_2026_general_revenue_14_02_02_92_44_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_103_012 | rd_2026_general_revenue_14_02_02_92_45_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_109_010 | rd_2026_general_revenue_14_02_07_09_02_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_109_012 | rd_2026_general_revenue_14_02_07_15_07_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_109_013 | rd_2026_general_revenue_14_02_07_15_10_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_109_014 | rd_2026_general_revenue_14_02_07_15_11_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_110_005 | rd_2026_general_revenue_14_02_07_31_02_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_110_010 | rd_2026_general_revenue_14_02_07_53_01_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_111_003 | rd_2026_general_revenue_14_02_07_59_01_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_112_001 | rd_2026_general_revenue_14_02_07_65_03_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_116_013 | rd_2026_general_revenue_14_02_08_68_06_3665150000 | 469 | 会計年度任用職員の人件費(子ども・若者部) | general | 2026_general_expenditure_09_01_03_01_18, 2026_general_expenditure_09_01_03_01_23 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_117_013 | rd_2026_general_revenue_14_02_08_80_02_3665590000 | 379 | ベビーシッター利用支援事業 | general | 2026_general_expenditure_03_02_01_01_94, 2026_general_expenditure_03_02_01_02_03 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=4 |
| ra_2026_general_119_009 | rd_2026_general_revenue_14_03_01_03_06_3065100000 | 467 | 会計年度任用職員の人件費(政策経営部) | general | 2026_general_expenditure_09_01_02_01_20, 2026_general_expenditure_09_01_02_01_30 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_119_021 | rd_2026_general_revenue_14_03_02_01_03_3785100000 | 469 | 会計年度任用職員の人件費(世田谷保健所) | general | 2026_general_expenditure_09_01_05_01_14, 2026_general_expenditure_09_01_05_01_16 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=0 |
| ra_2026_general_120_019 | rd_2026_general_revenue_14_03_07_08_07_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_120_020 | rd_2026_general_revenue_14_03_07_08_08_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_141_004 | rd_2026_general_revenue_19_06_04_06_02_3405350000 | 467 | 会計年度任用職員の人件費(生活文化政策部) | general | 2026_general_expenditure_09_01_02_01_23, 2026_general_expenditure_09_01_02_01_29 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_141_007 | rd_2026_general_revenue_19_06_04_06_07_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_141_010 | rd_2026_general_revenue_19_06_04_06_10_3655100000 | 469 | 会計年度任用職員の人件費(障害福祉部) | general | 2026_general_expenditure_09_01_03_01_17, 2026_general_expenditure_09_01_03_01_24 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_141_011 | rd_2026_general_revenue_19_06_04_06_16_3065100000 | 467 | 会計年度任用職員の人件費(政策経営部) | general | 2026_general_expenditure_09_01_02_01_20, 2026_general_expenditure_09_01_02_01_30 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_141_014 | rd_2026_general_revenue_19_06_04_06_19_3665150000 | 469 | 会計年度任用職員の人件費(子ども・若者部) | general | 2026_general_expenditure_09_01_03_01_18, 2026_general_expenditure_09_01_03_01_23 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_141_016 | rd_2026_general_revenue_19_06_04_06_26_3785100000 | 469 | 会計年度任用職員の人件費(世田谷保健所) | general | 2026_general_expenditure_09_01_05_01_14, 2026_general_expenditure_09_01_05_01_16 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=0 |
| ra_2026_general_142_007 | rd_2026_general_revenue_19_06_04_06_56_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_142_008 | rd_2026_general_revenue_19_06_04_06_58_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_142_009 | rd_2026_general_revenue_19_06_04_06_59_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_142_010 | rd_2026_general_revenue_19_06_04_06_60_4960100000 | 471 | 会計年度任用職員の人件費(教育委員会事務局) | general | 2026_general_expenditure_09_01_08_01_04, 2026_general_expenditure_09_01_08_01_07, 2026_general_expenditure_09_01_08_01_08, 2026_general_expenditure_09_01_08_01_09, 2026_general_expenditure_09_01_08_01_10 | multiple_target_groups_after_page_name_department;name_candidates=5;department_candidates=5;page_offset=0 |
| ra_2026_general_142_011 | rd_2026_general_revenue_19_06_04_06_61_3655100000 | 469 | 会計年度任用職員の人件費(障害福祉部) | general | 2026_general_expenditure_09_01_03_01_17, 2026_general_expenditure_09_01_03_01_24 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_142_012 | rd_2026_general_revenue_19_06_04_06_62_3665150000 | 469 | 会計年度任用職員の人件費(子ども・若者部) | general | 2026_general_expenditure_09_01_03_01_18, 2026_general_expenditure_09_01_03_01_23 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |
| ra_2026_general_142_013 | rd_2026_general_revenue_19_06_04_06_63_3785100000 | 469 | 会計年度任用職員の人件費(世田谷保健所) | general | 2026_general_expenditure_09_01_05_01_14, 2026_general_expenditure_09_01_05_01_16 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=0 |
| ra_2026_general_142_014 | rd_2026_general_revenue_19_06_04_06_64_3405350000 | 467 | 会計年度任用職員の人件費(生活文化政策部) | general | 2026_general_expenditure_09_01_02_01_23, 2026_general_expenditure_09_01_02_01_29 | multiple_target_groups_after_page_name_department;name_candidates=2;department_candidates=2;page_offset=2 |

## unmatched一覧

- 0件

## 手動補正

`config/revenue_allocation_target_overrides.csv`の`selected_budget_program_group_id`へ、候補を公式資料で確認した値だけを設定します。手動補正でもtargetページの会計・年度・ページ候補範囲外は拒否します。

