---
title: "令和8年度当初予算 特別会計PDF節抽出レポート"
created: 2026-07-29
updated: 2026-07-29
tags:
  - budget-data
  - pdf-extraction
  - setagaya
related:
  - special_account_extraction_notes
  - special_accounts_plan
  - pdf_section_extraction_notes
status: complete
---

# 令和8年度当初予算 特別会計PDF節抽出レポート

- 入力PDF: `/Users/ogukazu/Documents/デジタル民主主義/tools/mirai-gikai-budget-data-input-profile/raw/r8tousyoyosanallpage.pdf`
- 会計設定: `/Users/ogukazu/Documents/デジタル民主主義/tools/mirai-gikai-budget-data-input-profile/config/budget-accounts.json`
- 出力CSV: `/Users/ogukazu/Documents/デジタル民主主義/tools/mirai-gikai-budget-data-input-profile/processed/raw_pdf_sections_special.csv`
- 関連: [[special_account_extraction_notes]]、[[special_accounts_plan]]、[[pdf_section_extraction_notes]]
- 対象: 国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計
- 対象外: 学校給食費会計（`abolished_zero`）

## 最終判定

**PASS**

設定された43 PDFページから122節・58目を抽出した。`parse_status=needs_review` は0件で、目別一致率は100.0%（58/58）だった。
3会計の節合計は`189,680,654千円`で、設定済み期待額の合計と一致した。
`processed/budget_sections.csv` はこのPhaseでは更新していない。

## 会計別結果

| account_code | 会計名称 | PDFページ | ページ数 | 節行 | 一致目 | needs_review | 節合計 | 期待額 | 判定 |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `national_health_insurance` | 国民健康保険事業会計 | 299〜314 | 16 | 42 | 22/22 | 0 | 84,206,905 | 84,206,905 | PASS |
| `latter_stage_elderly_healthcare` | 後期高齢者医療会計 | 338〜343 | 6 | 21 | 7/7 | 0 | 29,414,796 | 29,414,796 | PASS |
| `long_term_care_insurance` | 介護保険事業会計 | 379〜399 | 21 | 59 | 29/29 | 0 | 76,058,953 | 76,058,953 | PASS |
| **合計** | 3会計 | - | **43** | **122** | **58/58** | **0** | **189,680,654** | **189,680,654** | **PASS** |

## ページ分類

| account_code | detail_page | continuation_page | summary_page | table_detection_failed |
| --- | ---: | ---: | ---: | ---: |
| `national_health_insurance` | 16 | 0 | 0 | 0 |
| `latter_stage_elderly_healthcare` | 6 | 0 | 0 | 0 |
| `long_term_care_insurance` | 19 | 1 | 1 | 0 |

正常スキップした集計ページは次のとおり。

| account_code | PDFページ | 冊子ページ | 款 |
| --- | ---: | ---: | --- |
| `long_term_care_insurance` | 382 | 757 | 42 保険給付費 |

## ページまたぎ

| account_code | 款-項-目 | 目名称 | PDFページ範囲 | 節数 | 節合計 | 目予算額 | 結果 |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `long_term_care_insurance` | 49-02-02 | 任意事業費 | 396-397 | 6 | 290,146 | 290,146 | matched |

会計ごとにextractorを新しく開始することで`current_account`を切り替え、
同一会計内では`current_kan`、`current_kou`、`current_moku`を
次ページへ保持した。介護保険PDF 396→397ページでは、説明だけが続く
397ページを`continuation_page`として扱い、目を閉じるまで検算を保留した。

## 目単位の照合結果

| account_code | 款-項-目 | 目名称 | PDFページ範囲 | 節数 | 節合計 | 目予算額 | parse_status | reason |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | --- |
| `national_health_insurance` | 21-01-01 | 一般管理費 | 299 | 7 | 1,137,613 | 1,137,613 | matched | `-` |
| `national_health_insurance` | 21-01-02 | 運営協議会費 | 300 | 3 | 524 | 524 | matched | `-` |
| `national_health_insurance` | 21-01-03 | 趣旨普及費 | 300 | 3 | 5,606 | 5,606 | matched | `-` |
| `national_health_insurance` | 21-01-04 | 連合会負担金 | 300 | 1 | 16,525 | 16,525 | matched | `-` |
| `national_health_insurance` | 22-01-01 | 療養給付費 | 301 | 1 | 41,817,513 | 41,817,513 | matched | `-` |
| `national_health_insurance` | 22-01-03 | 療養費 | 301 | 1 | 566,541 | 566,541 | matched | `-` |
| `national_health_insurance` | 22-01-05 | 審査支払手数料 | 301 | 1 | 217,239 | 217,239 | matched | `-` |
| `national_health_insurance` | 22-02-01 | 高額療養費 | 302 | 1 | 5,886,421 | 5,886,421 | matched | `-` |
| `national_health_insurance` | 22-02-03 | 高額介護合算療養費 | 302 | 1 | 8,024 | 8,024 | matched | `-` |
| `national_health_insurance` | 22-03-02 | 出産育児一時金 | 303 | 1 | 260,500 | 260,500 | matched | `-` |
| `national_health_insurance` | 22-03-03 | 支払手数料 | 303 | 1 | 110 | 110 | matched | `-` |
| `national_health_insurance` | 22-04-01 | 葬祭費 | 304 | 1 | 36,400 | 36,400 | matched | `-` |
| `national_health_insurance` | 22-06-01 | 移送費 | 305 | 1 | 300 | 300 | matched | `-` |
| `national_health_insurance` | 22-07-01 | 結核・精神医療給付金 | 306 | 1 | 77,084 | 77,084 | matched | `-` |
| `national_health_insurance` | 25-02-01 | 特定健康診査等事業費 | 307 | 7 | 813,676 | 813,676 | matched | `-` |
| `national_health_insurance` | 26-01-01 | 職員費 | 308 | 5 | 854,708 | 854,708 | matched | `-` |
| `national_health_insurance` | 27-03-01 | 保険料還付金及還付加算金 | 309 | 1 | 205,650 | 205,650 | matched | `-` |
| `national_health_insurance` | 32-01-01 | 医療給付費分 | 310 | 1 | 20,790,477 | 20,790,477 | matched | `-` |
| `national_health_insurance` | 32-02-01 | 後期高齢者支援金等分 | 311 | 1 | 7,764,099 | 7,764,099 | matched | `-` |
| `national_health_insurance` | 32-03-01 | 介護納付金分 | 312 | 1 | 3,051,753 | 3,051,753 | matched | `-` |
| `national_health_insurance` | 32-04-01 | 子ども・子育て支援金分 | 313 | 1 | 666,142 | 666,142 | matched | `-` |
| `national_health_insurance` | 34-01-01 | 予備費 | 314 | 1 | 30,000 | 30,000 | matched | `-` |
| `latter_stage_elderly_healthcare` | 61-01-01 | 一般管理費 | 338 | 7 | 679,956 | 679,956 | matched | `-` |
| `latter_stage_elderly_healthcare` | 62-01-01 | 広域連合分賦金 | 339 | 1 | 27,794,600 | 27,794,600 | matched | `-` |
| `latter_stage_elderly_healthcare` | 63-01-01 | 健康診査費 | 340 | 5 | 667,092 | 667,092 | matched | `-` |
| `latter_stage_elderly_healthcare` | 63-01-02 | その他健康保持増進費 | 340 | 1 | 4,642 | 4,642 | matched | `-` |
| `latter_stage_elderly_healthcare` | 64-01-01 | 職員費 | 341 | 5 | 203,106 | 203,106 | matched | `-` |
| `latter_stage_elderly_healthcare` | 65-01-03 | 保険料還付金及還付加算金 | 342 | 1 | 35,400 | 35,400 | matched | `-` |
| `latter_stage_elderly_healthcare` | 66-01-01 | 予備費 | 343 | 1 | 30,000 | 30,000 | matched | `-` |
| `long_term_care_insurance` | 41-01-01 | 一般管理費 | 379 | 6 | 374,163 | 374,163 | matched | `-` |
| `long_term_care_insurance` | 41-02-01 | 介護認定審査会費 | 380 | 7 | 494,142 | 494,142 | matched | `-` |
| `long_term_care_insurance` | 41-03-01 | 趣旨普及費 | 381 | 2 | 4,205 | 4,205 | matched | `-` |
| `long_term_care_insurance` | 42-01-01 | 居宅介護サービス給付費 | 383 | 1 | 38,847,776 | 38,847,776 | matched | `-` |
| `long_term_care_insurance` | 42-01-02 | 施設介護サービス給付費 | 383 | 1 | 13,763,000 | 13,763,000 | matched | `-` |
| `long_term_care_insurance` | 42-01-03 | 居宅介護福祉用具購入費 | 384 | 1 | 93,376 | 93,376 | matched | `-` |
| `long_term_care_insurance` | 42-01-04 | 居宅介護住宅改修費 | 384 | 1 | 142,779 | 142,779 | matched | `-` |
| `long_term_care_insurance` | 42-01-05 | 居宅介護サービス計画給付費 | 384 | 1 | 3,926,000 | 3,926,000 | matched | `-` |
| `long_term_care_insurance` | 42-01-06 | 地域密着型介護サービス給付費 | 385 | 1 | 9,591,000 | 9,591,000 | matched | `-` |
| `long_term_care_insurance` | 42-03-01 | 審査支払手数料 | 386 | 1 | 84,929 | 84,929 | matched | `-` |
| `long_term_care_insurance` | 42-04-01 | 高額介護サービス費 | 387 | 1 | 2,361,028 | 2,361,028 | matched | `-` |
| `long_term_care_insurance` | 42-04-03 | 高額介護予防サービス費 | 387 | 1 | 4,995 | 4,995 | matched | `-` |
| `long_term_care_insurance` | 42-06-01 | 介護予防サービス給付費 | 388 | 1 | 1,338,000 | 1,338,000 | matched | `-` |
| `long_term_care_insurance` | 42-06-02 | 地域密着型介護予防サービス給付費 | 388 | 1 | 35,885 | 35,885 | matched | `-` |
| `long_term_care_insurance` | 42-06-03 | 介護予防福祉用具購入費 | 389 | 1 | 17,108 | 17,108 | matched | `-` |
| `long_term_care_insurance` | 42-06-04 | 介護予防住宅改修費 | 389 | 1 | 80,511 | 80,511 | matched | `-` |
| `long_term_care_insurance` | 42-06-05 | 介護予防サービス計画給付費 | 389 | 1 | 243,457 | 243,457 | matched | `-` |
| `long_term_care_insurance` | 42-07-01 | 特定入所者介護サービス費 | 390 | 1 | 665,690 | 665,690 | matched | `-` |
| `long_term_care_insurance` | 42-07-03 | 特定入所者介護予防サービス費 | 390 | 1 | 403 | 403 | matched | `-` |
| `long_term_care_insurance` | 42-09-01 | 高額医療合算介護サービス費 | 391 | 1 | 432,570 | 432,570 | matched | `-` |
| `long_term_care_insurance` | 42-09-02 | 高額医療合算介護予防サービス費 | 391 | 1 | 4,569 | 4,569 | matched | `-` |
| `long_term_care_insurance` | 45-01-01 | 介護給付費準備基金積立金 | 392 | 1 | 65,792 | 65,792 | matched | `-` |
| `long_term_care_insurance` | 46-01-01 | 職員費 | 393 | 5 | 927,298 | 927,298 | matched | `-` |
| `long_term_care_insurance` | 48-01-04 | 第1号被保険者保険料還付金及還付加算金 | 394 | 1 | 43,417 | 43,417 | matched | `-` |
| `long_term_care_insurance` | 48-02-01 | 他会計繰出金 | 395 | 1 | 255,661 | 255,661 | matched | `-` |
| `long_term_care_insurance` | 49-02-01 | 包括的支援事業費 | 396 | 6 | 172,027 | 172,027 | matched | `-` |
| `long_term_care_insurance` | 49-02-02 | 任意事業費 | 396-397 | 6 | 290,146 | 290,146 | matched | `-` |
| `long_term_care_insurance` | 49-03-01 | 介護予防・日常生活支援総合事業費 | 398 | 5 | 1,769,026 | 1,769,026 | matched | `-` |
| `long_term_care_insurance` | 50-01-01 | 予備費 | 399 | 1 | 30,000 | 30,000 | matched | `-` |

## needs_review

`parse_status=needs_review` は0件で、全行が `matched` だった。

## 検証結果

- `raw_section_id`一意: 122/122
- 目別金額一致: 58/58
- 国民健康保険事業会計: 84,206,905
- 後期高齢者医療会計: 29,414,796
- 介護保険事業会計: 76,058,953
- 3会計合計: 189,680,654
- 設定期待額合計: 189,680,654
- 最終判定: **PASS**

## 次の処理へ進む条件

今回の全体抽出は金額・目照合・parse_statusの条件を満たしたため、
`processed/budget_sections.csv` へ正規化・追加する次Phaseへ進める。
追加時は一般会計とのunionを取り、`account_code`を含む
`budget_item_key`で会計間衝突を防ぐ。

## このPhaseで行っていないこと

- `processed/budget_sections.csv` の更新
- `processed/budget_items.csv` の更新
- 一般会計と特別会計の節データ統合
- 学校給食費会計のPDF抽出
- DB投入
