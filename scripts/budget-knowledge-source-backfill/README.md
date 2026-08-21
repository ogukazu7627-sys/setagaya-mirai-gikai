# 予算記事 knowledge source backfill

令和8年3月予算特別委員会の公開済み `budget` 記事441件へ、対応する
質疑原文txtの全文を `String.prototype.trim()` した値だけを設定するための
一回限りではない再実行可能なCLIです。

このCLIは、記事本文・公開状態・公開日時を変更する用途には使いません。
Admin API側でも、公開済み `budget` の `knowledge_source` だけに更新対象を
限定する必要があります。

## 安全モデル

- 対象会期UUIDと公開種別はコード内で固定しています。
- tokenは `ADMIN_API_TOKEN` 環境変数からだけ読みます。引数、envファイル、
  manifest、journalへは保存しません。
- tokenの別origin送信を防ぐため、base URLは本番originに固定し、ローカル検証時
  だけlocalhostを許可します。endpointも同一originのpath/queryに限定します。
- 既定動作はGETだけのdry-runです。PATCHには `--apply`、実manifestの
  SHA-256、`canary` または `rollout` phaseが必要です。
- applyは各IDで `GET → name/session/published_at/updated_at/current hash guard
  → PATCH → GET照合` の順に行います。
- canary 1件の成功が同じjournalに記録されるまでrolloutできません。
- PATCHの通信結果が不明な場合は停止します。再実行時のGETで、対象SHAと
  完全一致していれば適用済みとして安全に再開します。
- cache再検証警告がjournalに記録された場合、同じmanifest・operation・
  journalでのapply再開は停止します。同値GETだけで警告を解決済みにしません。
- applyは既に目標値のIDにも同値PATCHを送り、cache再検証とGET照合を
  実行します。そのためjournalを変えても、cache障害が続く限りcanaryは
  合格しません。
- 競合（初期nullでも対象SHAでもない値、メタデータ変更、原文変更）は
  その場で全処理を停止します。
- rollbackは現在値がmanifestの対象SHAと完全一致するIDだけをnullへ戻します。
  別の値を上書きして消すことはありません。
- journalは追記専用JSONLです。原文本文、API応答本文、tokenは書きません。
- rolloutは1回10〜25件（ordinal 441で終わる最終範囲のみ10件未満可）に
  制限し、各呼出しの対象範囲を再GET監査します。全441件の確定は独立GET監査で行います。

## 入力と生成物

### payload

既定では `/tmp` の次の27 JSONを厳格に読みます。

- `budget_payloads_{a,b,c}.json`
- `budget_33_payloads_{a,b,c}.json`
- `budget_all_q2_{a,b,c}.json` 〜 `budget_all_q8_{a,b,c}.json`

27 JSONの440件に、Vault内のQ2/001を加えた441件が、対象Vaultにある
3桁番号txt全441件と完全一致しなければmanifestを作りません。
Q2/001は既知のID `a23ba1aa-82da-403e-94ad-9df633d6545d` と正式タイトル
「基金が減っても財政は大丈夫なのでしょうか」も完全一致させます。

### Admin metadata snapshot

`snapshot` は既存Admin exportを必須のoffset/limitでページングし、対象441 IDを
専用GET endpointで再確認します。4.5MB級のexportレスポンスを一つの永続
ファイルへ保存せず、次のメタデータだけをsnapshotへ書きます。

- ID、記事名、会期、公開種別、公開状態、日付、分類
- `published_at`、`updated_at`
- 現在の `knowledge_source` SHA-256（backfill前は全件null）

`knowledge_source` 本文はsnapshotへ含めません。

```bash
export ADMIN_API_TOKEN='...'

node scripts/budget-knowledge-source-backfill/cli.mjs snapshot \
  --output /secure/path/budget-admin-snapshot.json
```

### manifest

manifestには各IDと原文の厳格な1対1対応、および次を記録します。

- session、title、ID、source path、issue、topic、質問者
- raw/trimmedそれぞれのSHA-256、UTF-16 code unit数、UTF-8 byte数
- `published_at` とbackfill前の `updated_at`

trim後の原文が1〜200,000 UTF-16 code unitの範囲外なら、manifest作成・
読込のどちらでも停止します。

原文本文はmanifestへ含めません。作成時に表示されるmanifest SHA-256を
applyの承認値として別途控えます。

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs manifest \
  --admin-snapshot /secure/path/budget-admin-snapshot.json \
  --output /secure/path/budget-knowledge-source-manifest.json
```

既存ファイルを上書きするときだけ `--overwrite` を明示します。

## 実行手順

以下の例で `MANIFEST_SHA256` は `manifest_written` eventに表示された64桁値、
`JOURNAL` は同じcanary/rollout/再開で変えない絶対パスです。

### 1. 全441件dry-run

PATCHは送信しません。全原文を再読し、全IDをGETしてguardを確認します。

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs backfill \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-backfill.jsonl
```

### 2. canary 1件

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs backfill \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-backfill.jsonl \
  --apply --phase canary \
  --manifest-sha256 "$MANIFEST_SHA256"
```

既定canaryはmanifest先頭（Q2/001）です。別IDを選ぶ場合は、dry-run前から
一貫して `--canary-id <uuid>` を指定します。

canary合格条件は、専用GETで次が全て成立することです。

- 記事ID、名前、会期、公開種別、公開状態、`published_at` が不変
- `knowledge_source` が原文txtの `.trim()` と完全一致
- SHA-256、UTF-16長、UTF-8 byte数がmanifestと一致
- journalへ `canary_verified` が1件記録され、本文やtokenがない

本文・公開ページ・AIチャットへの影響は、rollout前に別の読み取り専用監査でも
確認してください。

### 3. rollout

同一manifest SHA、同一journal、同一canary IDの成功記録が必要です。

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs backfill \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-backfill.jsonl \
  --apply --phase rollout \
  --from-ordinal 1 --to-ordinal 25 \
  --manifest-sha256 "$MANIFEST_SHA256"
```

`--from-ordinal` と `--to-ordinal` はinclusiveで、apply rolloutでは両方必須です。
次の18範囲をそれぞれ別呼出しで実行し、各範囲の `run_completed` を
確認してから次へ進みます。

```text
1-25, 26-50, 51-75, 76-100, 101-125, 126-150,
151-175, 176-200, 201-225, 226-250, 251-275, 276-300,
301-325, 326-350, 351-375, 376-400, 401-425, 426-441
```

範囲長は10〜25件で、441で終わる最終範囲だけ10件未満も許可します。
`--batch-size` は、選択済み範囲内のprogress・journalを指定件数を
上限に区切る値です。rolloutの対象範囲や一呼出しのPATCH件数は変えず、
並列化もしません。競合時に即停止できるよう、ID単位で順に実行します。

### 4. 独立GET監査

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs audit \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --expect target
```

## rollback

rollbackも既定はGETだけです。まずdry-runし、その後にrollback canary、
rollback rolloutを同じjournalで実行します。

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs rollback \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-rollback.jsonl

node scripts/budget-knowledge-source-backfill/cli.mjs rollback \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-rollback.jsonl \
  --apply --phase canary \
  --manifest-sha256 "$MANIFEST_SHA256"

node scripts/budget-knowledge-source-backfill/cli.mjs rollback \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --journal /secure/path/budget-knowledge-source-rollback.jsonl \
  --apply --phase rollout \
  --from-ordinal 1 --to-ordinal 25 \
  --manifest-sha256 "$MANIFEST_SHA256"
```

rollback rolloutも同じordinal範囲制約で別呼出しに分けます。全441件が
nullであることは、次の独立監査でID単位に再GETして確定します。

```bash
node scripts/budget-knowledge-source-backfill/cli.mjs audit \
  --manifest /secure/path/budget-knowledge-source-manifest.json \
  --expect null
```

## 中断と再開

同じmanifestとjournalを指定して同じcommandを再実行します。適用済みIDは
GETした本文・SHA・長さが対象原文と完全一致する場合だけ、本文は
変えずに同値PATCHでcacheを再検証し、GET照合後に `already_done` とします。
PATCH直後に通信が切れて成否が不明でも、次回GETの状態から本文を判断し、
未適用なら更新PATCH、適用済みなら同値PATCHでcache再検証を行います。

cache再検証警告で停止した場合は、先にcache側の障害を調査・復旧します。
警告を記録したjournalは追記専用の証跡として保存し、復旧後は新しいjournalで
canaryから再開します。新journalでも同値PATCHがcacheを再検証し、警告が
再発した場合は `canary_verified` を記録せず停止します。

`.journal.jsonl.lock` が残る場合は、同じ処理が本当に動いていないことをOS側で
確認してから、運用者が明示的に対処してください。CLIは古いlockを自動削除
しません。

## 回帰テスト

runnerの通信・journal・再開・rollback・ordinal範囲の回帰テストは次で実行します。
rootの `pnpm test` と `pnpm run test:coverage` でも先頭に実行されます。

```bash
pnpm run test:budget-knowledge-source-backfill
```
