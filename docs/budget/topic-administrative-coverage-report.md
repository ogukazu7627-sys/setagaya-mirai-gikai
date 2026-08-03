# 行政機能topic候補母集団レポート

## 位置づけ

**候補生成: PASS / 公開対象: archived**

このレポートは、令和8年度当初予算の公開用 `budget_program_identity` 1,156件を、
公式予算の会計・款・項・目から10大分類へ振り分けた候補生成用の母集団を記録する。
行政機能topicは網羅性の確認には使うが、範囲が広すぎるため本番グラフには公開しない。

- 全identity: 1,156件
- 初期10 topicの候補identity: 175件
- 初期10 topicの候補外だったidentity: 981件
- 行政機能topicの候補関係: 1,156件
- 行政機能topic間の重複: 0件
- 行政機能topicからの欠落: 0件
- 行政機能topicの公開状態: 10件すべて `archived`

以前の会話で使った984件は古い集計値である。現在の公開identityとreview CSVでは、
初期10 topicの候補175件はすべて異なるidentityであり、`1,156 - 175 = 981` 件となる。

## 分類別の母集団

| 大分類 | 行政機能topic候補 | identity |
| --- | --- | ---: |
| 教育 | 教育行政 | 124 |
| 子育て | 子ども・家庭行政 | 88 |
| 福祉 | 福祉・保健行政 | 352 |
| まちづくり | 都市基盤行政 | 147 |
| 防災 | 危機管理 | 25 |
| 行財政 | 行財政運営 | 116 |
| 文化・スポーツ | 文化・スポーツ行政 | 85 |
| 産業 | 産業・農業行政 | 42 |
| 環境問題 | 環境・清掃行政 | 48 |
| 暮らし | 地域・区民行政 | 129 |
| **合計** |  | **1,156** |

## 公開方針

行政機能topicは世田谷区の公式分類ではなく、みらい議会の候補生成用整理である。
現在は次の方針を優先する。

- topic名は14文字以下の短い語句にする。
- 公開topicは1大分類12件以下とする。
- 公開事業は1 topic 12件以下とする。
- `B_strong_structural`・`high`・正の予算額に加え、topicとの直接性が高い事業だけを公開する。
- 上限を埋めるために関連の弱い事業を承認しない。
- 未分類identityはエラーではない。検索、公式分類、全予算一覧から閲覧できる。
- 公式予算テーブル、金額、ID、dataset、Storageは変更しない。

現在の公開選定結果は
[`topic-publication-curation-report.md`](./topic-publication-curation-report.md)を参照する。

## 再生成

```bash
pnpm budget:web:topics:expand-definitions
pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data
pnpm budget:web:topics:curate
```

候補生成は既存の手動rejectを保持する。`curate` は短名、直接性、件数上限を決定的に
適用し、同じ入力から同じ出力を生成する。本番公開は
`Publish Reviewed Budget Topics` workflowだけから行う。
