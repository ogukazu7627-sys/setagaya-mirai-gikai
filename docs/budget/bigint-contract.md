# 予算金額の bigint 型契約

## 対象

令和8年度当初予算の金額列は千円単位で扱う。DB、Supabase生成型、
インポートCLI、JSON、将来のServer Component/APIの間で、次の契約を守る。

## レイヤー別の型

| レイヤー | 型 | 契約 |
| --- | --- | --- |
| PostgreSQL | `BIGINT` | 符号付き64 bit整数として保存する |
| Supabase生成型 | `number` | 現行の型生成結果を維持する |
| インポートCLI | `number` | `Number.isSafeInteger`相当のZod検証を通した値だけを扱う |
| JSON payload / API response | JSON number | JavaScriptの安全整数範囲内だけを送受信する |
| Server Component / API | `number` | スキーマ検証後の値だけで計算・表示する |

現在の全会計合計 `621,033,664` 千円を含む公開予算データは、
`Number.MAX_SAFE_INTEGER` より十分小さい。

## 必須ルール

1. 金額は整数でなければならない。
2. CLIで受け付ける範囲は
   `Number.MIN_SAFE_INTEGER` から `Number.MAX_SAFE_INTEGER` までとする。
3. `bigint` 値を `JSON.stringify` へ直接渡さない。
4. DBから返った値を無検証で加算・集計しない。
5. `number` へ変換する場合は、変換後に `Number.isSafeInteger` を確認する。
6. 将来、安全整数範囲を超える可能性が生じた場合は、暗黙変換を追加せず、
   schema versionを更新して10進文字列のAPI契約へ移行する。

## 現在の実装

- PostgreSQL migrationの金額列はすべて`BIGINT`。
- `packages/supabase/types/supabase.types.ts`の生成型は`number`。
- `public-budget-dataset-schemas.ts`の`budgetSafeIntegerSchema`が、
  CSV変換後とJSON入力の整数範囲を検証する。
- `allocation_amount_thousand_yen`は配分額不明のため常に`null`。

## テスト

`packages/seed/budget/bigint-contract.test.ts`で次を固定する。

- 安全整数の上限・下限は受け付ける。
- 安全整数範囲外は拒否する。
- JavaScript `BigInt`の直接JSONシリアライズは失敗する。
