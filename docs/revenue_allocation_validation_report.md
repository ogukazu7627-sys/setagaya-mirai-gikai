---
title: "令和8年度予算 歳入・歳出事業接続総合検証レポート"
updated: 2026-07-29
tags:
  - みらい議会
  - 世田谷区
  - 予算
  - データ検証
related:
  - 世田谷区令和8年度予算データ基盤
---

# 世田谷区令和8年度当初予算 歳入・歳出事業接続総合検証

## 最終判定

**PASS**

検出エラーは 0 件。

## 検証項目

| No. | 検証 | 判定 |
| ---: | --- | --- |
| 1 | CSV由来歳入3テーブルがPhase 24のPASS状態を維持 | PASS |
| 2 | raw PDF allocation行と最終allocation行が1対1で対応 | PASS |
| 3 | 全revenue_detail_idが実在しPDF細節と整合 | PASS |
| 4 | groupまたはpublic identityのtarget参照が実在 | PASS |
| 5 | PDF対象ページ外のデータがない | PASS |
| 6 | raw_allocation_idの重複がない | PASS |
| 7 | allocation_link_idの重複がない | PASS |
| 8 | 同一source-targetペアの重複がない | PASS |
| 9 | ambiguousが0件 | PASS |
| 10 | unmatchedが0件 | PASS |
| 11 | allocation_amount_thousand_yenが全件空欄 | PASS |
| 12 | amount_attribution_statusが全件not_available | PASS |
| 13 | 複数targetのrevenue_detailを一覧化 | PASS |
| 14 | 複数targetへ歳入細節金額を複製していない | PASS |
| 15 | 学校給食費会計をPDF allocation対象にしていない | PASS |
| 16 | 既存の歳出3テーブルが基準ハッシュ・行数を維持 | PASS |

### target参照の解釈

Phase 29.5で公式PDFから内部groupを区別できない39件は、`target_budget_program_group_id`を空欄のまま、再構築した`target_budget_program_identity_id`へ接続する。これらは`public_identity`として正常であり、groupまで確定した扱いにはしない。group IDの実在検証は、値がある`exact_group`行に適用する。

## 入力ファイル

| ファイル | 用途 |
| --- | --- |
| `processed/budget_revenue_details.csv` | 公式CSV由来の歳入細節×所属 |
| `processed/budget_revenue_sections.csv` | 歳入節集約 |
| `processed/budget_revenue_items.csv` | 歳入目集約 |
| `processed/raw_pdf_revenue_allocations.csv` | PDF充当事業の抽出原本 |
| `processed/budget_program_groups.csv` | 歳出予算事業group |
| `processed/budget_revenue_allocations.csv` | 歳入・歳出事業関係 |
| `processed/budget_programs.csv` | 歳出事業コア |
| `processed/budget_sections.csv` | 歳出節コア |
| `processed/budget_items.csv` | 歳出目コア |
| `raw/ippansainyu.csv` | Phase 24元行復元用の公式歳入CSV |
| `config/budget-accounts.json` | 会計別期待額・PDF対象範囲 |

## Phase 24維持確認

| 対象 | 行数 | 合計（千円） |
| --- | ---: | ---: |
| budget_revenue_details | 2,192 | 621,033,664 |
| budget_revenue_sections | 650 | 621,033,664 |
| budget_revenue_items | 175 | 621,033,664 |

- Phase 24エラー: 0件
- 公式CSV復元一致: 2,192 / 2,192行
- 判定: PASS

## allocation概要

| 項目 | 件数 |
| --- | ---: |
| raw PDF allocation | 1,948 |
| 最終allocation | 1,948 |
| 一意raw_allocation_id | 1,948 |
| 一意allocation_link_id | 1,948 |
| 一意source-target関係 | 1,948 |
| exact_group | 1,909 |
| public_identity | 39 |
| ambiguous | 0 |
| unmatched | 0 |
| 複数targetを持つrevenue_detail | 27 |

## 金額非帰属の確認

| 検証 | 件数 | 判定 |
| --- | ---: | --- |
| allocation_amountが空欄でない行 | 0 | PASS |
| amount_attribution_status不正 | 0 | PASS |
| rawのsequence=2以降へ細節金額を複製 | 0 | PASS |

## PDF歳入ページ範囲

| account_code | 行数 | PDF物理ページ 設定 | 実績 | 冊子ページ 設定 | 実績 | 判定 |
| --- | ---: | --- | --- | --- | --- | --- |
| `general` | 1,626 | 37-157 | 52-157 | 67-307 | 97-307 | PASS |
| `national_health_insurance` | 84 | 285-297 | 286-297 | 563-587 | 565-587 | PASS |
| `latter_stage_elderly_healthcare` | 29 | 327-336 | 328-336 | 647-665 | 649-665 | PASS |
| `long_term_care_insurance` | 209 | 357-377 | 358-377 | 707-747 | 709-747 | PASS |
| `school_lunch_fee` | 0 | --- | --- | --- | --- | PASS |

## 充当先歳出ページ範囲

| target account_code | 行数 | 冊子ページ 設定 | 実績 | 判定 |
| --- | ---: | --- | --- | --- |
| `general` | 1,626 | 310-479 | 311-477 | PASS |
| `national_health_insurance` | 84 | 590-621 | 591-621 | PASS |
| `latter_stage_elderly_healthcare` | 29 | 668-679 | 669-679 | PASS |
| `long_term_care_insurance` | 209 | 750-791 | 751-791 | PASS |
| `school_lunch_fee` | 0 | --- | --- | PASS |

## 複数充当先

以下は1つの`revenue_detail_id`が複数のtarget関係を持つ一覧。金額は歳入細節の参考値を1回だけ示したもので、各targetへの配分額ではない。

| revenue_detail_id | 会計 | 細節名 | 歳入細節額（千円） | target数 | target（解決レベル・事業名・冊子頁） |
| --- | --- | --- | ---: | ---: | --- |
| `rd_2026_general_revenue_12_01_05_01_26_3895300000` | `general` | ガス関係 | 922,900 | 2 | exact_group: 道路側溝維持修繕（世田谷・北沢・烏山） (P423)<br>exact_group: 土木関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_12_01_06_02_02_4985400000` | `general` | 幼稚園預かり保育料 | 4,133 | 2 | exact_group: 区立幼稚園預かり保育事業 (P457)<br>exact_group: 教育関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_12_02_01_01_02_3415220000` | `general` | 住民基本台帳証明・閲覧 | 106,491 | 2 | exact_group: 住民記録事務 (P345)<br>exact_group: 総務関係事務従事職員の人件費 (P465) |
| `rd_2026_general_revenue_12_02_04_04_02_3785700000` | `general` | 衛生監視 | 27,000 | 2 | exact_group: 食品衛生監視普及 (P409)<br>exact_group: 衛生関係事務従事職員の人件費 (P469) |
| `rd_2026_general_revenue_12_02_04_05_03_3785700000` | `general` | 環境監視手数料 | 6,898 | 2 | exact_group: 環境衛生監視普及 (P409)<br>exact_group: 衛生関係事務従事職員の人件費 (P469) |
| `rd_2026_general_revenue_12_02_04_08_02_3785700000` | `general` | 医薬品販売業等許可 | 4,559 | 2 | exact_group: 医事薬事監視普及 (P409)<br>exact_group: 衛生関係事務従事職員の人件費 (P469) |
| `rd_2026_general_revenue_12_02_05_02_24_3895140000` | `general` | 臨時運行許可申請手数料 | 1,875 | 2 | exact_group: 自動車臨時運行許可 (P419)<br>exact_group: 土木関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_12_02_05_10_39_3815250000` | `general` | 建築諸証明手数料 | 3,500 | 2 | exact_group: 建築行政事務 (P435)<br>exact_group: 土木関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_12_02_05_11_20_3825100000` | `general` | 開発行為許可申請手数料 | 6,169 | 2 | exact_group: 防災街づくり担当部庶務事務 (P441)<br>exact_group: 土木関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_13_01_01_11_08_3595400000` | `general` | 年金生活者支援給付金 | 3,095 | 2 | exact_group: 国民年金運営事業 (P371)<br>exact_group: 民生関係事務従事職員の人件費 (P467) |
| `rd_2026_general_revenue_13_01_01_43_03_3695200000` | `general` | 一時保護所運営 | 57,526 | 2 | exact_group: 一時保護所運営 (P385)<br>exact_group: 会計年度任用職員の人件費（児童相談所） (P469) |
| `rd_2026_general_revenue_13_02_01_78_30_3665570000` | `general` | 利用者支援事業（こども家庭センター型） | 40,316 | 2 | exact_group: 子ども家庭支援センター運営事業 (P375)<br>public_identity: 会計年度任用職員の人件費（子ども・若者部） (P469) |
| `rd_2026_general_revenue_14_02_02_05_01_3595200000` | `general` | 旧軍人援護 | 1,644 | 2 | exact_group: 旧軍人等の援護 (P357)<br>exact_group: 民生関係事務従事職員の人件費 (P467) |
| `rd_2026_general_revenue_14_02_02_68_30_3665500000` | `general` | 発達支援親子グループ事業 | 12,497 | 2 | exact_group: 発達支援親子グループ事業 (P377)<br>public_identity: 会計年度任用職員の人件費（子ども・若者部） (P469) |
| `rd_2026_general_revenue_14_02_08_68_06_3665150000` | `general` | 子どもの権利擁護 | 23,700 | 2 | exact_group: 子どもの権利擁護の推進 (P379)<br>public_identity: 会計年度任用職員の人件費（子ども・若者部） (P469) |
| `rd_2026_general_revenue_14_03_01_01_06_3355300000` | `general` | 徴税費 | 1,925,292 | 6 | exact_group: 基幹業務システム運用 (P321)<br>exact_group: 公金取扱手数料 (P323)<br>exact_group: 納税奨励 (P325)<br>exact_group: 納税意識啓発事業 (P325)<br>exact_group: 区税賦課 (P325)<br>exact_group: 区税徴収 (P325) |
| `rd_2026_general_revenue_14_03_01_13_12_3815100000` | `general` | 事務処理特例交付金 | 6,024 | 2 | exact_group: 土木関係事務従事職員の人件費 (P471)<br>exact_group: 会計年度任用職員の人件費（都市整備政策部） (P471) |
| `rd_2026_general_revenue_14_03_02_02_09_3655300000` | `general` | 小児精神病等 | 16,935 | 2 | exact_group: 精神障害者保健福祉手帳等進達事務 (P397)<br>exact_group: 衛生関係事務従事職員の人件費 (P469) |
| `rd_2026_general_revenue_14_03_02_02_11_3785250000` | `general` | 難病医療費事務費交付金 | 8,095 | 2 | exact_group: 難病・被爆者対策 (P407)<br>exact_group: 衛生関係事務従事職員の人件費 (P469) |
| `rd_2026_general_revenue_14_03_04_03_02_3895400000` | `general` | 水門管理 | 9,462 | 2 | exact_group: 下水道局樋門管理受託 (P429)<br>exact_group: 土木関係事務従事職員の人件費 (P471) |
| `rd_2026_general_revenue_15_01_01_04_08_3645100000` | `general` | 老人保健施設 | 13,428 | 2 | exact_group: 老人保健施設整備助成 (P357)<br>exact_group: 民生関係事務従事職員の人件費 (P467) |
| `rd_2026_general_revenue_19_03_01_01_01_3665150000` | `general` | 奨学資金等貸付金返還金 | 14,361 | 2 | exact_group: 奨学資金等貸付 (P317)<br>exact_group: 民生関係事務従事職員の人件費 (P467) |
| `rd_2026_general_revenue_19_06_09_45_18_3415220000` | `general` | 総合支所くみん窓口 | 6,115 | 2 | exact_group: 総合窓口化の推進 (P331)<br>exact_group: 総務関係事務従事職員の人件費 (P465) |
| `rd_2026_latter_stage_elderly_healthcare_revenue_63_01_01_01_01_3595400000` | `latter_stage_elderly_healthcare` | 職員給与費 | 203,106 | 3 | exact_group: 後期高齢者医療会計関係事務従事職員の人件費 (P675)<br>exact_group: 後期高齢者医療会計関係職員の人件費 (P675)<br>exact_group: 会計年度任用職員の人件費（保健福祉政策部） (P675) |
| `rd_2026_long_term_care_insurance_revenue_48_01_02_01_01_3645200000` | `long_term_care_insurance` | 職員給与費 | 651,864 | 2 | exact_group: 介護保険事業会計関係事務従事職員の人件費 (P779)<br>exact_group: 介護保険事業会計関係職員の人件費 (P779) |
| `rd_2026_long_term_care_insurance_revenue_48_01_02_02_02_3645200000` | `long_term_care_insurance` | 一般管理 | 575,325 | 2 | exact_group: 介護保険事業管理運営 (P751)<br>exact_group: 会計年度任用職員の人件費（高齢福祉部） (P779) |
| `rd_2026_national_health_insurance_revenue_27_01_01_04_01_3595400000` | `national_health_insurance` | 職員給与費 | 839,878 | 3 | exact_group: 国民健康保険事業会計関係事務従事職員の人件費 (P609)<br>exact_group: 国民健康保険事業会計関係職員の人件費 (P609)<br>exact_group: 会計年度任用職員の人件費（保健福祉政策部） (P609) |

## 歳出コア不変性

| ファイル | 基準行数 | 実際行数 | SHA-256一致 | 判定 |
| --- | ---: | ---: | --- | --- |
| `budget_programs.csv` | 1,170 | 1,170 | yes | PASS |
| `budget_sections.csv` | 994 | 994 | yes | PASS |
| `budget_items.csv` | 190 | 190 | yes | PASS |

- budget_program_groups再生成一致: PASS

## エラー

エラー件数: 0件

`processed/revenue_allocation_validation_errors.csv` はヘッダーのみ。

歳入CSV、PDF充当事業、歳出予算事業の接続は総合検証を通過した。allocationは関係のみを表し、金額集計には使用しない。

データの粒度と利用禁止事項は`docs/budget_revenue_data_dictionary.md`を参照する。

