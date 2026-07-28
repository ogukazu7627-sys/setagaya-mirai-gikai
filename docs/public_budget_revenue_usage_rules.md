---
title: "令和8年度当初予算 公開歳入データ利用ルール"
updated: 2026-07-29
tags:
  - みらい議会
  - 世田谷区
  - 予算
  - 公開データ
related:
  - 世田谷区令和8年度予算データ基盤
---

# 令和8年度当初予算 公開歳入データ利用ルール

## 対象

公開対象は令和8年度世田谷区当初予算の歳入予算と、公式予算説明書に記載された歳入細節・歳出予算事業の関連である。実収入、決算、契約、事業者、事業ごとの配分額は対象外。

## 公開成果物

| ファイル | 粒度・用途 |
| --- | --- |
| `public_budget_revenue_details.csv` | 歳入細節×所属。検索・一覧用 |
| `public_budget_revenue_items.json` | 款・項・目単位。節と細節を兄弟配列で持つ詳細・AI用モデル |
| `public_budget_revenue_allocations.json` | 歳入細節と歳出予算事業の関係。金額を持たない |

公開成果物はコアCSVから派生生成し、コアの値、ID、行数を変更しない。

## 一般会計と特別会計

一般会計は`revenueSourceDisplay.mode=general_and_specific`とし、「一般財源」「特定財源」の2区分を表示できる。

特別会計は`revenueSourceDisplay.mode=source_categories`とし、国民健康保険料、後期高齢者医療保険料、繰入金、国庫支出金、都支出金など、公式CSVの`source_funding_category_name`単位で表示する。特別会計を「一般財源／特定財源」に二分して表示してはいけない。

## 充当関係

- allocationは関係データであり、金銭フローデータではない。
- `allocationAmountThousandYen`は全件`null`、`amountAttributionStatus`は全件`not_available`。
- allocationを合計してはいけない。
- sourceの歳入額を複数targetへコピーしてはいけない。
- 関連する歳入があることと、その全額が当該事業へ充当されることは同義ではない。
- 金額付きサンキー図を作ってはいけない。

`exact_group`は内部予算事業groupまで一意に確定した関係で、`targetBudgetProgramGroupId`を持つ。`public_identity`は公式PDFから内部groupを区別できず、group IDを`null`のまま`targetBudgetProgramIdentityId`へ接続する。public identityを候補groupへ推測で割り当ててはいけない。

## 0円データ

0円のdetails・itemsは公開成果物に保持する。通常検索では`is_zero_amount=true`を除外し、`includeZeroAmount=true`の場合だけ含める。

## AI制約

AIコンテキストには次の4文を改変せず含める。

> このデータは令和8年度当初予算であり、実際に収入された金額や決算額ではありません。

> budget_revenue_allocationsは歳入細節と歳出予算事業の関連を示しますが、事業ごとの配分額は示しません。

> 1つの歳入細節が複数事業に関連する場合があります。歳入額を各事業へ複製してはいけません。

> 関連する歳入があることと、その歳入全額が当該事業に充当されることは同義ではありません。

当初予算を実績と表現してはいけない。配分額が不明な状態で「この事業に○円使われる」と断定してはいけない。

## 回答不能コード

| reasonCode | 対象 |
| --- | --- |
| `ACTUAL_REVENUE_NOT_AVAILABLE` | 実際の収入額・徴収実績 |
| `REVENUE_SETTLEMENT_NOT_AVAILABLE` | 決算・収入済額・未収額 |
| `REVENUE_ALLOCATION_AMOUNT_NOT_AVAILABLE` | 事業ごとの配分・充当額 |
| `CONTRACT_DATA_NOT_AVAILABLE` | 契約額・契約情報 |
| `VENDOR_DATA_NOT_AVAILABLE` | 事業者・契約先・支払先 |

## 利用関数

- `searchPublicBudgetRevenues(query, options)`
- `getPublicBudgetRevenueItemDetail(revenueItemKey, revenueItems)`
- `getRelatedExpenditurePrograms(revenueDetailId, allocations)`
- `getRelatedRevenuesForBudgetProgram(budgetProgramGroupId, allocations, details)`
- `buildBudgetRevenueAiContext(result)`

`getRelatedRevenuesForBudgetProgram`は、内部groupまで確定した`exact_group`だけを返す。`public_identity`を個別groupの関連歳入として返してはいけない。

## 出典

歳入細節は公式CSVのファイル名・論理行番号、allocationは公式PDFの物理ページ・冊子ページを保持する。内部部署略称は公開せず、根拠付き表示名がない場合は空欄または`null`とする。

## 生成

```bash
pnpm budget:revenue:public
```
