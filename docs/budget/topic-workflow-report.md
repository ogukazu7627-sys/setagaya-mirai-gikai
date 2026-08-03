# 予算課題・事業対応ワークフロー管理レポート

## 判定

**レビュー成果物: PASS**

このレポートは、コミットされたtopic定義とreview CSVの公開予定状態を示す。
実DBへの反映結果は、本番workflow末尾の `budget:web:topics:verify` で同じ成果物と照合する。

- 予算事業identity総数: 1,156
- topic定義数: 76
- 公開topic定義数: 64
- archived topic定義数: 12
- 公開対象関係数: 582
- 公開対象identity数: 582
- 未分類identity数: 574
- 非公開候補数: 1,730
- review待ち件数: 0

未分類identityはエラーではない。課題へ分類されていない事業も、検索、公式分類、
全予算一覧から閲覧できる。

## 大分類別

| 大分類 | 公開topic | 公開topicの候補 | 公開対象 | 非公開 | archived topic |
| --- | ---: | ---: | ---: | ---: | ---: |
| 教育 | 7 | 124 | 60 | 64 | 1 |
| 子育て | 6 | 88 | 47 | 41 | 1 |
| 福祉 | 12 | 333 | 135 | 198 | 2 |
| まちづくり | 9 | 147 | 82 | 65 | 1 |
| 防災 | 1 | 25 | 12 | 13 | 1 |
| 行財政 | 7 | 115 | 54 | 61 | 1 |
| 文化・スポーツ | 7 | 85 | 71 | 14 | 1 |
| 産業 | 3 | 41 | 28 | 13 | 2 |
| 環境問題 | 5 | 49 | 34 | 15 | 1 |
| 暮らし | 7 | 129 | 59 | 70 | 1 |
| **合計** | **64** | **1,136** | **582** | **554** | **12** |

archived topicの候補1,176件もreview CSVに監査用として保持する。公開topicの候補
1,136件と合わせた全候補は2,312件、全非公開候補は1,730件となる。

## 運用ルール

- topic名は14文字以下の短い語句とする。
- 公開topicは1大分類12件以下、公開事業は1 topic 12件以下とする。
- `A_official_direct` は公開7ファイルだけを根拠とする今回の候補生成では使用しない。
- `B_strong_structural`・`high`でも、topicとの直接性が弱い候補は公開しない。
- `C_editorial`、0円、一般管理、人件費、基金などの周辺候補を自動公開しない。
- 上限を埋めるために関連の弱い事業を承認しない。
- Supabaseへ送るのは `publicationStatus=published` のtopicと、そのreview CSVで
  `approve` または `revise` になった行だけである。
- `publicationStatus=archived` のtopicは既存の公開関係も冪等にarchivedへ変更する。
- グラフと公開APIは `published` topicかつ`published` relationだけを返す。

詳細な選定結果は
[`topic-publication-curation-report.md`](./topic-publication-curation-report.md)を参照する。

## 再生成・検証

```bash
pnpm budget:web:topics:expand-definitions
pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data
pnpm budget:web:topics:curate
pnpm budget:web:topics:report -- --input-dir /path/to/public-budget-data
```

本番公開は `main` の手動workflow `Publish Reviewed Budget Topics` だけから行う。
公式予算テーブル、金額、ID、dataset、Storageは変更しない。同じ成果物を再実行しても
topic・関係が重複せず、公開結果がreview CSVと完全一致することを検証する。
