# 予算課題・事業対応ワークフロー管理レポート

## 判定

**PASS**

- active dataset: `7ebaad4a-a9dd-4473-90a2-c14f955ebd64`
- manifest SHA-256: `dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7`
- 予算事業identity総数: 1156
- topic定義数: 10
- 候補に含まれるidentity数: 175
- 公開済みidentity数: 13
- 未分類identity数: 1143
- 公開済みtopic-program関係数: 13
- review待ち件数: 159

未分類identityはエラーではない。課題へ分類されていない事業も、検索、公式分類、全予算一覧から閲覧できる。

## 大分類別

| 大分類 | topic数 | 候補 | B | C | review待ち | approve/revise | 公開済み関係 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 教育 | 1 | 16 | 13 | 3 | 0 | 13 | 13 |
| 子育て | 1 | 17 | 17 | 0 | 17 | 0 | 0 |
| 福祉 | 1 | 23 | 23 | 0 | 23 | 0 | 0 |
| まちづくり | 1 | 5 | 4 | 1 | 5 | 0 | 0 |
| 防災 | 1 | 25 | 21 | 4 | 25 | 0 | 0 |
| 行財政 | 1 | 8 | 6 | 2 | 8 | 0 | 0 |
| 文化・スポーツ | 1 | 16 | 14 | 2 | 16 | 0 | 0 |
| 産業 | 1 | 25 | 20 | 5 | 25 | 0 | 0 |
| 環境問題 | 1 | 6 | 6 | 0 | 6 | 0 | 0 |
| 暮らし | 1 | 34 | 34 | 0 | 34 | 0 | 0 |

## topic別

| 大分類 | topic | 候補 | B | C | approve/revise | reject | review待ち | 公開済み事業 | topic状態 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 教育 | 学校施設の老朽化への対応 | 16 | 13 | 3 | 13 | 3 | 0 | 13 | published |
| 子育て | 保育サービスと保育環境の充実 | 17 | 17 | 0 | 0 | 0 | 17 | 0 | not_published |
| 福祉 | 介護予防と地域生活の支援 | 23 | 23 | 0 | 0 | 0 | 23 | 0 | not_published |
| まちづくり | 道路・橋梁の維持と安全確保 | 5 | 4 | 1 | 0 | 0 | 5 | 0 | not_published |
| 防災 | 災害への備えと地域防災力の向上 | 25 | 21 | 4 | 0 | 0 | 25 | 0 | not_published |
| 行財政 | 行政サービスと情報基盤のデジタル化 | 8 | 6 | 2 | 0 | 0 | 8 | 0 | not_published |
| 文化・スポーツ | スポーツに親しめる環境づくり | 16 | 14 | 2 | 0 | 0 | 16 | 0 | not_published |
| 産業 | 地域の事業者と産業の成長支援 | 25 | 20 | 5 | 0 | 0 | 25 | 0 | not_published |
| 環境問題 | 脱炭素と再生可能エネルギーの推進 | 6 | 6 | 0 | 0 | 0 | 6 | 0 | not_published |
| 暮らし | 身近な地域施設の維持と活用 | 34 | 34 | 0 | 0 | 0 | 34 | 0 | not_published |

## 運用ルール

- `A_official_direct` は公開7ファイルだけを根拠とする今回の候補生成では使用しない。
- Bは公式の款・項・目、事業名、部署名から構造的に強く判断できる候補である。
- Cは編集判断を多く含み、`review_decision` が空欄のまま自動公開しない。
- Supabaseへ送るのは、人間が全候補を確認し、`approve` または `revise` とした行だけである。
- `reject` は公開関係から除外する。空欄は未判断として、既存公開関係の削除にも使わない。
- グラフと公開APIは、`published` topicかつ`published` relationだけを返す。

## 再生成

候補生成:

`pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data`

管理レポート:

`pnpm budget:web:topics:report -- --input-dir /path/to/public-budget-data`

公開前dry-run:

`pnpm budget:web:topics:publish -- --input-file data/budget/editorial/review/<review-file>.csv`
