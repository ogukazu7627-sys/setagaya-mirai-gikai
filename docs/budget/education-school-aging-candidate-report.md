# 教育「学校施設の老朽化への対応」候補レポート

## 結論

令和8年度当初予算の公開用7ファイルだけを根拠として、予算事業identity
16件を人間レビュー用候補として抽出した。

- high: 10件
- medium: 3件
- low: 3件
- `review_decision`: approve 13件 / reject 3件
- Supabaseへの登録・公開: 未実施

候補は公式な政策分類ではない。公開7ファイルには「老朽化への対応」という
目的が直接記載されていないため、2026-07-30に人間レビューを行い、highと
mediumの13件を承認し、lowの3件を対象外と判断した。この判断結果だけを
CSVへ記録し、Supabaseへの登録や一般公開は行っていない。

## 入力と整合性

入力は次のディレクトリにある公開用7ファイルを使用した。外部Webサイト、
計画資料、添付されていない行政資料は使用していない。

`public_dataset_manifest.json`のSHA-256:
`dfe9e96084c67cad4bdbb80a0c44754f57cbffd7c686ae4bd2616aa172e9b1e7`

| 論理ファイル | 件数 | manifest記載のSHA-256 |
| --- | ---: | --- |
| `public_budget_program_identities.csv` | 1,156 | `baee6d07fa0b4e55742e2e706239b272b2b545d3461152281da2ab7e507e7d58` |
| `public_budget_programs.csv` | 1,170 | `7864a1856fd708129b912b61ad0cb6cc10dfc3a7c28b3ca7ad54ae907c217f24` |
| `public_budget_items.json` | 190 | `01790675b33a28a9b1bb692052012136e5f99de373811600d4d9446ea23a7625` |
| `public_budget_revenue_details.csv` | 2,192 | `80a44ea866e616c822a61818e7f4cdaabea18bed5cebf51d4e4a259c1417be0e` |
| `public_budget_revenue_items.json` | 175 | `b89d0d0181931318ae6fd9f257bd2242e28c791d4a3a321cd7cdb1d241d29f81` |
| `public_budget_revenue_allocations.json` | 1,948 | `cb1a35734936f89ce3be59de27f9f8b7b4be6b236298ff68a38b501f4c92fb1c` |

既存の`budget:web:validate`で、manifestのスキーマ、件数、金額、
主キー・外部キー、allocationの安全条件、6ファイルのSHA-256を検証し、
`PASS`を確認した。歳入・歳出の全会計合計はいずれも
621,033,664千円だった。

## 抽出単位

`budget_program_identity_id`を候補の単位とした。内訳事業単位の
`program_id`を直接課題へ結び付けていない。

対象範囲は次に限定した。

- 会計: 一般会計
- 款: 教育費
- 項: 小学校費または中学校費
- 課題候補: 学校施設の老朽化への対応

この対象範囲は今回の縦切り検証のための編集上の境界であり、公式の分類では
ない。

## 選定基準

### high

予算事業名に「施設改修」「施設整備」「改築」が明記され、目が
「学校施設充実費」または「学校施設建設費」であるものを選んだ。
改修・改築の工事は`responds_to`、実施事務は`enables`、施設整備事業は
`supports`を提案した。

### medium

小中学校の「維持管理」と「義務教育施設整備基金積立金」を選んだ。
施設との構造的な関係は強いが、老朽化対応に当たる範囲や具体的な充当先を
公開7ファイルから分離できないため、highにはしていない。

### low

同じ目に維持管理・改築事業がある「維持運営」と「小学校用地買収」を
隣接候補として残した。ただし、運営全般や用地取得の目的が老朽化対応かは
確認できないため、`C_editorial`とした。

## 候補一覧

### High

| 予算事業identity | 金額（千円） | 提案関係 |
| --- | ---: | --- |
| 小学校施設改修工事 | 4,140,518 | responds_to |
| 小学校施設改修事務 | 57,001 | enables |
| 小学校施設整備事業 | 230,835 | supports |
| 小学校改築工事 | 1,517,614 | responds_to |
| 小学校改築事務 | 292,171 | enables |
| 中学校施設改修工事 | 2,173,450 | responds_to |
| 中学校施設改修事務 | 29,593 | enables |
| 中学校施設整備事業 | 136,213 | supports |
| 中学校改築工事 | 4,210,841 | responds_to |
| 中学校改築事務 | 295,657 | enables |

参考金額合計: 13,083,893千円

レビュー結果: 10件すべてapprove

### Medium

| 予算事業identity | 金額（千円） | 提案関係 |
| --- | ---: | --- |
| 小学校維持管理 | 3,207,961 | maintains |
| 中学校維持管理 | 1,239,292 | maintains |
| 義務教育施設整備基金積立金 | 341,460 | enables |

参考金額合計: 4,788,713千円

レビュー結果: 3件すべてapprove

### Low

| 予算事業identity | 金額（千円） | 提案関係 |
| --- | ---: | --- |
| 小学校維持運営 | 667,693 | maintains |
| 小学校用地買収 | 93,635 | enables |
| 中学校維持運営 | 279,745 | maintains |

参考金額合計: 1,041,073千円

レビュー結果: 3件すべてreject

approveされた13件の参考金額合計は17,872,606千円、rejectされた3件は
1,041,073千円、全候補は18,913,679千円である。approve分を含め、これらは
「学校施設の老朽化対策費」という公式集計ではなく、編集上関連付けた事業の
予算額を機械的に合計した参考値にすぎない。画面表示やAI回答で公式の
課題別予算額として使用してはいけない。

## Evidence fields

CSVの`evidence_fields`はJSON文字列で、各候補について次を保持する。

- `budget_item_key`
- identityの事業名、款・項・目、表示部署、予算額
- identityに属する元programの大事業名・予算事業名・詳細事業名
- 元CSVの`source_file`と`source_row_number`
- 同じ`budget_item_key`に属する他の事業名
- PDF由来の充当関係がある場合、その`revenue_detail_id`と歳入階層
- allocationの`amount_attribution_status`

歳入との関係は関係の存在だけを根拠にし、歳入額を候補事業へ割り当てて
いない。全ての関連歳入について`amount_attribution_status`は
`not_available`である。

## 誤用防止

- `A_official_direct`は1件も使用していない。
- high / mediumは`B_strong_structural`、lowは`C_editorial`である。
- `budget_sections`は目全体の節別内訳であり、個別programへ割り当てられない。
  このため候補判定の根拠には使用していない。
- 関連歳入の金額は、個別事業への配分額ではない。
- 当初予算から実際の支出額、決算額、契約額、支払先を推論していない。
- highは自動承認を意味しない。

## 今回除外した主な隣接事業

今回の「学校施設」は小学校・中学校の校舎等を対象とする縦切りに限定し、
次の事業群は候補へ含めていない。

- 区立幼稚園の施設改修・維持管理
- 教育総合センター、教育会館、図書館、社会教育施設の改修・維持管理
- 河口湖林間学園など校外施設の改修・維持管理
- 学校給食調理場の施設整備・維持運営
- 小中学校施設開放
- 学校管理費内の特別支援学級運営、管理運営、通学路安全対策

これらを将来別課題へ接続するか、同じ課題の範囲を広げるかは、人間が課題の
定義を確定した後に判断する。

## 検証結果

| 項目 | 結果 |
| --- | --- |
| CSV列数 | 16列 |
| 候補行数 | 16行 |
| `budget_program_identity_id`一意性 | PASS |
| 公開identityへの参照 | 16 / 16件存在 |
| 元programへの参照 | 全件存在 |
| `candidate_topic` | 全件「学校施設の老朽化への対応」 |
| 会計・款 | 全件「一般会計」「教育費」 |
| confidence | high 10 / medium 3 / low 3 |
| evidence_level | B 13 / C 3 / A 0 |
| `evidence_fields` JSON | 全件parse可能 |
| `review_decision` | approve 13 / reject 3 / revise 0 / 空欄 0 |
| `review_note` | 全16件にレビュー日と判断を記録 |
| Supabase書き込み | 0件 |

## 人間レビュー結果と次の扱い

2026-07-30のチャットレビューで、次の判断を確定した。

- 1〜13行目（high 10件、medium 3件）: approve
- 14〜16行目（low 3件）: reject
- revise、未判断: 0件

このレビューは候補関係の編集判断であり、公式分類への変更ではない。
Supabaseの`budget_topics`や`budget_topic_programs`への登録、および
一般ユーザーへの公開は、別Phaseで明示的に実施するまで行わない。
