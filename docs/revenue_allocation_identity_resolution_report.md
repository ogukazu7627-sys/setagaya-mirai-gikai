# 歳入充当事業・予算事業identity解決レポート

**最終判定: PASS**

## 入出力

- 予算事業group: `processed/budget_program_groups.csv`
- Phase 29充当関係: `in-memory target matches from processed/staging/revenue_allocation_source_matches.csv`
- Phase 29 target override: `config/revenue_allocation_target_overrides.csv`
- 歳出予算事業: `processed/budget_programs.csv`
- 歳出節: `processed/budget_sections.csv`
- 歳出目マスタ: `processed/budget_items.csv`
- 予算事業identity: `processed/budget_program_identities.csv`
- identity member: `processed/budget_program_identity_members.csv`
- identity解決済み充当関係: `processed/budget_revenue_allocations.csv`
- 内部group曖昧性: `processed/staging/revenue_allocation_group_ambiguities.csv`
- 真の未解決override: `config/revenue_allocation_target_overrides.csv`

## identity

| 指標 | 件数・金額 |
|---|---:|
| budget_program_group | 1,166 |
| budget_program_identity | 1,156 |
| identity member | 1,166 |
| 複数group identity | 7 |
| identity金額合計（千円） | 621,033,664 |

同一性キーは、年度・会計・`budget_item_key`・正規化事業名・正規化部署名・冊子ページ一覧をすべて含みます。異なる会計、目、冊子ページをまたぐ統合は行いません。

名称正規化はUnicode NFKC、空白・改行、中黒、ハイフン、全角半角括弧の表記差だけです。意味、金額、類似度による統合は行いません。

## allocation解決

| 指標 | 件数 |
|---|---:|
| allocation行 | 1,948 |
| identityレベルmatched | 1,948 |
| exact_group | 1,909 |
| public_identity | 39 |
| ambiguous | 0 |
| unmatched | 0 |
| group ambiguity保存行 | 39 |
| target override行 | 0 |

- `exact_group`は内部 `budget_program_group_id` まで一意に識別できる関係です。
- `public_identity`は公式PDF上の事業は識別できる一方、内部groupを区別できない関係です。内部group IDは空欄のままです。
- `allocation_amount_thousand_yen`は全行空欄、`amount_attribution_status`は全行`not_available`です。
- 本データは関係テーブルであり、歳入額の配分や金銭フローを示しません。

## 複数group identity

| identity | account | budget_item_key | 表示事業名 | 部署 | ページ | group数 |
|---|---|---|---|---|---|---:|
| bpi_020d87bdb6f88645e4edc52434ec6ef3f834637ed366ef07f96a394c3dedd7d4 | general | 2026_general_expenditure_03_02_01 | ベビーシッター利用支援事業 | 子若＊保育認定・調整課 | 375 | 2 |
| bpi_9e17ec8a82ad9617376b596db8314c0b6c9e1f7f25ba095dd7e0658be37011d5 | general | 2026_general_expenditure_09_01_02 | 会計年度任用職員の人件費（政策経営部） | 政策＊政策企画課 | 465 | 2 |
| bpi_980ce9b70e37b092adb0d85b25c10ed7a4c4a19e87b3a53d40a768a182ae7832 | general | 2026_general_expenditure_09_01_02 | 会計年度任用職員の人件費（生活文化政策部） | 生政＊市民活動推進課 | 465 | 2 |
| bpi_b20577636fe2f4187fd662b1f0fc27c1a15b49e5c5e258c012206f3f329eb489 | general | 2026_general_expenditure_09_01_03 | 会計年度任用職員の人件費（子ども・若者部） | 子若＊子ども・若者支援課 | 467 | 2 |
| bpi_181d68cd53e1bae8c0ff0b19f41abc04ca2fba5d55dc0649f06039d0ddf44c32 | general | 2026_general_expenditure_09_01_03 | 会計年度任用職員の人件費（障害福祉部） | 障福＊障害施策課 | 467 | 2 |
| bpi_11c09a256ac1f0b08b604ed1e947ffc80d0cb7edff4703759634a064845e0bd8 | general | 2026_general_expenditure_09_01_05 | 会計年度任用職員の人件費（世田谷保健所） | 世保＊健康企画課 | 469 | 2 |
| bpi_b55e51de6d41c9f9e2302349c0f7a11790df1cb4835ebe1c8990b0dd44d25850 | general | 2026_general_expenditure_09_01_08 | 会計年度任用職員の人件費（教育委員会事務局） | 教生＊教育総務課 | 471 | 5 |

## 検証

- 全groupが1 identityだけに所属: PASS
- 会計・目・ページ境界: PASS
- identity金額合計: PASS
- 全allocationのidentity参照: PASS
- exact group参照: PASS
- public identity制約: PASS
- 入力由来の不変列: PASS
- allocation金額空欄: PASS
- amount attribution status: PASS

## SHA-256

| ファイル | SHA-256 |
|---|---|
| budget_program_groups.csv | `09a666931d3deb6eb33be727eac635b32381cd85826c4a232a4c3ce4801cf59f` |
| budget_programs.csv | `6ae0a0fda94e2498be8749688cdab3427f3d1d54520b3e952152265672b81a27` |
| budget_sections.csv | `5616dc3e29949fd8cf83128ea017b252f78587f8486d4091014d60ee7a1e2ad0` |
| budget_items.csv | `a7edcf294bfd4256401ae396c63758f2fe28a0ffbd6fe26f3788fd35526b6822` |
| budget_program_identities.csv | `ba33c037a9c77ccac6673cac84499542571aea3bc9582088d0af2d01c171ded3` |
| budget_program_identity_members.csv | `86696d86c17d90d7faaeda934b9b03b3264d8376623305d2be599d0a05c6c9af` |
| budget_revenue_allocations.csv | `002e2d6dd857e20a88806145cc8c7e61fa35642bec43ac4c81982d4d1f7ab022` |
| revenue_allocation_group_ambiguities.csv | `0d003b7722129e3ebb7f3b68145a573f1efb36acccdf3c779ee9d3851073133a` |
| revenue_allocation_target_overrides.csv | `7ec41b1fbd0be9d4a1d66d3c61fe6fd524905ba77dc1cf93beb1bd8c5e9bf3d9` |

## 結論

全1,948関係を公式資料上のbudget_program_identityへ接続しました。内部groupを識別できない39関係は、group IDを空欄のまま将来精緻化用ファイルへ保存しています。
