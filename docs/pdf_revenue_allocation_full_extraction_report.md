# 歳入PDF「充当事業」全体抽出レポート

## 最終判定: PASS

- 対象は一般会計、国民健康保険事業会計、後期高齢者医療会計、介護保険事業会計の歳入PDF範囲。
- 学校給食費会計は`abolished_zero`のためPDF抽出対象外。
- 会計ごとに先頭物理ページから末尾物理ページまで連続処理した。
- OCRは使用せず、PDFテキスト層と表座標を使用した。
- CSV側の`revenue_detail_id`、歳出`budget_program_group_id`とは結合していない。
- 充当先別金額は推測せず、`allocation_amount_thousand_yen`も作成していない。

## Phase 26必須ゲート

| 項目 | 結果 |
| --- | ---: |
| 対象物理ページ | 25 |
| PDFの充当事業記載数 | 325 |
| 出力行数 | 325 |
| parsed | 325 |
| needs_review | 0 |
| raw_allocation_id一意数 | 325 |
| 既存parsed行の想定外差分 | 0 |

PDF物理67ページ固定回帰:

- `saisetsu_code`: `05`
- `pdf_revenue_detail_name`: 生活困窮者自立相談支援事業費(会計年度任用職員人件費)
- `pdf_department_name`: 保健福祉政策部
- `pdf_revenue_amount_thousand_yen`: 11,497
- `pdf_target_program_name`: 会計年度任用職員の人件費(保健福祉政策部)
- `target_budget_book_page`: 467
- `parse_status`: `parsed`

ゲートが全条件を満たした後にだけ全ページ処理を開始した。

## 全体抽出結果

| 項目 | 結果 |
| --- | ---: |
| 対象物理ページ | 165 |
| PDFの充当事業記載数 | 1,948 |
| 出力行数 | 1,948 |
| raw_allocation_id一意数 | 1,948 |
| parsed | 1,948 |
| needs_review | 0 |
| 複数充当先を持つ細節 | 27 |
| 検証エラー | 0 |

| account_code | 物理ページ | PDF記載 | 出力行 | needs_review | 冊子ページ検証エラー |
| --- | ---: | ---: | ---: | ---: | ---: |
| `general` | 121 | 1,626 | 1,626 | 0 | 0 |
| `national_health_insurance` | 13 | 84 | 84 | 0 | 0 |
| `latter_stage_elderly_healthcare` | 10 | 29 | 29 | 0 | 0 |
| `long_term_care_insurance` | 21 | 209 | 209 | 0 | 0 |

- 出力: `/Users/ogukazu/Documents/デジタル民主主義/tools/mirai-gikai-budget-data-input-profile/processed/raw_pdf_revenue_allocations.csv`
- 出力SHA-256: `afd411a37cbdee0e6d5617855279efa962fa90019d2496d4560625c8a9682d61`

## ページ種別

| page_type | ページ数 |
| --- | ---: |
| `detail_page` | 143 |
| `no_allocation_page` | 18 |
| `summary_page` | 4 |

## ページ別照合

| account_code | PDF物理ページ | 期待冊子ページ | フッター冊子ページ | PDF記載 | 出力行 | needs_review | page_type | 記載数判定 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `general` | 37 | 67 | 67 | 0 | 0 | 0 | `summary_page` | 一致 |
| `general` | 38 | 69 | 69 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 39 | 71 | 71 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 40 | 73 | 73 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 41 | 75 | 75 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 42 | 77 | 77 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 43 | 79 | 79 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 44 | 81 | 81 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 45 | 83 | 83 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 46 | 85 | 85 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 47 | 87 | 87 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 48 | 89 | 89 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 49 | 91 | 91 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 50 | 93 | 93 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 51 | 95 | 95 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 52 | 97 | 97 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 53 | 99 | 99 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 54 | 101 | 101 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 55 | 103 | 103 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 56 | 105 | 105 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 57 | 107 | 107 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 58 | 109 | 109 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 59 | 111 | 111 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 60 | 113 | 113 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 61 | 115 | 115 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 62 | 117 | 117 | 21 | 21 | 0 | `detail_page` | 一致 |
| `general` | 63 | 119 | 119 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 64 | 121 | 121 | 1 | 1 | 0 | `detail_page` | 一致 |
| `general` | 65 | 123 | 123 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 66 | 125 | 125 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 67 | 127 | 127 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 68 | 129 | 129 | 14 | 14 | 0 | `detail_page` | 一致 |
| `general` | 69 | 131 | 131 | 8 | 8 | 0 | `detail_page` | 一致 |
| `general` | 70 | 133 | 133 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 71 | 135 | 135 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 72 | 137 | 137 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 73 | 139 | 139 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 74 | 141 | 141 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 75 | 143 | 143 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 76 | 145 | 145 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 77 | 147 | 147 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 78 | 149 | 149 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 79 | 151 | 151 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 80 | 153 | 153 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 81 | 155 | 155 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 82 | 157 | 157 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 83 | 159 | 159 | 7 | 7 | 0 | `detail_page` | 一致 |
| `general` | 84 | 161 | 161 | 6 | 6 | 0 | `detail_page` | 一致 |
| `general` | 85 | 163 | 163 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 86 | 165 | 165 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 87 | 167 | 167 | 10 | 10 | 0 | `detail_page` | 一致 |
| `general` | 88 | 169 | 169 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 89 | 171 | 171 | 13 | 13 | 0 | `detail_page` | 一致 |
| `general` | 90 | 173 | 173 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 91 | 175 | 175 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 92 | 177 | 177 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 93 | 179 | 179 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 94 | 181 | 181 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 95 | 183 | 183 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 96 | 185 | 185 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 97 | 187 | 187 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 98 | 189 | 189 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 99 | 191 | 191 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 100 | 193 | 193 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 101 | 195 | 195 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 102 | 197 | 197 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 103 | 199 | 199 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 104 | 201 | 201 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 105 | 203 | 203 | 14 | 14 | 0 | `detail_page` | 一致 |
| `general` | 106 | 205 | 205 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 107 | 207 | 207 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 108 | 209 | 209 | 14 | 14 | 0 | `detail_page` | 一致 |
| `general` | 109 | 211 | 211 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 110 | 213 | 213 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 111 | 215 | 215 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 112 | 217 | 217 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 113 | 219 | 219 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 114 | 221 | 221 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 115 | 223 | 223 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 116 | 225 | 225 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 117 | 227 | 227 | 13 | 13 | 0 | `detail_page` | 一致 |
| `general` | 118 | 229 | 229 | 3 | 3 | 0 | `detail_page` | 一致 |
| `general` | 119 | 231 | 231 | 22 | 22 | 0 | `detail_page` | 一致 |
| `general` | 120 | 233 | 233 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 121 | 235 | 235 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 122 | 237 | 237 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 123 | 239 | 239 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 124 | 241 | 241 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 125 | 243 | 243 | 6 | 6 | 0 | `detail_page` | 一致 |
| `general` | 126 | 245 | 245 | 14 | 14 | 0 | `detail_page` | 一致 |
| `general` | 127 | 247 | 247 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 128 | 249 | 249 | 1 | 1 | 0 | `detail_page` | 一致 |
| `general` | 129 | 251 | 251 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 130 | 253 | 253 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 131 | 255 | 255 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 132 | 257 | 257 | 8 | 8 | 0 | `detail_page` | 一致 |
| `general` | 133 | 259 | 259 | 5 | 5 | 0 | `detail_page` | 一致 |
| `general` | 134 | 261 | 261 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 135 | 263 | 263 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 136 | 265 | 265 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 137 | 267 | 267 | 10 | 10 | 0 | `detail_page` | 一致 |
| `general` | 138 | 269 | 269 | 12 | 12 | 0 | `detail_page` | 一致 |
| `general` | 139 | 271 | 271 | 0 | 0 | 0 | `no_allocation_page` | 一致 |
| `general` | 140 | 273 | 273 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 141 | 275 | 275 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 142 | 277 | 277 | 15 | 15 | 0 | `detail_page` | 一致 |
| `general` | 143 | 279 | 279 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 144 | 281 | 281 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 145 | 283 | 283 | 20 | 20 | 0 | `detail_page` | 一致 |
| `general` | 146 | 285 | 285 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 147 | 287 | 287 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 148 | 289 | 289 | 16 | 16 | 0 | `detail_page` | 一致 |
| `general` | 149 | 291 | 291 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 150 | 293 | 293 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 151 | 295 | 295 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 152 | 297 | 297 | 19 | 19 | 0 | `detail_page` | 一致 |
| `general` | 153 | 299 | 299 | 17 | 17 | 0 | `detail_page` | 一致 |
| `general` | 154 | 301 | 301 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 155 | 303 | 303 | 18 | 18 | 0 | `detail_page` | 一致 |
| `general` | 156 | 305 | 305 | 7 | 7 | 0 | `detail_page` | 一致 |
| `general` | 157 | 307 | 307 | 5 | 5 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 285 | 563 | 563 | 0 | 0 | 0 | `summary_page` | 一致 |
| `national_health_insurance` | 286 | 565 | 565 | 16 | 16 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 287 | 567 | 567 | 3 | 3 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 288 | 569 | 569 | 2 | 2 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 289 | 571 | 571 | 1 | 1 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 290 | 573 | 573 | 18 | 18 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 291 | 575 | 575 | 19 | 19 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 292 | 577 | 577 | 12 | 12 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 293 | 579 | 579 | 1 | 1 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 294 | 581 | 581 | 3 | 3 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 295 | 583 | 583 | 1 | 1 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 296 | 585 | 585 | 7 | 7 | 0 | `detail_page` | 一致 |
| `national_health_insurance` | 297 | 587 | 587 | 1 | 1 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 327 | 647 | 647 | 0 | 0 | 0 | `summary_page` | 一致 |
| `latter_stage_elderly_healthcare` | 328 | 649 | 649 | 3 | 3 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 329 | 651 | 651 | 1 | 1 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 330 | 653 | 653 | 13 | 13 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 331 | 655 | 655 | 1 | 1 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 332 | 657 | 657 | 1 | 1 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 333 | 659 | 659 | 3 | 3 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 334 | 661 | 661 | 1 | 1 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 335 | 663 | 663 | 3 | 3 | 0 | `detail_page` | 一致 |
| `latter_stage_elderly_healthcare` | 336 | 665 | 665 | 3 | 3 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 357 | 707 | 707 | 0 | 0 | 0 | `summary_page` | 一致 |
| `long_term_care_insurance` | 358 | 709 | 709 | 18 | 18 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 359 | 711 | 711 | 16 | 16 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 360 | 713 | 713 | 1 | 1 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 361 | 715 | 715 | 18 | 18 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 362 | 717 | 717 | 19 | 19 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 363 | 719 | 719 | 19 | 19 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 364 | 721 | 721 | 6 | 6 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 365 | 723 | 723 | 18 | 18 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 366 | 725 | 725 | 5 | 5 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 367 | 727 | 727 | 18 | 18 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 368 | 729 | 729 | 14 | 14 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 369 | 731 | 731 | 1 | 1 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 370 | 733 | 733 | 18 | 18 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 371 | 735 | 735 | 21 | 21 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 372 | 737 | 737 | 3 | 3 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 373 | 739 | 739 | 1 | 1 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 374 | 741 | 741 | 2 | 2 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 375 | 743 | 743 | 3 | 3 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 376 | 745 | 745 | 1 | 1 | 0 | `detail_page` | 一致 |
| `long_term_care_insurance` | 377 | 747 | 747 | 7 | 7 | 0 | `detail_page` | 一致 |

PDF物理53ページは冊子99ページ、PDF物理358ページは冊子709ページとして検証済み。

## 会計終了時state

| account_code | 款 | 項 | 目 | 節 | 細節 | 細節名 | 金額（千円） | 充当事業数 |
| --- | --- | --- | --- | --- | --- | --- | ---: | ---: |
| `general` | 20 | 01 | 04 | 01 | 05 | 小学校用地買収 | 83000 | 1 |
| `national_health_insurance` | 29 | 04 | 01 | 02 | 01 | 職員給与費(保健事業費受託事業収入) | 6000 | 1 |
| `latter_stage_elderly_healthcare` | 65 | 05 | 03 | 03 | 01 | 未収金補填分負担金返還金 | 1 | 1 |
| `long_term_care_insurance` | 50 | 04 | 05 | 01 | 08 | 会計年度任用職員社会保険料(高齢福祉部) | 31657 | 1 |

ページ末尾ではstateを閉じず、会計末尾でこの状態を確定した。

## 検証エラー

| 原因コード | account_code | PDFページ | raw_allocation_id | 期待値 | 実際値 | 内容 |
| --- | --- | ---: | --- | --- | --- | --- |
| - | - | - | - | - | - | 0件 |

## 金額複製防止

- 同一細節の`allocation_sequence=1`だけに細節金額を保持。
- `allocation_sequence=2`以降の金額欄は全件空欄。
- 充当先別の配分額は保持・推測していない。

## このPhaseで作成していないもの

- `processed/budget_revenue_allocations.csv`
- CSV側`revenue_detail_id`との結合
- 歳出`budget_program_group_id`との結合
- 充当先別金額
