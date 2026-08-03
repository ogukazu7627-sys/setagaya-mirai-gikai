# 予算事業の具体的topic候補生成レポート

## 判定

**候補生成: PASS**

初期10個の具体的topic候補に含まれていなかった981件を、行政機能topicを母集団として
56個の具体的topic候補へ分解した。この処理は候補生成であり、981件すべての公開を
意味しない。

- 対象identity: 981件
- 追加topic定義: 56件
- 追加候補関係: 981件
- identity重複: 0件
- identity欠落: 0件
- 初期10 topic候補175件との混入: 0件
- 根拠: `B_strong_structural`
- 確信度: `high`

topic名と関係は、みらい議会の探索用編集データであり、世田谷区の公式な課題分類では
ない。候補生成では意味によるファジーマッチを使わず、公式予算の会計または「目」を
主な構造根拠にした。

## 公開選定との分離

候補生成後に `budget:web:topics:curate` を実行し、短いtopic名と直接性を確認する。
候補だからという理由だけで公開せず、次をすべて満たす代表事業に限定する。

- 1大分類の公開topicは12件以下
- 1 topicの公開事業は12件以下
- `B_strong_structural` かつ `high`
- 予算額が0より大きい
- topic名と公式の事業名・目・項・部署との直接性がある
- 一般管理、人件費、基金などの周辺事業を優先しない

現在は76定義のうち64 topicを公開対象、12 topicをarchivedとし、582関係を公開対象に
している。公開topicに接続しない574 identityは正常で、検索、公式分類、全予算一覧から
閲覧できる。詳細は
[`topic-publication-curation-report.md`](./topic-publication-curation-report.md)を参照する。

## 再生成と公開

```bash
pnpm budget:web:topics:expand-definitions
pnpm budget:web:topics:candidates -- --input-dir /path/to/public-budget-data
pnpm budget:web:topics:curate
```

候補集合または公式項目が変わった場合、既存の手動レビュー結果を暗黙に破棄しない。
Supabaseへの登録はレビューCSVをコミット・レビューした後、既存の公開workflowから
実行する。本番の公式予算テーブル、金額、ID、dataset、Storageは変更しない。
