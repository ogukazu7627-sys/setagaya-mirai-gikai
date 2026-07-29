# 触れる予算 公開データセット検証レポート

- 最終判定: **PASS**
- 検証コマンド: `pnpm budget:web:validate -- --input-dir <path>`
- 入力方針: 公開用7ファイルはリポジトリ外、またはgitignore対象で管理
- Supabase書き込み: なし
- Next.js `public/`・Webバンドルへの配置: なし

## Manifest

- ファイル: `public_dataset_manifest.json`
- schemaVersion: `public-budget-v1`
- fiscalYear: `2026`
- datasetKind: `public_budget`
- budgetType: `initial_budget`
- currencyUnit: `thousand_yen`

## ファイル検証

| logical file | resolved file | count | columns | SHA-256 | result |
| --- | --- | ---: | ---: | --- | --- |
| `public_budget_program_identities.csv` | `public_budget_program_identities.csv` | 1,156 | 21 | `baee6d07fa0b4e55742e2e706239b272b2b545d3461152281da2ab7e507e7d58` | PASS |
| `public_budget_programs.csv` | `public_budget_programs.csv` | 1,170 | 21 | `7864a1856fd708129b912b61ad0cb6cc10dfc3a7c28b3ca7ad54ae907c217f24` | PASS |
| `public_budget_items.json` | `public_budget_items.json` | 190 | - | `01790675b33a28a9b1bb692052012136e5f99de373811600d4d9446ea23a7625` | PASS |
| `public_budget_revenue_details.csv` | `public_budget_revenue_details.csv` | 2,192 | 26 | `80a44ea866e616c822a61818e7f4cdaabea18bed5cebf51d4e4a259c1417be0e` | PASS |
| `public_budget_revenue_items.json` | `public_budget_revenue_items.json` | 175 | - | `b89d0d0181931318ae6fd9f257bd2242e28c791d4a3a321cd7cdb1d241d29f81` | PASS |
| `public_budget_revenue_allocations.json` | `public_budget_revenue_allocations.json` | 1,948 | - | `cb1a35734936f89ce3be59de27f9f8b7b4be6b236298ff68a38b501f4c92fb1c` | PASS |

## 件数

| dataset | count |
| --- | ---: |
| program identities | 1,156 |
| programs | 1,170 |
| budget items | 190 |
| revenue details | 2,192 |
| revenue items | 175 |
| revenue allocations | 1,948 |

## 金額

単位は千円。

| source | amount |
| --- | ---: |
| program identities | 621,033,664 |
| programs | 621,033,664 |
| budget items | 621,033,664 |
| revenue details | 621,033,664 |
| revenue items | 621,033,664 |

### 会計別

| account_code | expenditure | revenue |
| --- | ---: | ---: |
| `general` | 431,353,010 | 431,353,010 |
| `latter_stage_elderly_healthcare` | 29,414,796 | 29,414,796 |
| `long_term_care_insurance` | 76,058,953 | 76,058,953 |
| `national_health_insurance` | 84,206,905 | 84,206,905 |
| `school_lunch_fee` | 0 | 0 |

## 参照・allocation

| check | count |
| --- | ---: |
| programs → identity 参照欠落 | 0 |
| budget items内 program_id 参照欠落 | 0 |
| allocation → revenue detail 参照欠落 | 0 |
| allocation → program identity 参照欠落 | 0 |
| exact_group | 1,909 |
| public_identity | 39 |
| allocationAmountThousandYen 非null | 0 |
| 不正なamountAttributionStatus | 0 |

## 検証エラー

検証エラーはありません。
