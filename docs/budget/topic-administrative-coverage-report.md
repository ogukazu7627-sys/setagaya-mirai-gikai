# 予算事業の全件到達用topicレポート

> このレポートは行政機能topicによる全件到達を記録したもの。981件を56個の具体的topicへ
> 展開した後の結果は `docs/budget/topic-concrete-expansion-report.md` を参照する。

## 判定

**PASS**

令和8年度当初予算の公開用 `budget_program_identity` 1,156件を、10大分類の
行政機能topicのいずれかへ、重複なく1回ずつ接続した。

- 全identity: 1,156件
- 初期10 topicの候補identity: 175件
- 初期10 topicの候補外だったidentity: 981件
- 行政機能topicの関係候補: 1,156件
- 行政機能topic間の重複: 0件
- 行政機能topicからの欠落: 0件
- 根拠: 全件 `B_strong_structural`
- 確信度: 全件 `high`
- 判断: 全件 `approve`

以前の会話で使った984件は古い集計値だった。現在の公開identityとreview CSVを
再集計すると、初期10 topicの候補175件はすべて異なるidentityであり、
`1,156 - 175 = 981` 件が正しい。

## 分類別

| 大分類 | 行政機能topic | identity |
| --- | --- | ---: |
| 教育 | 教育・学びを支える行政 | 124 |
| 子育て | 子ども・若者・子育てを支える行政 | 88 |
| 福祉 | 福祉・保健・社会保障を支える行政 | 352 |
| まちづくり | 道路・公園・住まいを支える行政 | 147 |
| 防災 | 防災・危機管理を支える行政 | 25 |
| 行財政 | 区政・財政・議会を支える行政 | 116 |
| 文化・スポーツ | 文化・スポーツ・生涯学習を支える行政 | 85 |
| 産業 | 商工・農業・消費生活を支える行政 | 42 |
| 環境問題 | 環境・清掃・資源循環を支える行政 | 48 |
| 暮らし | 地域・窓口・区民生活を支える行政 | 129 |
| **合計** |  | **1,156** |

## 意味づけ

行政機能topicは、公式予算の会計・款・項・目を根拠にした、みらい議会の探索用整理で
ある。世田谷区の公式な課題分類ではなく、個別事業の目的や効果を推測するものでもない。

- 既存のproblem / goal topicは、具体的な課題・目標として引き続き表示する。
- administrative_function topicは、全予算へ分野から到達するための基礎レイヤーとする。
- 既存のreject 8件は、該当する個別課題・目標との関係ではrejectのまま維持する。
- rejectされたidentityも、別の意味である行政機能topicからは閲覧できる。
- 公式予算テーブル、金額、ID、dataset、Storageは変更しない。

## review全体

| 指標 | 件数 |
| --- | ---: |
| topic定義 | 20 |
| review CSV | 20 |
| 候補関係 | 1,331 |
| approve / revise | 1,323 |
| reject | 8 |
| pending | 0 |
| 候補に含まれるidentity | 1,156 |

行政機能topic反映時点の実績は、published topic 20件、published relation 1,323件、
published identity 1,156件、未分類identity 0件である。具体的topic展開後の期待値は、
published topic 76件、published relation 2,304件である。

## 再生成

```bash
pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data
pnpm budget:web:topics:review -- --auto-approve-only
```

候補生成は既存の人間判断を上書きせず、公式項目または候補集合が変わった場合は停止する。
本番公開は `Publish Reviewed Budget Topics` workflowだけから行う。
