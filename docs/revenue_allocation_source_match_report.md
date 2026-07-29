# 歳入充当事業・公式CSV明細 接続レポート

**最終判定: PASS**

## 入出力

- PDF抽出入力: `processed/audit/raw_pdf_revenue_allocations.csv`
- 公式CSV由来明細: `processed/core/budget_revenue_details.csv`
- 接続結果: `processed/audit/staging/revenue_allocation_source_matches.csv`
- 手動補正: `config/revenue_allocation_source_overrides.csv`

## 集計

| 指標 | 件数 |
|---|---:|
| raw充当事業行 | 1,948 |
| source match行 | 1,948 |
| PDF歳入細節グループ | 1,915 |
| CSV歳入明細 | 2,192 |
| 一意raw_allocation_id | 1,948 |
| 接続済み一意revenue_detail_id | 1,915 |
| 充当事業記載から参照されないCSV明細 | 277 |
| 手動補正候補行 | 0 |

PDF側は1つの充当事業記載につき1行です。同一細節に複数の充当事業がある場合、`allocation_sequence=1`の判定を後続行へ引き継ぐため、raw行数とPDF歳入細節グループ数は一致しません。

## 会計別

| account_code | raw行 | PDF細節 | 参照されないCSV明細 |
|---|---:|---:|---:|
| general | 1,626 | 1,599 | 258 |
| latter_stage_elderly_healthcare | 29 | 27 | 3 |
| long_term_care_insurance | 209 | 207 | 4 |
| national_health_insurance | 84 | 82 | 8 |
| school_lunch_fee | 0 | 0 | 4 |

学校給食費会計は令和8年度廃止・0円でPDF抽出対象外です。参照されないCSV明細は、PDFに「充当事業」記載がない歳入を含むため、source matchのエラーにはしません。

## ステータス

| source_match_status | raw行 | PDF細節 |
|---|---:|---:|
| matched | 1,948 | 1,915 |
| ambiguous | 0 | 0 |
| unmatched | 0 | 0 |
| manually_confirmed | 0 | 0 |

## マッチ方法

| source_match_method | raw行 | PDF細節 |
|---|---:|---:|
| hierarchy_code_amount | 1,948 | 1,915 |
| hierarchy_code_amount_department | 0 | 0 |
| hierarchy_code_name_amount | 0 | 0 |
| manual_override | 0 | 0 |

## 照合規則

1. `account_code`と款・項・目・節・細節コードがすべて同じ候補だけを残す。
2. PDF細節金額と`current_amount_thousand_yen`が同じ候補を残す。
3. 複数候補時だけ、許可された正規化後の部署名完全一致を使う。
4. なお複数候補なら、許可された正規化後の細節名称完全一致を使う。
5. 一意にならない場合は`ambiguous`または`unmatched`とし、ファジーマッチで強制結合しない。

文字列正規化は、全角・半角スペース、連続空白、改行、丸括弧、`＊`、全角・半角数字、中黒、ハイフンの表記揺れに限定しています。大文字小文字、かな、漢字、語順、略称は変換しません。

## 検証

- raw行数とsource match行数: PASS
- raw_allocation_id一意性: PASS
- raw 25列の値の保持: PASS
- matched/manually_confirmedのrevenue_detail_id実在・同一階層: PASS
- ambiguous: 0件
- unmatched: 0件

## ambiguous一覧

- 0件

## unmatched一覧

- 0件

## 手動補正

`config/revenue_allocation_source_overrides.csv`には、`ambiguous`または`unmatched`の候補と、確定済み手動補正を保持します。`selected_revenue_detail_id`を指定しても、同一年度・同一会計・同一款項目節細節の外への接続は拒否します。

