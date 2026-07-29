---
title: "令和8年度当初予算 特別会計PDF節抽出サンプル検証"
created: 2026-07-28
updated: 2026-07-28
tags:
  - budget-data
  - pdf-extraction
  - setagaya
related:
  - special_accounts_plan
  - pdf_section_extraction_notes
status: draft
---

# 令和8年度当初予算 特別会計PDF節抽出サンプル検証

- 入力PDF: `/Users/ogukazu/Downloads/r8tousyoyosanallpage.pdf`
- 会計設定: `config/budget-accounts.json`
- 出力CSV: `processed/audit/raw_pdf_sections_special_sample.csv`
- 関連: [[special_accounts_plan]]、[[pdf_section_extraction_notes]]
- 対象外: 学校給食費会計（`abolished_zero`）

このPhaseでは、国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計
から合計8 PDFページだけを選び、一般会計のstateful extractorを流用できるか
検証した。`processed/core/budget_sections.csv` は更新していない。

## 結論

**3特別会計の全体抽出へ進める。判定はGOである。**

サンプル46節・11目はすべて `parse_status=matched` となり、
`needs_review` は0件だった。11目すべてで節金額合計と目の本年度予算額が
一致し、サンプル全体の両合計は `31,142,894千円` だった。

一般会計extractorの表検出、款・項・目境界、節抽出、目を閉じる際の金額検算は
そのまま利用できた。必要だった変更は、一般会計に固定されていた会計名などの
出力メタデータを引数化し、`account_code` を専用出力へ追加することだった。

## サンプルページ

各会計2〜3ページに限定し、各会計の総務費ページを必ず含めた。

| account_code | PDFページ | 冊子ページ | 選定理由 |
| --- | --- | --- | --- |
| `national_health_insurance` | 299〜300 | 590〜593 | 款21 総務費。一般管理費と1ページ複数目を確認 |
| `latter_stage_elderly_healthcare` | 338〜340 | 668〜673 | 款61 総務費と、異なる款・複数目を確認 |
| `long_term_care_insurance` | 379、396〜397 | 750〜751、784〜787 | 款41 総務費と、説明だけが次ページへ続く目を確認 |

PDFは左右2ページを1 PDFページに収めた見開き形式である。
CSVの `budget_book_page` は既存extractorと同様、右下の冊子ページ番号を保持する。
例えばPDF 299ページは冊子590〜591ページで、CSV値は `591` となる。

PDF 397ページには節行がないためCSV行は作られないが、選定した8ページには
含めてページ状態を検証している。CSVパーサーで読み取ったデータ行数は46行である。
`raw_text` 内の改行はCSVの引用符内に保持されるため、物理的な改行数とは一致しない。

## 会計別結果

| account_code | 選定ページ数 | 節行 | 目 | 金額一致目 | matched | needs_review | 節合計 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `national_health_insurance` | 2 | 14 | 4 | 4 | 14 | 0 | 1,160,268 |
| `latter_stage_elderly_healthcare` | 3 | 14 | 4 | 4 | 14 | 0 | 29,146,290 |
| `long_term_care_insurance` | 3 | 18 | 3 | 3 | 18 | 0 | 836,336 |
| **合計** | **8** | **46** | **11** | **11** | **46** | **0** | **31,142,894** |

ページ分類は `detail_page=7`、`continuation_page=1` だった。
`summary_page` と `table_detection_failed` は今回の出力サンプルでは発生していない。

## 目別金額検算

| account_code | 款-項-目 | 目名称 | PDFページ範囲 | 節数 | 節合計 | 目本年度予算額 | 結果 |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| `national_health_insurance` | 21-01-01 | 一般管理費 | 299 | 7 | 1,137,613 | 1,137,613 | matched |
| `national_health_insurance` | 21-01-02 | 運営協議会費 | 300 | 3 | 524 | 524 | matched |
| `national_health_insurance` | 21-01-03 | 趣旨普及費 | 300 | 3 | 5,606 | 5,606 | matched |
| `national_health_insurance` | 21-01-04 | 連合会負担金 | 300 | 1 | 16,525 | 16,525 | matched |
| `latter_stage_elderly_healthcare` | 61-01-01 | 一般管理費 | 338 | 7 | 679,956 | 679,956 | matched |
| `latter_stage_elderly_healthcare` | 62-01-01 | 広域連合分賦金 | 339 | 1 | 27,794,600 | 27,794,600 | matched |
| `latter_stage_elderly_healthcare` | 63-01-01 | 健康診査費 | 340 | 5 | 667,092 | 667,092 | matched |
| `latter_stage_elderly_healthcare` | 63-01-02 | その他健康保持増進費 | 340 | 1 | 4,642 | 4,642 | matched |
| `long_term_care_insurance` | 41-01-01 | 一般管理費 | 379 | 6 | 374,163 | 374,163 | matched |
| `long_term_care_insurance` | 49-02-01 | 包括的支援事業費 | 396 | 6 | 172,027 | 172,027 | matched |
| `long_term_care_insurance` | 49-02-02 | 任意事業費 | 396〜397 | 6 | 290,146 | 290,146 | matched |

## ページまたぎ

介護保険事業会計のPDF 396ページでは、款49・項02・目02 任意事業費の
6節が掲載され、その後の説明がPDF 397ページへ続く。PDF 397ページには
新しい目境界も節行もなく、右側の説明欄だけが継続する。

stateful extractorは次の状態をPDF 396から397ページへ保持できた。

- `current_kan`: 49 地域支援事業費
- `current_kou`: 02 包括支援事業・任意事業費
- `current_moku`: 02 任意事業費

PDF 397ページは `continuation_page` と分類され、目のページ範囲は
`396-397` となった。処理範囲を閉じる時点で6節合計 `290,146千円` と
目本年度予算額 `290,146千円` が一致し、6行すべてを `matched` とした。
説明だけの継続ページをエラー行としてCSVへ追加していない。

## 一般会計とのレイアウト差

1. **会計名は各ページの表見出しに明示されない**  
   ページ見出しは款・項だけの場合がある。`config/budget-accounts.json` の
   会計別PDF範囲を処理単位にし、範囲から `account_code` と
   `account_name` を確定する必要がある。

2. **款コードの開始値が会計ごとに異なる**  
   国保は21、後期高齢者医療は61、介護保険は41から始まる。
   一般会計の01始まりを仮定せず、PDF上の2桁コードをそのまま保持する。

3. **小規模会計は集計と明細が同じ見開きに収まりやすい**  
   一般会計より1目あたりの行数が少なく、NHI PDF 300ページのように
   1ページに複数の目が並ぶ。縦座標順の目境界・節行イベント処理はそのまま通る。

4. **説明だけの継続ページがある**  
   介護保険PDF 397ページでは節表の区分・金額が空でも説明欄に続きがある。
   節行がないことだけで `summary_page` とせず、説明欄を見て
   `continuation_page` と判定し、`current_moku` を保持する必要がある。

5. **節名称が改行される**  
   `13 使用料及賃借料` や `18 負担金補助及交付金` がセル内で改行される。
   正規化列では空白と改行を除いて名称を連結し、`raw_text` には原文を保持する。

6. **見開きページ番号の扱いが必要**  
   PDF 1ページに冊子2ページがある。現在の単一
   `budget_book_page` 列には右ページ番号を入れる既存仕様を継続する。

## needs_review

今回の `needs_review` は0件で、`review_reason` は全行空欄である。
今後、節値解析失敗、階層欠落、目合計不一致、引継ぎ元の目がない継続節が
発生した場合は `parse_status=needs_review` とし、既存extractorの原因コードと
検算値を `review_reason` に残す。

## 全体抽出へ進む条件

3会計の全ページ抽出は、次の条件を守って進める。

1. 会計ごとにstateful extractorを新しく開始し、会計境界で状態をリセットする。
2. PDF範囲は `config/budget-accounts.json` を唯一の設定元にする。
3. 節行のない集計ページは正常スキップし、説明継続ページとは区別する。
4. 全目を閉じた後、会計別の節合計を設定済み期待額と照合する。
5. `needs_review` が残る場合は、原因別に解消してから
   `processed/core/budget_sections.csv` へ追加する。
6. 学校給食費会計は `abolished_zero` のためPDF抽出対象に含めない。

## 実装と再現方法

- 抽出器:
  `packages/budget-data/scripts/extract_pdf_sections_special_sample.py`
- 回帰テスト:
  `packages/budget-data/scripts/test_extract_pdf_sections_special_sample.py`
- 一般会計stateful extractor:
  `packages/budget-data/scripts/extract_pdf_sections_stateful.py`

```bash
python3 packages/budget-data/scripts/extract_pdf_sections_special_sample.py \
  --input raw/r8tousyoyosanallpage.pdf \
  --config config/budget-accounts.json \
  --output processed/audit/raw_pdf_sections_special_sample.csv
```

PDF実体を使う全抽出テストでは、一般会計の既存回帰を含む20テストが成功した。

```bash
BUDGET_PDF_PATH=raw/r8tousyoyosanallpage.pdf \
python3 -m unittest discover \
  -s packages/budget-data/scripts \
  -p 'test_*.py'
```

## このPhaseで行っていないこと

- 特別会計の全ページ抽出
- `processed/core/budget_sections.csv` の更新
- `processed/core/budget_items.csv` の更新
- 一般会計・特別会計の節データ統合
- DBスキーマ変更やデータ投入
