# 令和8年度当初予算 特別会計追加計画

- 調査日: 2026-07-28
- 入力CSV: `/Users/ogukazu/Downloads/ippansaisyutu.csv`
- 入力PDF: `/Users/ogukazu/Downloads/r8tousyoyosanallpage.pdf`
- 設定: `config/budget-accounts.json`
- 対象: 一般会計と4つの特別会計

このフェーズでは対象会計、金額、PDF歳出表の範囲だけを確定した。
既存の `processed/*.csv` と変換・抽出処理は変更していない。

## 結論

- 2026年度の入力CSVにある会計は、対象として指定された5会計だけである。
- 5会計とも `当初補正区分名称 = 当初` で、`現計予算額` と
  `予算見積額` の会計別合計は一致する。
- active 4会計の現計予算額合計は `621,033,664千円` である。
- 学校給食費会計は1行・0円で、令和7年度末に廃止される会計として
  `abolished_zero` にする。PDF節抽出の対象にはしない。
- PDFページ範囲は、見出しだけの「3. 歳出予算」ページを除き、
  最初の款表から最後の予備費表までとする。

## CSVの会計一覧

CSVはBOMなしCP932、全10,250データ行・97列である。次表は
`年度 = 2026` の1,170行を会計名称で集計した結果である。

| account_code | CSV会計名称 | 行数 | 現計予算額合計 | 予算見積額合計 | status |
| --- | --- | ---: | ---: | ---: | --- |
| `general` | 一般会計 | 1,077 | 431,353,010 | 431,353,010 | `active` |
| `national_health_insurance` | 国民健康保険事業会計 | 29 | 84,206,905 | 84,206,905 | `active` |
| `latter_stage_elderly_healthcare` | 後期高齢者医療会計 | 17 | 29,414,796 | 29,414,796 | `active` |
| `long_term_care_insurance` | 介護保険事業会計 | 46 | 76,058,953 | 76,058,953 | `active` |
| `school_lunch_fee` | 学校給食費会計 | 1 | 0 | 0 | `abolished_zero` |

`現計予算額` はCSVの28列目、`予算見積額` は27列目である。設定の
`expected_amount_thousand_yen` には、確認できた現計予算額合計を採用した。

## account_code と会計種別

| account_code | account_type | budget_side | 用途 |
| --- | --- | --- | --- |
| `general` | `general` | `expenditure` | 既存の一般会計データ |
| `national_health_insurance` | `special` | `expenditure` | 国民健康保険事業会計 |
| `latter_stage_elderly_healthcare` | `special` | `expenditure` | 後期高齢者医療会計 |
| `long_term_care_insurance` | `special` | `expenditure` | 介護保険事業会計 |
| `school_lunch_fee` | `special` | `expenditure` | 廃止済み0円会計 |

`csv_account_name` はCSVの `会計名称` と完全一致させる。将来の
`budget_item_key` は、既存の一般会計キーを維持しつつ、会計部分を
`account_code` から組み立てる。

```text
2026_{account_code}_expenditure_{kan_code}_{kou_code}_{moku_code}
```

## PDF歳出予算の対象範囲

PDFページ番号は1始まり。PDFはA3横の見開きで、1 PDFページに冊子2ページが
収録されている。設定値は、節表抽出に使う実ページ範囲である。

| account_code | 歳出見出し冊子頁 | 抽出対象冊子頁 | PDFページ | 最終表 | 次の区分 |
| --- | ---: | ---: | ---: | --- | --- |
| `general` | 309 | 310-479 | 159-243 | 第12款 予備費 | 給与費明細書 481頁 / PDF 244 |
| `national_health_insurance` | 589 | 590-621 | 299-314 | 第34款 予備費 | 給与費明細書 623頁 / PDF 315 |
| `latter_stage_elderly_healthcare` | 667 | 668-679 | 338-343 | 第66款 予備費 | 給与費明細書 681頁 / PDF 344 |
| `long_term_care_insurance` | 749 | 750-791 | 379-399 | 第50款 予備費 | 給与費明細書 793頁 / PDF 400 |
| `school_lunch_fee` | - | 対象外 | 対象外 | - | 令和7年度末廃止 |

目次では各会計の「3. 歳出予算」が309、589、667、749頁から始まる。
これらは見出しだけのページで節表がない。既存の一般会計抽出がPDF 159ページ
（冊子310-311頁）から始まることに合わせ、特別会計も最初の款表が載る
PDFページから対象にする。

終了境界は、最後の予備費表と次の給与費明細書を本文と画像で確認した。

- 国民健康保険事業会計: PDF 314は冊子620-621頁の予備費表、
  PDF 315は給与費明細書の見出し。
- 後期高齢者医療会計: PDF 343は冊子678-679頁の予備費表、
  PDF 344は給与費明細書の見出し。
- 介護保険事業会計: PDF 399は冊子790-791頁の予備費表、
  PDF 400は給与費明細書の見出し。

## 会計ごとの扱い

### 一般会計

- `status = active`
- 既存の `budget_programs.csv`、`budget_sections.csv`、
  `budget_items.csv` の内容とキーを維持する。
- PDF範囲はPhase 3で処理済みの159-243ページを設定へ移す。

### 国民健康保険事業会計

- `status = active`
- CSVの29行を事業データ候補とする。
- PDF 299-314ページをstateful extractorの会計別実行対象とする。
- CSVの款コードは21、22、25、26、27、32、34で、PDF目次および
  歳出表の款コードと一致する。

### 後期高齢者医療会計

- `status = active`
- CSVの17行を事業データ候補とする。
- PDF 338-343ページをstateful extractorの会計別実行対象とする。
- CSVの款コードは61-66で、PDF歳出表の範囲と一致する。

### 介護保険事業会計

- `status = active`
- CSVの46行を事業データ候補とする。
- PDF 379-399ページをstateful extractorの会計別実行対象とする。
- CSVの款コードは41、42、45、46、48、49、50で、PDF目次および
  歳出表の款コードと一致する。

### 学校給食費会計

- `status = abolished_zero`
- CSVには款71「学校給食費」の1行があるが、現計予算額と
  予算見積額はいずれも0円である。
- PDF 29ページの予算規模説明には、学校給食費の無償化によって
  特別会計で収支を管理する必要がなくなり、令和7年度末で廃止されるとある。
- 令和8年度予算説明書の会計別目次には独立した歳出明細がない。
- PDF関連の4つの設定値は `null` とし、節抽出対象外にする。
- 将来の統合では、0円会計として保持してもPDF節の欠損エラーにはしない。

## 検証

active会計の期待額合計:

```text
431,353,010
 + 84,206,905
 + 29,414,796
 + 76,058,953
 = 621,033,664
```

| 検証項目 | 結果 |
| --- | --- |
| account_codeの重複 | 0件 |
| CSVにない対象会計 | 0件 |
| active会計の期待額合計 | 621,033,664 / PASS |
| 学校給食費会計の金額 | 0 / PASS |
| 学校給食費会計のstatus | `abolished_zero` / PASS |
| 学校給食費会計のPDF範囲 | 全て `null` / PASS |
| active会計のPDF範囲重複 | 0件 |

## 次フェーズの実装方針

1. `budget-programs.ts` の一般会計固定条件を設定駆動へ変更する。
2. account_codeを含む `budget_item_key` を会計ごとに生成する。
3. PDF抽出器をactive会計ごとのページ範囲で個別実行し、会計開始時に
   款・項・目の状態をリセットする。
4. 各会計単位でprogram合計、section合計、目別一致率を検証する。
5. 既存3CSVへ追加する前に、一般会計の行・ID・合計が変わらないことを
   回帰検証する。

## 関連資料

- [入力ファイルプロファイル](budget_data_input_profile.md)
- [PDF節抽出ノート](pdf_section_extraction_notes.md)
- [全体検証レポート](validation_report.md)
